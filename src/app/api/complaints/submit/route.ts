import { NextResponse } from "next/server";
import { INITIAL_COMPLAINTS, INITIAL_WARDS } from "@/lib/seedData";
import { checkDuplicateComplaint, resolveWardFromCoordinates } from "@/lib/spatial";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, category, latitude, longitude, address_text, image_url } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and Longitude are mandatory for geodetic routing." },
        { status: 400 }
      );
    }

    // PostGIS 20-Meter Proximity Clustering Check
    const duplicateCheck = checkDuplicateComplaint(
      parseFloat(latitude),
      parseFloat(longitude),
      INITIAL_COMPLAINTS,
      20.0
    );

    if (duplicateCheck.isDuplicate && duplicateCheck.duplicateIncident) {
      const existing = duplicateCheck.duplicateIncident;
      existing.upvotes_count += 1;

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
    const wardId = resolveWardFromCoordinates(
      parseFloat(latitude),
      parseFloat(longitude),
      INITIAL_WARDS
    );

    const newTicketId = "ticket-" + Date.now().toString().slice(-6);

    return NextResponse.json({
      status: "SUCCESS",
      action: "CREATED",
      data: {
        ticket_id: newTicketId,
        message: "New complaint instantiated and auto-routed to ward maintenance queue.",
        ward_id: wardId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error in Geo-Ingestion Engine", details: error.message },
      { status: 500 }
    );
  }
}
