import { NextResponse } from "next/server";
import { INITIAL_COMPLAINTS, INITIAL_WARDS } from "@/lib/seedData";
import { checkDuplicateComplaint, resolveWardFromCoordinates } from "@/lib/spatial";
import { processIntakeMedia } from "@/lib/aiProcessing";
import { LinkedTicket, Complaint } from "@/types/database";
import { 
  isSupabaseConfigured, 
  getSupabaseClient, 
  insertComplaintToSupabase, 
  updateComplaintInSupabase,
  insertAuditLogToSupabase 
} from "@/lib/supabase";

/**
 * Automation Intake Webhook
 * Pipeline:
 * 1. Intake (Webhook): Receives text, audio, or photo
 * 2. Media Filter & AI Processing:
 *    - Voice Transcription: converts audio recording into text
 *    - Photo Analysis: Vision AI identifies category and creates visual fingerprint
 *    - Merge: combines media metadata into clean package
 * 3. Location & Spatial Lookup (Ward Lookup):
 *    - Uses GPS coordinates to run GIS query and pinpoints ward ID
 * 4. Deduplication Check:
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

    // Step 4: Deduplication Check (20m radius)
    const dedupResult = checkDuplicateComplaint(lat, lng, INITIAL_COMPLAINTS, 20.0);

    const generateId = () => 
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "c" + Date.now().toString(16) + "-" + Math.random().toString(16).substring(2, 10);

    if (dedupResult.isDuplicate && dedupResult.duplicateIncident) {
      // Branch: TRUE (Duplicate Found)
      const masterTicket = dedupResult.duplicateIncident;

      // 1. Upvote Master Ticket
      masterTicket.upvotes_count += 1;
      masterTicket.updated_at = new Date().toISOString();

      // 2. Insert Linked Ticket (Child report attached to master)
      const linkedChildTicket: LinkedTicket = {
        id: generateId(),
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

      if (isSupabaseConfigured()) {
        await updateComplaintInSupabase(masterTicket.id, {
          upvotes_count: masterTicket.upvotes_count,
          updated_at: masterTicket.updated_at,
        });

        const client = getSupabaseClient();
        if (client) {
          await client.from("linked_tickets").insert({
            id: linkedChildTicket.id,
            parent_ticket_id: masterTicket.id,
            citizen_id: linkedChildTicket.citizen_id,
            text_content: linkedChildTicket.text_content,
            audio_url: linkedChildTicket.audio_url,
            ai_transcription: linkedChildTicket.ai_transcription,
            image_url: linkedChildTicket.image_url,
            visual_fingerprint: linkedChildTicket.visual_fingerprint,
            location: `SRID=4326;POINT(${lng} ${lat})`,
            distance_from_master_meters: linkedChildTicket.distance_from_master_meters,
            created_at: linkedChildTicket.created_at,
          });
        }

        await insertAuditLogToSupabase({
          id: generateId(),
          complaint_id: masterTicket.id,
          actor_name: "Intake Webhook Engine",
          action: "LINKED_CHILD_TICKET",
          remarks: `Matched nearby report at ${dedupResult.distanceMeters}m. Master upvoted to ${masterTicket.upvotes_count}.`,
          created_at: new Date().toISOString(),
        });
      }

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
      id: generateId(),
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

    if (isSupabaseConfigured()) {
      await insertComplaintToSupabase(newMasterTicket);
      await insertAuditLogToSupabase({
        id: generateId(),
        complaint_id: newMasterTicket.id,
        actor_name: "Intake Webhook Engine",
        action: "CREATED",
        to_status: "PENDING",
        remarks: `Master ticket ingested and auto-routed to ${wardId} queue.`,
        created_at: new Date().toISOString(),
      });
    }

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
