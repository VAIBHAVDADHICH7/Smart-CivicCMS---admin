import { NextResponse } from "next/server";
import { INITIAL_COMPLAINTS } from "@/lib/seedData";
import { validateResolutionProximity } from "@/lib/spatial";
import { 
  isSupabaseConfigured, 
  getSupabaseClient,
  updateComplaintInSupabase, 
  insertAuditLogToSupabase 
} from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { complaint_id, resolution_lat, resolution_lng, proof_image } = body;

    let targetLat = 0;
    let targetLng = 0;

    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client
          .from("complaints")
          .select("latitude, longitude, location")
          .eq("id", complaint_id)
          .single();

        if (data) {
          if (data.location?.coordinates) {
            targetLng = data.location.coordinates[0];
            targetLat = data.location.coordinates[1];
          } else {
            targetLat = data.latitude;
            targetLng = data.longitude;
          }
        }
      }
    }

    if (!targetLat && !targetLng) {
      const ticket = INITIAL_COMPLAINTS.find((c) => c.id === complaint_id);
      if (ticket) {
        targetLat = ticket.latitude;
        targetLng = ticket.longitude;
      }
    }

    if (!targetLat || !targetLng) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Enforce 30-meter resolution perimeter guard (TRD Section 2.4)
    const validation = validateResolutionProximity(
      targetLat,
      targetLng,
      parseFloat(resolution_lat),
      parseFloat(resolution_lng),
      30.0
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "INVALID_RESOLUTION_PROXIMITY",
          message: validation.message,
          distance_meters: validation.distanceMeters,
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await updateComplaintInSupabase(complaint_id, {
        status: "WORK_SUBMITTED",
        resolution_image_url: proof_image,
        resolution_latitude: parseFloat(resolution_lat),
        resolution_longitude: parseFloat(resolution_lng),
        resolution_distance_meters: validation.distanceMeters,
        resolution_submitted_at: now,
        updated_at: now,
      });

      await insertAuditLogToSupabase({
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "a-" + Date.now(),
        complaint_id,
        actor_name: "Field Crew",
        action: "WORK_SUBMITTED",
        from_status: "ASSIGNED",
        to_status: "WORK_SUBMITTED",
        remarks: `Work proof submitted on site. GPS delta: ${validation.distanceMeters}m (tolerance: ≤30m).`,
        created_at: now,
      });
    }

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        complaint_id,
        new_status: "WORK_SUBMITTED",
        distance_meters: validation.distanceMeters,
        message: "Resolution proof accepted within 30-meter geofence perimeter.",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
