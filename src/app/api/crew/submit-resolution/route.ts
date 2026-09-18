import { NextResponse } from "next/server";
import { INITIAL_COMPLAINTS } from "@/lib/seedData";
import { validateResolutionProximity } from "@/lib/spatial";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { complaint_id, resolution_lat, resolution_lng, proof_image } = body;

    const ticket = INITIAL_COMPLAINTS.find((c) => c.id === complaint_id);
    if (!ticket) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Enforce 30-meter resolution perimeter guard (TRD Section 2.4)
    const validation = validateResolutionProximity(
      ticket.latitude,
      ticket.longitude,
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
