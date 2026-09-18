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

    const { complaint_id, action, notes } = await req.json();
    const now = new Date();
    const newStatus = action === "APPROVE" ? "RESOLVED" : "ASSIGNED";
    const reopenWindowClosesAt = action === "APPROVE"
      ? new Date(now.getTime() + 48 * 3600000).toISOString() // 48-Hour Citizen Quality Audit Window
      : null;

    await supabaseClient
      .from("complaints")
      .update({
        status: newStatus,
        supervisor_notes: notes || (action === "APPROVE" ? "Approved side-by-side photographic proof." : "Rejected proof."),
        verified_at: action === "APPROVE" ? now.toISOString() : null,
        reopen_window_closes_at: reopenWindowClosesAt,
        updated_at: now.toISOString(),
      })
      .eq("id", complaint_id);

    await supabaseClient.from("complaint_audit_logs").insert({
      complaint_id,
      actor_name: "Ward Supervisor",
      action: action === "APPROVE" ? "RESOLVED" : "STATUS_CHANGE",
      from_status: "WORK_SUBMITTED",
      to_status: newStatus,
      remarks: notes || (action === "APPROVE" ? "Approved resolution proof." : "Rejected resolution proof for re-work."),
    });

    return new Response(
      JSON.stringify({ 
        status: "SUCCESS", 
        complaint_id, 
        new_status: newStatus, 
        reopen_window_closes_at: reopenWindowClosesAt 
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
