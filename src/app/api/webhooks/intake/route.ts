import { NextResponse } from "next/server";
import { INITIAL_COMPLAINTS, INITIAL_WARDS } from "@/lib/seedData";
import { checkDuplicateComplaint, resolveWardFromCoordinates } from "@/lib/spatial";
import { processIntakeMedia } from "@/lib/aiProcessing";
import { LinkedTicket, Complaint } from "@/types/database";

/**
 * Automation Intake Webhook
 * Pipeline:
 * 1. Intake (Webhook): Receives text, audio, or photo
 * 2. Media Filter & AI Processing:
 *    - Media Check: checks if audio or image is attached
 *    - Voice Transcription: converts audio recording into text
 *    - Photo Analysis: Vision AI identifies category and creates visual fingerprint
 *    - Merge: combines media metadata into clean package
 * 3. Location & Spatial Lookup (Ward Lookup):
 *    - Uses GPS coordinates to run GIS query and pinpoints ward ID
 * 4. Deduplication Check (Dedup Check -> Media Check1):
 *    - 20-meter radius check
 *    - True (Duplicate): Upvote Master Ticket + Insert Linked Ticket (child report)
 *    - False (New): Creates new master ticket + generates dispatch order
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const {
      text,
      photo_url,
      audio_url,
      category,
      latitude,
      longitude,
      address_text,
      citizen_id,
    } = payload;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Latitude and Longitude are required for spatial ward lookup." },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Step 2: Media Filter & AI Processing (Transcribe Voice / Analyze Photo -> Merge)
    const mediaOutput = await processIntakeMedia({
      text,
      photoUrl: photo_url,
      audioUrl: audio_url,
      category,
      latitude: lat,
      longitude: lng,
      addressText: address_text,
      citizenId: citizen_id,
    });

    // Step 3: Location & Spatial Lookup (Ward Lookup)
    const wardId = resolveWardFromCoordinates(lat, lng, INITIAL_WARDS);

    // Step 4: Deduplication Check (Dedup Check -> Media Check1)
    const dedupResult = checkDuplicateComplaint(lat, lng, INITIAL_COMPLAINTS, 20.0);

    if (dedupResult.isDuplicate && dedupResult.duplicateIncident) {
      // Branch: TRUE (Duplicate Found)
      const masterTicket = dedupResult.duplicateIncident;

      // 1. Upvote Master Ticket
      masterTicket.upvotes_count += 1;

      // 2. Insert Linked Ticket (Child report attached to master)
      const linkedChildTicket: LinkedTicket = {
        id: "child-" + Date.now().toString().slice(-6),
        parent_ticket_id: masterTicket.id,
        citizen_id: citizen_id || "citizen-webhook-user",
        text_content: mediaOutput.textContent,
        audio_url: mediaOutput.audioUrl,
        ai_transcription: mediaOutput.aiTranscription,
        image_url: mediaOutput.photoUrl,
        visual_fingerprint: mediaOutput.visualFingerprint,
        latitude: lat,
        longitude: lng,
        distance_from_master_meters: dedupResult.distanceMeters || 0,
        created_at: new Date().toISOString(),
      };

      if (!masterTicket.linked_tickets) {
        masterTicket.linked_tickets = [];
      }
      masterTicket.linked_tickets.push(linkedChildTicket);

      // Merge1 output
      return NextResponse.json({
        status: "SUCCESS",
        pipeline_route: "DUPLICATE_MERGED",
        action: "UPVOTE_AND_LINK_CHILD_TICKET",
        data: {
          master_ticket_id: masterTicket.id,
          master_title: masterTicket.title,
          master_upvotes: masterTicket.upvotes_count,
          distance_meters: dedupResult.distanceMeters,
          ward_id: masterTicket.ward_id,
          linked_child_ticket: linkedChildTicket,
          ai_processing: {
            transcription: mediaOutput.aiTranscription,
            detected_category: mediaOutput.aiDetectedCategory,
            confidence_score: mediaOutput.aiConfidenceScore,
            visual_fingerprint: mediaOutput.visualFingerprint,
          },
          message: `Spatial duplicate matched within ${dedupResult.distanceMeters}m. Master ticket priority upvoted and new submission linked as child ticket.`,
        },
      });
    }

    // Branch: FALSE (New Ticket)
    const slaHoursMap: Record<string, number> = {
      GARBAGE: 24,
      WATER_LEAK: 24,
      POTHOLE: 48,
      STREETLIGHT: 72,
      OTHER: 48,
    };
    const targetCategory = category || mediaOutput.aiDetectedCategory || "OTHER";
    const slaHours = slaHoursMap[targetCategory] || 48;
    const slaDeadline = new Date(Date.now() + slaHours * 3600000).toISOString();

    const newMasterTicket: Complaint = {
      id: "ticket-" + Date.now().toString().slice(-6),
      citizen_id: citizen_id || "citizen-webhook-user",
      title: text ? text.slice(0, 80) : `${targetCategory.replace("_", " ")} reported via intake`,
      description: mediaOutput.textContent,
      category: targetCategory,
      status: "PENDING",
      latitude: lat,
      longitude: lng,
      address_text: address_text || "Geocoded Municipal Sector",
      ward_id: wardId,
      image_url: mediaOutput.photoUrl,
      audio_url: mediaOutput.audioUrl,
      ai_transcription: mediaOutput.aiTranscription,
      ai_detected_category: mediaOutput.aiDetectedCategory,
      ai_confidence_score: mediaOutput.aiConfidenceScore,
      visual_fingerprint: mediaOutput.visualFingerprint,
      upvotes_count: 1,
      is_master: true,
      linked_tickets: [],
      sla_deadline: slaDeadline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    INITIAL_COMPLAINTS.unshift(newMasterTicket);

    return NextResponse.json({
      status: "SUCCESS",
      pipeline_route: "NEW_TICKET_CREATED",
      action: "INSERT_MASTER_TICKET_AND_DISPATCH",
      data: {
        ticket: newMasterTicket,
        ward_id: wardId,
        sla_hours: slaHours,
        ai_processing: {
          transcription: mediaOutput.aiTranscription,
          detected_category: mediaOutput.aiDetectedCategory,
          confidence_score: mediaOutput.aiConfidenceScore,
          visual_fingerprint: mediaOutput.visualFingerprint,
        },
        message: `New master ticket created and auto-routed to ${wardId} queue.`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Webhook Pipeline Processing Error", details: error.message },
      { status: 500 }
    );
  }
}
