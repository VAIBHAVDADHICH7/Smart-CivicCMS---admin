import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Complaint, Ward, Profile, ComplaintAuditLog, LinkedTicket } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Returns true if valid Supabase credentials are configured in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project.supabase.co") &&
    !supabaseAnonKey.includes("your-anon-key") &&
    supabaseUrl.startsWith("http")
  );
}

// Global Browser / Client-side Supabase Client
let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return _supabaseClient;
}

export const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

/**
 * Returns a server-side Supabase client with elevated privileges if service role key is available.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const key = supabaseServiceKey && !supabaseServiceKey.includes("your-service-role-key") 
    ? supabaseServiceKey 
    : supabaseAnonKey;
  return createClient(supabaseUrl, key);
}

// ---------------------------------------------------------------------------
// DATA ADAPTER HELPERS (Convert PostGIS / DB rows <-> Domain Types)
// ---------------------------------------------------------------------------

export function mapDbComplaintToDomain(row: any): Complaint {
  let lat = 0;
  let lng = 0;

  if (row.location) {
    if (typeof row.location === "object" && row.location.coordinates) {
      // GeoJSON [longitude, latitude]
      lng = row.location.coordinates[0];
      lat = row.location.coordinates[1];
    } else if (typeof row.latitude === "number" && typeof row.longitude === "number") {
      lat = row.latitude;
      lng = row.longitude;
    }
  } else if (typeof row.latitude === "number" && typeof row.longitude === "number") {
    lat = row.latitude;
    lng = row.longitude;
  }

  let resLat = row.resolution_latitude;
  let resLng = row.resolution_longitude;
  if (row.resolution_location && typeof row.resolution_location === "object" && row.resolution_location.coordinates) {
    resLng = row.resolution_location.coordinates[0];
    resLat = row.resolution_location.coordinates[1];
  }

  return {
    id: row.id,
    citizen_id: row.citizen_id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    status: row.status,
    latitude: lat,
    longitude: lng,
    address_text: row.address_text || "",
    ward_id: row.ward_id,
    image_url: row.image_url,
    audio_url: row.audio_url,
    ai_transcription: row.ai_transcription,
    ai_detected_category: row.ai_detected_category,
    ai_confidence_score: row.ai_confidence_score ? Number(row.ai_confidence_score) : undefined,
    visual_fingerprint: row.visual_fingerprint,
    upvotes_count: row.upvotes_count || 1,
    is_master: row.is_master ?? true,
    linked_tickets: row.linked_tickets || [],
    assigned_crew_id: row.assigned_crew_id,
    supervisor_id: row.supervisor_id,
    sla_deadline: row.sla_deadline,
    resolution_image_url: row.resolution_image_url,
    resolution_latitude: resLat,
    resolution_longitude: resLng,
    resolution_distance_meters: row.resolution_distance_meters,
    resolution_submitted_at: row.resolution_submitted_at,
    supervisor_notes: row.supervisor_notes,
    verified_at: row.verified_at,
    reopen_window_closes_at: row.reopen_window_closes_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapDomainComplaintToDb(c: Partial<Complaint>) {
  const row: Record<string, any> = { ...c };
  
  if (c.latitude !== undefined && c.longitude !== undefined) {
    // Standard WKT or GeoJSON point for PostGIS
    row.location = `SRID=4326;POINT(${c.longitude} ${c.latitude})`;
  }
  if (c.resolution_latitude !== undefined && c.resolution_longitude !== undefined) {
    row.resolution_location = `SRID=4326;POINT(${c.resolution_longitude} ${c.resolution_latitude})`;
  }
  
  delete row.latitude;
  delete row.longitude;
  delete row.resolution_latitude;
  delete row.resolution_longitude;
  delete row.linked_tickets;

  return row;
}

// ---------------------------------------------------------------------------
// SUPABASE OPERATIONS
// ---------------------------------------------------------------------------

export async function fetchComplaintsFromSupabase(): Promise<Complaint[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("complaints")
      .select(`
        *,
        linked_tickets (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch complaints error:", error.message);
      return null;
    }

    if (!data) return [];
    return data.map(mapDbComplaintToDomain);
  } catch (err) {
    console.warn("Failed fetching from Supabase:", err);
    return null;
  }
}

export async function fetchWardsFromSupabase(): Promise<Ward[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from("wards").select("*");
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchProfilesFromSupabase(): Promise<Profile[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from("profiles").select("*");
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchAuditsFromSupabase(): Promise<ComplaintAuditLog[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("complaint_audit_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function insertComplaintToSupabase(complaint: Complaint): Promise<boolean> {
  const client = getServiceSupabase() || getSupabaseClient();
  if (!client) return false;

  try {
    const dbRow = mapDomainComplaintToDb(complaint);
    const { error } = await client.from("complaints").insert(dbRow);
    if (error) {
      console.warn("Supabase insert complaint failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase insert error:", err);
    return false;
  }
}

export async function updateComplaintInSupabase(id: string, updates: Partial<Complaint>): Promise<boolean> {
  const client = getServiceSupabase() || getSupabaseClient();
  if (!client) return false;

  try {
    const dbRow = mapDomainComplaintToDb(updates);
    const { error } = await client.from("complaints").update(dbRow).eq("id", id);
    if (error) {
      console.warn("Supabase update complaint failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase update error:", err);
    return false;
  }
}

export async function insertAuditLogToSupabase(audit: ComplaintAuditLog): Promise<boolean> {
  const client = getServiceSupabase() || getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from("complaint_audit_logs").insert(audit);
    return !error;
  } catch {
    return false;
  }
}
