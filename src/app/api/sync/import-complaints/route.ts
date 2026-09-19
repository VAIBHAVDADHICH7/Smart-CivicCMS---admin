// POST /api/sync/import-complaints
// Fetches complaints from the source Supabase database and upserts them
// into the destination database, mapping whatever schema the source exposes.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_CATEGORIES = ["POTHOLE", "GARBAGE", "STREETLIGHT", "WATER_LEAK", "OTHER"] as const;
const VALID_STATUSES = ["PENDING", "ASSIGNED", "WORK_SUBMITTED", "RESOLVED", "REOPENED", "ESCALATED", "REJECTED"] as const;

type Category = (typeof VALID_CATEGORIES)[number];
type Status = (typeof VALID_STATUSES)[number];

function normalizeCategory(raw: string | null | undefined): Category {
  if (!raw) return "OTHER";
  const up = raw.toUpperCase().replace(/[^A-Z_]/g, "");
  if ((VALID_CATEGORIES as readonly string[]).includes(up)) return up as Category;
  if (up.includes("POTHOLE") || up.includes("ROAD") || up.includes("CRATER")) return "POTHOLE";
  if (up.includes("GARBAGE") || up.includes("WASTE") || up.includes("TRASH") || up.includes("SANIT")) return "GARBAGE";
  if (up.includes("LIGHT") || up.includes("LAMP") || up.includes("STREET")) return "STREETLIGHT";
  if (up.includes("WATER") || up.includes("LEAK") || up.includes("PIPE") || up.includes("DRAIN")) return "WATER_LEAK";
  return "OTHER";
}

function normalizeStatus(raw: string | null | undefined): Status {
  if (!raw) return "PENDING";
  const up = raw.toUpperCase().replace(/[^A-Z_]/g, "");
  if ((VALID_STATUSES as readonly string[]).includes(up)) return up as Status;
  if (up.includes("RESOLVE") || up.includes("CLOSE") || up.includes("DONE") || up.includes("COMPLET")) return "RESOLVED";
  if (up.includes("ASSIGN") || up.includes("PROGRESS") || up.includes("ACTIVE")) return "ASSIGNED";
  if (up.includes("ESCALAT")) return "ESCALATED";
  if (up.includes("REJECT") || up.includes("CANCEL")) return "REJECTED";
  return "PENDING";
}

// Extract lat/lng from whatever shape the source row uses
function extractCoordinates(row: Record<string, unknown>): { lat: number; lng: number } {
  // Flat columns: latitude/longitude or lat/lng or lat/long
  const lat = Number(row.latitude ?? row.lat ?? 0);
  const lng = Number(row.longitude ?? row.lng ?? row.long ?? 0);
  if (lat !== 0 || lng !== 0) return { lat, lng };

  // GeoJSON: { coordinates: [lng, lat] }
  const loc = row.location as { coordinates?: number[] } | null;
  if (loc?.coordinates?.length === 2) {
    return { lat: loc.coordinates[1], lng: loc.coordinates[0] };
  }

  // WKT string: "POINT(lng lat)"
  if (typeof loc === "string") {
    const m = (loc as string).match(/POINT\(([0-9.\-]+)\s+([0-9.\-]+)\)/i);
    if (m) return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };
  }

  return { lat: 0, lng: 0 };
}

function slaDuration(category: Category): number {
  switch (category) {
    case "GARBAGE":
    case "WATER_LEAK":
      return 24;
    case "POTHOLE":
      return 48;
    case "STREETLIGHT":
      return 72;
    default:
      return 48;
  }
}

// Map a source row (unknown schema) → our complaints table row
function mapSourceRow(row: Record<string, unknown>) {
  const { lat, lng } = extractCoordinates(row);
  const category = normalizeCategory(row.category as string ?? row.type as string ?? row.issue_type as string);
  const status = normalizeStatus(row.status as string ?? row.state as string);
  const createdAt = (row.created_at ?? row.createdAt ?? row.submitted_at ?? new Date().toISOString()) as string;
  const slaHours = slaDuration(category);
  const slaDeadline = new Date(new Date(createdAt).getTime() + slaHours * 3600000).toISOString();

  return {
    // Use source ID so re-running the sync stays idempotent
    id: row.id as string,
    title: (row.title ?? row.subject ?? row.heading ?? `${category} reported`) as string,
    description: (row.description ?? row.body ?? row.details ?? row.text_content ?? "") as string,
    category,
    status,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    address_text: (row.address_text ?? row.address ?? row.location_text ?? row.area ?? "Imported from source DB") as string,
    image_url: (row.image_url ?? row.photo_url ?? row.photo ?? row.img ??
      "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80") as string,
    audio_url: (row.audio_url ?? null) as string | null,
    ai_transcription: (row.ai_transcription ?? null) as string | null,
    upvotes_count: Number(row.upvotes_count ?? row.upvotes ?? row.votes ?? 1),
    is_master: true,
    sla_deadline: slaDeadline,
    created_at: createdAt,
    updated_at: (row.updated_at ?? row.updatedAt ?? new Date().toISOString()) as string,
  };
}

export async function POST() {
  const sourceUrl = process.env.SOURCE_SUPABASE_URL;
  const sourceKey = process.env.SOURCE_SUPABASE_KEY;
  const destUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const destKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!sourceUrl || !sourceKey) {
    return NextResponse.json({ error: "SOURCE_SUPABASE_URL / SOURCE_SUPABASE_KEY not configured." }, { status: 500 });
  }
  if (!destUrl || !destKey) {
    return NextResponse.json({ error: "Destination Supabase credentials not configured." }, { status: 500 });
  }

  const sourceClient = createClient(sourceUrl, sourceKey);
  const destClient = createClient(destUrl, destKey);

  // ── 1. Probe source schema ────────────────────────────────────────────────
  // Try the most common table names used for complaints
  const tableNames = ["complaints", "complaint", "issues", "tickets", "reports", "civic_complaints"];
  let sourceRows: Record<string, unknown>[] = [];
  let sourceTable = "";

  for (const table of tableNames) {
    const { data, error } = await sourceClient.from(table).select("*").limit(500);
    if (!error && data && data.length >= 0) {
      sourceRows = data as Record<string, unknown>[];
      sourceTable = table;
      break;
    }
  }

  if (!sourceTable) {
    return NextResponse.json({
      error: "Could not locate a complaints table in the source database.",
      tried: tableNames,
    }, { status: 404 });
  }

  if (sourceRows.length === 0) {
    return NextResponse.json({
      status: "OK",
      message: `Source table '${sourceTable}' is empty — nothing to import.`,
      imported: 0,
      skipped: 0,
    });
  }

  // ── 2. Map rows ───────────────────────────────────────────────────────────
  const mapped = sourceRows.map(mapSourceRow);

  // ── 3. Upsert into destination (conflict on id → update) ─────────────────
  const BATCH = 50;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH);
    const { error } = await destClient
      .from("complaints")
      .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

    if (error) {
      skipped += batch.length;
      errors.push(error.message);
    } else {
      imported += batch.length;

      // Write an audit log entry for each imported complaint
      const auditEntries = batch.map((c) => ({
        complaint_id: c.id,
        actor_name: "Source DB Sync Engine",
        action: "CREATED",
        to_status: c.status,
        remarks: `Imported from source database (${sourceUrl}) — table: ${sourceTable}.`,
      }));

      await destClient.from("complaint_audit_logs").upsert(auditEntries, {
        onConflict: "complaint_id",
        ignoreDuplicates: true,
      });
    }
  }

  return NextResponse.json({
    status: "SUCCESS",
    source_url: sourceUrl,
    source_table: sourceTable,
    total_fetched: sourceRows.length,
    imported,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// GET — quick status / config check
export async function GET() {
  const sourceUrl = process.env.SOURCE_SUPABASE_URL;
  const sourceKey = process.env.SOURCE_SUPABASE_KEY;

  return NextResponse.json({
    configured: Boolean(sourceUrl && sourceKey),
    source_url: sourceUrl ?? null,
    endpoint: "POST /api/sync/import-complaints — triggers a full sync",
  });
}
