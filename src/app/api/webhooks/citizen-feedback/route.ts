import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaint_id, action, citizen_id, dispute_reason, feedback_rating } = body;

    if (!complaint_id || !action) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "complaint_id and action ('CONFIRM' | 'REOPEN') are required." },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase() || getSupabaseClient();
    const now = new Date().toISOString();

    if (action === "CONFIRM") {
      if (isSupabaseConfigured() && supabase) {
        await supabase
          .from("complaints")
          .update({
            status: "RESOLVED",
            reopen_window_closes_at: null,
            updated_at: now,
          })
          .eq("id", complaint_id);

        await supabase.from("complaint_audit_logs").insert({
          complaint_id,
          actor_name: "Citizen Portal",
          action: "STATUS_CHANGE",
          from_status: "RESOLVED",
          to_status: "RESOLVED",
          remarks: `Citizen confirmed quality satisfaction (Rating: ${feedback_rating || 5}/5). Complaint closed permanently.`,
        });
      }

      return NextResponse.json({
        status: "SUCCESS",
        complaint_id,
        action: "CITIZEN_CONFIRMED",
        message: "Resolution verified by citizen. Ticket permanently resolved.",
      });
    }

    if (action === "REOPEN") {
      const reason = dispute_reason || "Citizen indicated issue not resolved to satisfaction.";

      if (isSupabaseConfigured() && supabase) {
        await supabase
          .from("complaints")
          .update({
            status: "REOPENED",
            escalation_tier: 1,
            escalated_at: now,
            escalation_reason: `Citizen Quality Dispute: "${reason}"`,
            updated_at: now,
          })
          .eq("id", complaint_id);

        await supabase.from("complaint_audit_logs").insert({
          complaint_id,
          actor_name: "Citizen Portal",
          action: "DISPUTED_REOPEN",
          from_status: "RESOLVED",
          to_status: "REOPENED",
          remarks: `Citizen dispute received during 48-hour audit window: "${reason}". Reopened & escalated to Supervisor.`,
        });
      }

      return NextResponse.json({
        status: "SUCCESS",
        complaint_id,
        action: "CITIZEN_REOPENED",
        message: "Complaint reopened and escalated to Ward Supervisor queue for remedial action.",
      });
    }

    return NextResponse.json(
      { error: "INVALID_ACTION", message: "Action must be CONFIRM or REOPEN." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
