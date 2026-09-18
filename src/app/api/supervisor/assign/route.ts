import { NextResponse } from "next/server";
import { 
  isSupabaseConfigured, 
  updateComplaintInSupabase, 
  insertAuditLogToSupabase 
} from "@/lib/supabase";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { complaint_id, assigned_crew_id, sla_hours, supervisor_id } = body;

    if (!complaint_id || !assigned_crew_id) {
      return NextResponse.json(
        { error: "complaint_id and assigned_crew_id are required." },
        { status: 400 }
      );
    }

    const slaDeadline = new Date(Date.now() + (sla_hours || 24) * 3600000).toISOString();
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await updateComplaintInSupabase(complaint_id, {
        status: "ASSIGNED",
        assigned_crew_id,
        supervisor_id,
        sla_deadline: slaDeadline,
        updated_at: now,
      });

      await insertAuditLogToSupabase({
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "a-" + Date.now(),
        complaint_id,
        actor_name: "Ward Supervisor",
        action: "ASSIGNED",
        from_status: "PENDING",
        to_status: "ASSIGNED",
        remarks: `Assigned to contractor ${assigned_crew_id}. SLA: ${sla_hours || 24}h`,
        created_at: now,
      });
    }

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
