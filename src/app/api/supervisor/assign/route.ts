import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { complaint_id, assigned_crew_id, sla_hours } = body;

    if (!complaint_id || !assigned_crew_id) {
      return NextResponse.json(
        { error: "complaint_id and assigned_crew_id are required." },
        { status: 400 }
      );
    }

    const slaDeadline = new Date(Date.now() + (sla_hours || 24) * 3600000).toISOString();

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        complaint_id,
        assigned_crew_id,
        new_status: "ASSIGNED",
        sla_deadline: slaDeadline,
        message: "Work order assigned to field contractor.",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
