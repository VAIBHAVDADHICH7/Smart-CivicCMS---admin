import { NextResponse } from "next/server";
import { 
  isSupabaseConfigured, 
  updateComplaintInSupabase, 
  insertAuditLogToSupabase 
} from "@/lib/supabase";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { complaint_id, action, notes } = body;

    if (!complaint_id || !action) {
      return NextResponse.json(
        { error: "complaint_id and action ('APPROVE' | 'REJECT') are required." },
        { status: 400 }
      );
    }

    const now = new Date();
    const newStatus = action === "APPROVE" ? "RESOLVED" : "ASSIGNED";
    const reopenWindowClosesAt = action === "APPROVE"
      ? new Date(now.getTime() + 48 * 3600000).toISOString() // 48h Citizen Audit Window
      : undefined;

    if (isSupabaseConfigured()) {
      await updateComplaintInSupabase(complaint_id, {
        status: newStatus,
        supervisor_notes: notes || "Supervisor inspected photographic proof and GPS delta.",
        verified_at: action === "APPROVE" ? now.toISOString() : undefined,
        reopen_window_closes_at: reopenWindowClosesAt,
        updated_at: now.toISOString(),
      });

      await insertAuditLogToSupabase({
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "a-" + Date.now(),
        complaint_id,
        actor_name: "Ward Supervisor",
        action: action === "APPROVE" ? "RESOLVED" : "STATUS_CHANGE",
        from_status: "WORK_SUBMITTED",
        to_status: newStatus,
        remarks: notes || (action === "APPROVE" ? "Approved resolution proof." : "Rejected resolution proof."),
        created_at: now.toISOString(),
      });
    }

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        complaint_id,
        status: newStatus,
        notes: notes || "Supervisor inspected photographic proof and GPS delta.",
        reopen_window_closes_at: reopenWindowClosesAt,
        message: action === "APPROVE"
          ? "Complaint approved & marked RESOLVED. 48-hour citizen audit window initiated."
          : "Proof rejected. Re-routed to ASSIGNED queue for crew re-work.",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
