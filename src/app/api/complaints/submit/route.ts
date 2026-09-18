import { NextResponse } from "next/server";
import { INITIAL_COMPLAINTS, INITIAL_WARDS } from "@/lib/seedData";
import { checkDuplicateComplaint, resolveWardFromCoordinates } from "@/lib/spatial";
import { 
  isSupabaseConfigured, 
  insertComplaintToSupabase, 
  updateComplaintInSupabase,
  insertAuditLogToSupabase 
} from "@/lib/supabase";
import { Complaint, ComplaintAuditLog } from "@/types/database";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, latitude, longitude, address_text, image_url, citizen_id } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and Longitude are mandatory for geodetic routing." },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // PostGIS 20-Meter Proximity Clustering Check
    const duplicateCheck = checkDuplicateComplaint(
      lat,
      lng,
      INITIAL_COMPLAINTS,
      20.0
    );

    if (duplicateCheck.isDuplicate && duplicateCheck.duplicateIncident) {
      const existing = duplicateCheck.duplicateIncident;
      existing.upvotes_count += 1;
      existing.updated_at = new Date().toISOString();

      if (isSupabaseConfigured()) {
        await updateComplaintInSupabase(existing.id, {
          upvotes_count: existing.upvotes_count,
          updated_at: existing.updated_at,
        });
      }

      return NextResponse.json({
        status: "SUCCESS",
        action: "UPVOTED",
        data: {
          ticket_id: existing.id,
          message: `Incident already registered within ${duplicateCheck.distanceMeters} meters. Priority upvoted.`,
          upvotes_count: existing.upvotes_count,
        },
      });
    }

    // Auto Ward Polygon Routing (ST_Contains)
    const wardId = resolveWardFromCoordinates(lat, lng, INITIAL_WARDS);

    const ticketId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "c" + Date.now().toString(16) + "-" + Math.random().toString(16).substring(2, 10);

    const slaHoursMap: Record<string, number> = {
      GARBAGE: 24,
      WATER_LEAK: 24,
      POTHOLE: 48,
      STREETLIGHT: 72,
      OTHER: 48,
    };
    const slaHours = slaHoursMap[category] || 48;
    const slaDeadline = new Date(Date.now() + slaHours * 3600000).toISOString();

    const newComplaint: Complaint = {
      id: ticketId,
      citizen_id: citizen_id || "citizen-direct-user",
      title: title || `${category || "Municipal Issue"} reported`,
      description: description || "",
      category: category || "OTHER",
      status: "PENDING",
      latitude: lat,
      longitude: lng,
      address_text: address_text || "Geocoded Municipal Sector",
      ward_id: wardId,
      image_url: image_url || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80",
      upvotes_count: 1,
      is_master: true,
      linked_tickets: [],
      sla_deadline: slaDeadline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      await insertComplaintToSupabase(newComplaint);
      await insertAuditLogToSupabase({
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "a-" + Date.now(),
        complaint_id: ticketId,
        actor_name: "Citizen Portal",
        action: "CREATED",
        to_status: "PENDING",
        remarks: `Auto-routed to ${wardId} queue via intake API.`,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      status: "SUCCESS",
      action: "CREATED",
      data: {
        ticket_id: ticketId,
        message: "New complaint instantiated and auto-routed to ward maintenance queue.",
        ward_id: wardId,
        ticket: newComplaint,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error in Geo-Ingestion Engine", details: error.message },
      { status: 500 }
    );
  }
}
