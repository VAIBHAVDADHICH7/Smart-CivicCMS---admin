import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Haversine distance calculator (meters)
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { complaint_id, resolution_lat, resolution_lng, proof_image } = await req.json();

    const { data: ticket, error: fetchErr } = await supabaseClient
      .from("complaints")
      .select("id, location")
      .eq("id", complaint_id)
      .single();

    if (fetchErr || !ticket) {
      return new Response(JSON.stringify({ error: "Complaint not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ticketLng = ticket.location?.coordinates?.[0] || 0;
    const ticketLat = ticket.location?.coordinates?.[1] || 0;
    const resLat = parseFloat(resolution_lat);
    const resLng = parseFloat(resolution_lng);

    const distanceMeters = Math.round(calculateHaversineDistance(ticketLat, ticketLng, resLat, resLng) * 10) / 10;

    // Enforce 30-Meter Geofence Guard
    if (distanceMeters > 30.0) {
      return new Response(
        JSON.stringify({
          error: "INVALID_RESOLUTION_PROXIMITY",
          message: `Resolution photo taken ${distanceMeters}m away from incident site. Must be within <= 30 meters.`,
          distance_meters: distanceMeters,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    await supabaseClient
      .from("complaints")
      .update({
        status: "WORK_SUBMITTED",
        resolution_image_url: proof_image,
        resolution_location: `SRID=4326;POINT(${resLng} ${resLat})`,
        resolution_distance_meters: distanceMeters,
        resolution_submitted_at: now,
        updated_at: now,
      })
      .eq("id", complaint_id);

    await supabaseClient.from("complaint_audit_logs").insert({
      complaint_id,
      actor_name: "Field Crew",
      action: "WORK_SUBMITTED",
      from_status: "ASSIGNED",
      to_status: "WORK_SUBMITTED",
      remarks: `Work proof submitted on site. GPS delta: ${distanceMeters}m (tolerance: <= 30m).`,
    });

    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        data: {
          complaint_id,
          distance_meters: distanceMeters,
          message: "Resolution proof accepted within 30-meter geofence perimeter.",
        },
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
