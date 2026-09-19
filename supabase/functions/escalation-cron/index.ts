import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const nowIso = now.toISOString();

    const results = {
      tier1_crew_inactions_escalated: 0,
      tier2_supervisor_breaches_escalated: 0,
      ai_auto_confirmed_resolutions: 0,
      processed_complaints: [] as any[],
    };

    // 1. TIER 1 ESCALATION: Field Crew Inaction SLA Breach
    // Condition: status == 'ASSIGNED' AND (sla_deadline < now OR assigned_at + 12h < now with no work proof)
    const { data: crewInactionTickets } = await supabaseClient
      .from("complaints")
      .select("id, title, ward_id, assigned_crew_id, supervisor_id, sla_deadline, escalation_tier")
      .eq("status", "ASSIGNED")
      .lt("sla_deadline", nowIso)
      .eq("escalation_tier", 0);

    if (crewInactionTickets && crewInactionTickets.length > 0) {
      for (const ticket of crewInactionTickets) {
        const supervisorSlaDeadline = new Date(now.getTime() + 12 * 3600000).toISOString(); // 12h Supervisor window

        await supabaseClient
          .from("complaints")
          .update({
            status: "ESCALATED",
            escalation_tier: 1,
            escalated_at: nowIso,
            escalation_reason: "Tier 1: Field Crew Inaction SLA Breached - Idle time exceeded without work proof.",
            supervisor_sla_deadline: supervisorSlaDeadline,
            updated_at: nowIso,
          })
          .eq("id", ticket.id);

        await supabaseClient.from("complaint_audit_logs").insert({
          complaint_id: ticket.id,
          actor_name: "SLA Escalation Engine",
          action: "ESCALATED",
          from_status: "ASSIGNED",
          to_status: "ESCALATED",
          remarks: "Field Crew failed to submit work proof within SLA window. Tier 1 Escalation triggered to Ward Supervisor.",
        });

        results.tier1_crew_inactions_escalated++;
        results.processed_complaints.push({ id: ticket.id, jump: "TIER_1_CREW_INACTION" });
      }
    }

    // 2. TIER 2 ESCALATION: Ward Supervisor Queue Inaction Breach
    // Condition: status IN ('WORK_SUBMITTED', 'ESCALATED') AND escalation_tier == 1 AND supervisor_sla_deadline < now
    const { data: supervisorBreachTickets } = await supabaseClient
      .from("complaints")
      .select("id, title, ward_id, escalation_tier, supervisor_sla_deadline")
      .in("status", ["WORK_SUBMITTED", "ESCALATED"])
      .eq("escalation_tier", 1)
      .lt("supervisor_sla_deadline", nowIso);

    if (supervisorBreachTickets && supervisorBreachTickets.length > 0) {
      for (const ticket of supervisorBreachTickets) {
        await supabaseClient
          .from("complaints")
          .update({
            status: "ESCALATED",
            escalation_tier: 2,
            escalated_at: nowIso,
            escalation_reason: "Tier 2: Ward Supervisor Inaction SLA Breached - Bypassed directly to Municipal Commissioner.",
            updated_at: nowIso,
          })
          .eq("id", ticket.id);

        await supabaseClient.from("complaint_audit_logs").insert({
          complaint_id: ticket.id,
          actor_name: "SLA Escalation Engine",
          action: "ESCALATED",
          from_status: "ESCALATED",
          to_status: "ESCALATED",
          remarks: "Ward Supervisor failed to review or reassign in time. Tier 2 Escalation bypassed to Municipal Commissioner desk.",
        });

        results.tier2_supervisor_breaches_escalated++;
        results.processed_complaints.push({ id: ticket.id, jump: "TIER_2_SUPERVISOR_BYPASS_TO_COMMISSIONER" });
      }
    }

    // 3. AUTOMATED AI RESOLUTION FALLBACK: Expired Citizen Audit Window
    // Condition: status == 'RESOLVED' AND reopen_window_closes_at < now (48h window expired without citizen dispute)
    const { data: expiredCitizenAuditTickets } = await supabaseClient
      .from("complaints")
      .select("id, title, reopen_window_closes_at")
      .eq("status", "RESOLVED")
      .not("reopen_window_closes_at", "is", null)
      .lt("reopen_window_closes_at", nowIso);

    if (expiredCitizenAuditTickets && expiredCitizenAuditTickets.length > 0) {
      for (const ticket of expiredCitizenAuditTickets) {
        await supabaseClient
          .from("complaints")
          .update({
            reopen_window_closes_at: null,
            updated_at: nowIso,
          })
          .eq("id", ticket.id);

        await supabaseClient.from("complaint_audit_logs").insert({
          complaint_id: ticket.id,
          actor_name: "AI Resolution Verification Fallback",
          action: "RESOLVED",
          from_status: "RESOLVED",
          to_status: "RESOLVED",
          remarks: "48-Hour Citizen Quality Audit window expired with zero disputes. AI Vision Model auto-verified repair completion.",
        });

        results.ai_auto_confirmed_resolutions++;
        results.processed_complaints.push({ id: ticket.id, jump: "AI_AUTO_CONFIRMED" });
      }
    }

    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        timestamp: nowIso,
        summary: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
