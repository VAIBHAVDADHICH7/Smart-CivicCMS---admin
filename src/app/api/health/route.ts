import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptime = process.uptime();
  const supabaseConnected = isSupabaseConfigured();

  return NextResponse.json(
    {
      status: "healthy",
      service: "CivicPulse AI / Smart Civic CMS",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      environment: process.env.NODE_ENV || "development",
      supabase: {
        configured: supabaseConnected,
        mode: supabaseConnected ? "live-cloud" : "local-postgis-reactive",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
