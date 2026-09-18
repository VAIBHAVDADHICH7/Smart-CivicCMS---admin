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

    const { complaint_id, assigned_crew_id, sla_hours, supervisor_id } = await req.json();

    const slaDeadline = new Date(Date.now() + (sla_hours || 24) * 3600000).toISOString();
    const now = new Date().toISOString();

    await supabaseClient
      .from("complaints")
      .update({
        status: "ASSIGNED",
        assigned_crew_id,
        supervisor_id,
        sla_deadline: slaDeadline,
        updated_at: now,
      })
      .eq("id", complaint_id);

    await supabaseClient.from("complaint_audit_logs").insert({
      complaint_id,
      actor_name: "Ward Supervisor",
      action: "ASSIGNED",
      from_status: "PENDING",
      to_status: "ASSIGNED",
      remarks: `Assigned to contractor ${assigned_crew_id}. Target SLA: ${sla_hours || 24}h.`,
    });

    return new Response(
      JSON.stringify({ status: "SUCCESS", complaint_id, sla_deadline: slaDeadline }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
