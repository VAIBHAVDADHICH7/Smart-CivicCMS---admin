import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    const { text, photo_url, audio_url, category, latitude, longitude, address_text, citizen_id } = payload;

    if (latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: "Coordinates are required for GIS routing." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // 1. PostGIS 20-Meter Proximity Clustering Check via RPC
    const { data: dupData, error: dupErr } = await supabaseClient.rpc("check_duplicate_complaint", {
      new_lat: lat,
      new_lng: lng,
      radius_meters: 20.0,
    });

    if (!dupErr && dupData && dupData.length > 0) {
      // BRANCH: DUPLICATE FOUND (Upvote Master + Link Child Ticket)
      const duplicate = dupData[0];
      const masterId = duplicate.duplicate_id;
      const newUpvotes = duplicate.current_upvotes + 1;

      await supabaseClient
        .from("complaints")
        .update({ upvotes_count: newUpvotes, updated_at: new Date().toISOString() })
        .eq("id", masterId);

      const childTicketId = crypto.randomUUID();
      await supabaseClient.from("linked_tickets").insert({
        id: childTicketId,
        parent_ticket_id: masterId,
        citizen_id: citizen_id || null,
        text_content: text || "Linked citizen report",
        audio_url: audio_url || null,
        image_url: photo_url || null,
        location: `SRID=4326;POINT(${lng} ${lat})`,
        distance_from_master_meters: duplicate.distance_meters || 0,
      });

      await supabaseClient.from("complaint_audit_logs").insert({
        complaint_id: masterId,
        actor_name: "Intake Webhook Engine",
        action: "LINKED_CHILD_TICKET",
        remarks: `Matched nearby complaint at ${Math.round(duplicate.distance_meters || 0)}m. Master upvoted to ${newUpvotes}.`,
      });

      return new Response(
        JSON.stringify({
          status: "SUCCESS",
          pipeline_route: "DUPLICATE_MERGED",
          action: "UPVOTE_AND_LINK_CHILD_TICKET",
          data: {
            master_ticket_id: masterId,
            upvotes: newUpvotes,
            distance_meters: duplicate.distance_meters,
            child_ticket_id: childTicketId,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BRANCH: NEW TICKET & AUTO-ASSIGNMENT
    const newTicketId = crypto.randomUUID();
    const targetCategory = category || "OTHER";

    // Auto-detect designated crew from profiles table
    const { data: activeCrews } = await supabaseClient
      .from("profiles")
      .select("id, full_name, ward_id")
      .eq("role", "FIELD_CREW")
      .eq("is_active", true);

    const designatedCrew = (activeCrews && activeCrews.length > 0) ? activeCrews[0] : null;

    const { data: newTicket, error: insertErr } = await supabaseClient
      .from("complaints")
      .insert({
        id: newTicketId,
        citizen_id: citizen_id || null,
        title: text ? text.slice(0, 100) : `${targetCategory} reported`,
        description: text || "Complaint lodged via intake engine",
        category: targetCategory,
        status: designatedCrew ? "ASSIGNED" : "PENDING",
        assigned_crew_id: designatedCrew ? designatedCrew.id : null,
        assigned_at: designatedCrew ? new Date().toISOString() : null,
        location: `SRID=4326;POINT(${lng} ${lat})`,
        address_text: address_text || "Geocoded Municipal Sector",
        image_url: photo_url || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80",
        audio_url: audio_url || null,
        upvotes_count: 1,
        is_master: true,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    const auditRemarks = designatedCrew
      ? `Instantiated & auto-assigned directly to crew ${designatedCrew.full_name}. Push alert sent.`
      : "New complaint instantiated and auto-routed via GIS polygon trigger.";

    await supabaseClient.from("complaint_audit_logs").insert([
      {
        complaint_id: newTicketId,
        actor_name: "Intake Webhook Engine",
        action: "CREATED",
        to_status: "PENDING",
        remarks: "New complaint instantiated and auto-routed via GIS polygon trigger.",
      },
      ...(designatedCrew ? [{
        complaint_id: newTicketId,
        actor_name: "Auto-Assignment Engine",
        action: "ASSIGNED" as const,
        from_status: "PENDING" as const,
        to_status: "ASSIGNED" as const,
        remarks: auditRemarks,
      }] : [])
    ]);

    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        pipeline_route: "NEW_TICKET_CREATED",
        action: designatedCrew ? "AUTO_ASSIGNED_TO_CREW" : "PENDING_TRIAGE",
        ticket: newTicket,
        assigned_crew: designatedCrew ? { id: designatedCrew.id, name: designatedCrew.full_name } : null,
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
