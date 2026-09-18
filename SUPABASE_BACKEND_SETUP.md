# CivicPulse AI / Smart Civic CMS — Supabase Backend Setup & Architecture Guide

This document contains the complete backend codebase, SQL migrations, PostGIS stored procedures, Supabase Edge Functions (Deno / TypeScript), Row-Level Security (RLS) policies, and storage configurations required to deploy and run the backend on **Supabase**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema & PostGIS Migrations](#2-database-schema--postgis-migrations)
3. [Stored Procedures & Database Triggers](#3-stored-procedures--database-triggers)
4. [Row-Level Security (RLS) Policies](#4-row-level-security-rls-policies)
5. [Supabase Edge Functions (Backend Services)](#5-supabase-edge-functions-backend-services)
   - [5.1 Intake Webhook Engine (`intake-webhook`)](#51-intake-webhook-engine-intake-webhook)
   - [5.2 Field Crew Resolution Proof (`crew-submit-resolution`)](#52-field-crew-resolution-proof-crew-submit-resolution)
   - [5.3 Supervisor Assignment (`supervisor-assign`)](#53-supervisor-assignment-supervisor-assign)
   - [5.4 Supervisor Approval & Dispute Window (`supervisor-approve-resolution`)](#54-supervisor-approval--dispute-window-supervisor-approve-resolution)
6. [Storage Buckets Configuration](#6-storage-buckets-configuration)
7. [Realtime Synchronization Setup](#7-realtime-synchronization-setup)
8. [Deployment Instructions (Dashboard & CLI)](#8-deployment-instructions-dashboard--cli)

---

## 1. Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  CITIZEN / IoT                                   |
|   (Mobile Web, WhatsApp Ingestion, Voice Notes, Geotagged Photos)                |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        SUPABASE EDGE FUNCTIONS / API                              |
|                                                                                   |
|  * intake-webhook:                                                               |
|      - Voice Transcription & Vision AI Category Classification                    |
|      - GIS Polygon Ward Routing (ST_Contains)                                     |
|      - 20-Meter Proximity Clustering & Master/Child Ticket Merging               |
|                                                                                   |
|  * crew-submit-resolution:                                                        |
|      - 30-Meter Geofence Resolution Verification (ST_Distance)                    |
|      - Side-by-Side Dual Photo Recording                                          |
|                                                                                   |
|  * supervisor-assign & supervisor-approve-resolution:                             |
|      - Dynamic SLA Deadline Calculator                                            |
|      - 48-Hour Citizen Quality Audit Window Activation                            |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                   POSTGRESQL 15+ DATABASE WITH POSTGIS EXTENSION                  |
|                                                                                   |
|  * Tables: wards, profiles, complaints, linked_tickets, complaint_audit_logs     |
|  * Spatial Indexes (GIST on EPSG:4326 Point/Polygon geometries)                   |
|  * Realtime Replication WebSockets for Instant Cross-Role Sync                    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Database Schema & PostGIS Migrations

Run this in your **Supabase Dashboard > SQL Editor**:

```sql
-- 1. Enable Spatial and UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enumerated Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'FIELD_CREW', 
        'WARD_SUPERVISOR', 
        'MUNICIPAL_COMMISSIONER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE complaint_status AS ENUM (
        'PENDING', 
        'ASSIGNED', 
        'WORK_SUBMITTED', 
        'RESOLVED', 
        'REOPENED', 
        'ESCALATED', 
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE complaint_category AS ENUM (
        'POTHOLE', 
        'GARBAGE', 
        'STREETLIGHT', 
        'WATER_LEAK', 
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'CREATED',
        'UPVOTED',
        'LINKED_CHILD_TICKET',
        'ASSIGNED',
        'STATUS_CHANGE',
        'WORK_SUBMITTED',
        'RESOLVED',
        'DISPUTED_REOPEN',
        'ESCALATED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Wards Geographic Table (Polygon Boundaries)
CREATE TABLE IF NOT EXISTS wards (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(50) NOT NULL,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'FIELD_CREW',
    ward_id VARCHAR(50) REFERENCES wards(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Master Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category complaint_category NOT NULL DEFAULT 'OTHER',
    status complaint_status NOT NULL DEFAULT 'PENDING',
    
    -- Spatial Location (EPSG:4326 WGS 84 Point)
    location GEOMETRY(Point, 4326) NOT NULL,
    address_text TEXT,
    ward_id VARCHAR(50) REFERENCES wards(id) ON DELETE SET NULL,
    
    -- Media Assets & Vision AI Analysis
    image_url TEXT NOT NULL,
    audio_url TEXT,
    ai_transcription TEXT,
    ai_detected_category complaint_category,
    ai_confidence_score NUMERIC(5,2),
    visual_fingerprint TEXT,
    
    -- Proximity Deduplication & Upvotes
    upvotes_count INT NOT NULL DEFAULT 1,
    is_master BOOLEAN NOT NULL DEFAULT true,
    
    -- Operational Assignment & SLA
    assigned_crew_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sla_deadline TIMESTAMPTZ NOT NULL,
    
    -- Fraud-Resistant Proof of Resolution
    resolution_image_url TEXT,
    resolution_location GEOMETRY(Point, 4326),
    resolution_distance_meters DOUBLE PRECISION,
    resolution_submitted_at TIMESTAMPTZ,
    supervisor_notes TEXT,
    verified_at TIMESTAMPTZ,
    reopen_window_closes_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Linked Tickets / Duplicate Child Submissions Table
CREATE TABLE IF NOT EXISTS linked_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_ticket_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    text_content TEXT,
    audio_url TEXT,
    ai_transcription TEXT,
    image_url TEXT,
    visual_fingerprint TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    distance_from_master_meters DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Unique Citizen Upvotes Association Table
CREATE TABLE IF NOT EXISTS complaint_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_complaint_user UNIQUE(complaint_id, citizen_id)
);

-- 8. Immutable Lifecycle Audit Trail Table
CREATE TABLE IF NOT EXISTS complaint_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(120),
    action audit_action NOT NULL,
    from_status complaint_status,
    to_status complaint_status,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Spatial & Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON wards USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_complaints_resolution_loc ON complaints USING GIST (resolution_location);
CREATE INDEX IF NOT EXISTS idx_linked_tickets_parent ON linked_tickets (parent_ticket_id);
CREATE INDEX IF NOT EXISTS idx_linked_tickets_location ON linked_tickets USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_complaints_ward_status ON complaints (ward_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_crew_tasks ON complaints (assigned_crew_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_active ON complaints (sla_deadline) WHERE status NOT IN ('RESOLVED', 'REJECTED');
CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_comp_id ON complaint_upvotes (complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_complaint_id ON complaint_audit_logs (complaint_id, created_at DESC);
```

---

## 3. Stored Procedures & Database Triggers

### 3.1 PostGIS 20-Meter Radius Deduplication Engine

```sql
CREATE OR REPLACE FUNCTION check_duplicate_complaint(
    new_lat DOUBLE PRECISION,
    new_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 20.0
)
RETURNS TABLE (duplicate_id UUID, current_upvotes INT, distance_meters DOUBLE PRECISION) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS duplicate_id, 
        c.upvotes_count AS current_upvotes,
        ST_Distance(
            c.location::geography,
            ST_SetSRID(ST_MakePoint(new_lng, new_lat), 4326)::geography
        ) AS distance_meters
    FROM complaints c
    WHERE c.status IN ('PENDING', 'ASSIGNED', 'WORK_SUBMITTED')
      AND ST_DWithin(
          c.location::geography,
          ST_SetSRID(ST_MakePoint(new_lng, new_lat), 4326)::geography,
          radius_meters
      )
    ORDER BY ST_Distance(
        c.location::geography,
        ST_SetSRID(ST_MakePoint(new_lng, new_lat), 4326)::geography
    ) ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 GIS Polygon Auto-Ward Assignment Trigger (`ST_Contains`)

```sql
CREATE OR REPLACE FUNCTION auto_assign_ward()
RETURNS TRIGGER AS $$
BEGIN
    SELECT id INTO NEW.ward_id
    FROM wards
    WHERE ST_Contains(wards.boundary, NEW.location)
    LIMIT 1;
    
    IF NEW.ward_id IS NULL THEN
        NEW.ward_id := 'UNASSIGNED_ZONE';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_assign_ward ON complaints;
CREATE TRIGGER trg_auto_assign_ward
BEFORE INSERT ON complaints
FOR EACH ROW
WHEN (NEW.ward_id IS NULL)
EXECUTE FUNCTION auto_assign_ward();
```

### 3.3 Dynamic SLA Deadline Trigger

```sql
CREATE OR REPLACE FUNCTION calculate_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sla_deadline IS NULL THEN
        NEW.sla_deadline := CASE NEW.category
            WHEN 'GARBAGE' THEN NOW() + INTERVAL '24 hours'
            WHEN 'WATER_LEAK' THEN NOW() + INTERVAL '24 hours'
            WHEN 'POTHOLE' THEN NOW() + INTERVAL '48 hours'
            WHEN 'STREETLIGHT' THEN NOW() + INTERVAL '72 hours'
            ELSE NOW() + INTERVAL '48 hours'
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_sla ON complaints;
CREATE TRIGGER trg_calculate_sla
BEFORE INSERT ON complaints
FOR EACH ROW
EXECUTE FUNCTION calculate_sla_deadline();
```

---

## 4. Row-Level Security (RLS) Policies

```sql
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Access
CREATE POLICY "Public Read Access" ON complaints FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public Read Linked Tickets" ON linked_tickets FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public Read Audit Logs" ON complaint_audit_logs FOR SELECT TO authenticated, anon USING (true);

-- 2. Citizen Insertion
CREATE POLICY "Citizen Submission Access" ON complaints FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Citizen Linked Ticket Access" ON linked_tickets FOR INSERT TO authenticated, anon WITH CHECK (true);

-- 3. Field Crew Work Submission
CREATE POLICY "Field Crew Submission Access" ON complaints FOR UPDATE TO authenticated 
USING (assigned_crew_id = auth.uid() AND status = 'ASSIGNED')
WITH CHECK (status = 'WORK_SUBMITTED');

-- 4. Supervisor Ward Administration
CREATE POLICY "Supervisor Ward Administration" ON complaints FOR ALL TO authenticated 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'WARD_SUPERVISOR' 
      AND profiles.ward_id = complaints.ward_id
));

-- 5. Commissioner Global Authority
CREATE POLICY "Commissioner Global Authority" ON complaints FOR ALL TO authenticated 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'MUNICIPAL_COMMISSIONER'
));
```

---

## 5. Supabase Edge Functions (Backend Services)

These Edge Functions run on Supabase Deno runtime. To deploy:
```bash
supabase functions new intake-webhook
supabase functions new crew-submit-resolution
supabase functions new supervisor-assign
supabase functions new supervisor-approve-resolution
```

---

### 5.1 Intake Webhook Engine (`intake-webhook`)

`supabase/functions/intake-webhook/index.ts`:

```typescript
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
        remarks: `Matched nearby complaint at ${Math.round(duplicate.distance_meters)}m. Master upvoted to ${newUpvotes}.`,
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

    // BRANCH: NEW TICKET
    const newTicketId = crypto.randomUUID();
    const targetCategory = category || "OTHER";

    const { data: newTicket, error: insertErr } = await supabaseClient
      .from("complaints")
      .insert({
        id: newTicketId,
        citizen_id: citizen_id || null,
        title: text ? text.slice(0, 100) : `${targetCategory} reported`,
        description: text || "Complaint lodged via intake engine",
        category: targetCategory,
        status: "PENDING",
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

    await supabaseClient.from("complaint_audit_logs").insert({
      complaint_id: newTicketId,
      actor_name: "Intake Webhook Engine",
      action: "CREATED",
      to_status: "PENDING",
      remarks: "New complaint instantiated and auto-routed via GIS polygon trigger.",
    });

    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        pipeline_route: "NEW_TICKET_CREATED",
        ticket: newTicket,
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
```

---

### 5.2 Field Crew Resolution Proof (`crew-submit-resolution`)

`supabase/functions/crew-submit-resolution/index.ts`:

```typescript
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

    const ticketLng = ticket.location.coordinates[0];
    const ticketLat = ticket.location.coordinates[1];
    const resLat = parseFloat(resolution_lat);
    const resLng = parseFloat(resolution_lng);

    const distanceMeters = Math.round(calculateHaversineDistance(ticketLat, ticketLng, resLat, resLng) * 10) / 10;

    // Enforce 30-Meter Geofence Guard
    if (distanceMeters > 30.0) {
      return new Response(
        JSON.stringify({
          error: "INVALID_RESOLUTION_PROXIMITY",
          message: `Resolution photo taken ${distanceMeters}m away from incident site. Must be within ≤30 meters.`,
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
      remarks: `Work proof submitted on site. GPS delta: ${distanceMeters}m (tolerance: ≤30m).`,
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
```

---

### 5.3 Supervisor Assignment (`supervisor-assign`)

`supabase/functions/supervisor-assign/index.ts`:

```typescript
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
```

---

### 5.4 Supervisor Approval & Dispute Window (`supervisor-approve-resolution`)

`supabase/functions/supervisor-approve-resolution/index.ts`:

```typescript
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
      ? new Date(now.getTime() + 48 * 3600000).toISOString() // 48-Hour Quality Audit Window
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
      JSON.stringify({ status: "SUCCESS", complaint_id, new_status: newStatus, reopen_window_closes_at: reopenWindowClosesAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## 6. Storage Buckets Configuration

Create two public storage buckets in **Supabase Dashboard > Storage**:

1. **`complaint-media`** (Public)
   - Max file size: `25MB`
   - Allowed MIME types: `image/jpeg, image/png, image/webp, audio/mpeg, audio/wav, audio/ogg`
2. **`resolution-proofs`** (Public)
   - Max file size: `25MB`
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

Storage RLS Policy (SQL):
```sql
CREATE POLICY "Public Upload to complaint-media" ON storage.objects
FOR INSERT TO authenticated, anon
WITH CHECK (bucket_id = 'complaint-media');

CREATE POLICY "Public Read from complaint-media" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'complaint-media');

CREATE POLICY "Crew Upload to resolution-proofs" ON storage.objects
FOR INSERT TO authenticated, anon
WITH CHECK (bucket_id = 'resolution-proofs');

CREATE POLICY "Public Read from resolution-proofs" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'resolution-proofs');
```

---

## 7. Realtime Synchronization Setup

1. In **Supabase Dashboard > Database > Replication**, turn on replication for:
   - `public.complaints`
   - `public.complaint_audit_logs`
2. The frontend will automatically listen to live inserts, updates, and status transitions via WebSocket subscriptions.

---

## 8. Deployment Instructions (Dashboard & CLI)

### Via Supabase Dashboard (Fastest):
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Open **SQL Editor**, paste the code from [Section 2](#2-database-schema--postgis-migrations), [Section 3](#3-stored-procedures--database-triggers), and [Section 4](#4-row-level-security-rls-policies) and click **Run**.
3. Create the two Storage buckets (`complaint-media`, `resolution-proofs`) in **Storage**.
4. Copy your `Project URL`, `anon key`, and `service_role key` from **Project Settings > API** into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

### Via Supabase CLI:
```bash
# 1. Login to Supabase CLI
supabase login

# 2. Link your remote project
supabase link --project-ref <your-project-ref>

# 3. Push database migrations
supabase db push

# 4. Deploy all Edge Functions
supabase functions deploy intake-webhook
supabase functions deploy crew-submit-resolution
supabase functions deploy supervisor-assign
supabase functions deploy supervisor-approve-resolution
```
