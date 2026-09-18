-- CivicPulse AI / Smart Civic CMS - Database Schema & Architecture Specification
-- Engine: PostgreSQL 15+ with PostGIS Spatial Extension

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enumerated Domains
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'FIELD_CREW', 
        'WARD_SUPERVISOR', 
        'MUNICIPAL_COMMISSIONER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_category AS ENUM (
        'POTHOLE', 
        'GARBAGE', 
        'STREETLIGHT', 
        'WATER_LEAK', 
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Wards Geographic Table (Polygons for Auto-Routing)
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
    
    -- Spatial Data (EPSG:4326 WGS 84)
    location GEOMETRY(Point, 4326) NOT NULL,
    address_text TEXT,
    ward_id VARCHAR(50) REFERENCES wards(id) ON DELETE SET NULL,
    
    -- Ingestion Media Assets & AI Processing
    image_url TEXT NOT NULL,
    audio_url TEXT,
    ai_transcription TEXT,
    ai_detected_category complaint_category,
    ai_confidence_score NUMERIC(5,2),
    visual_fingerprint TEXT,
    
    -- Deduplication & Priority Score
    upvotes_count INT NOT NULL DEFAULT 1,
    is_master BOOLEAN NOT NULL DEFAULT true,
    
    -- Field Crew Assignment & SLA Oversight
    assigned_crew_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sla_deadline TIMESTAMPTZ NOT NULL,
    
    -- Fraud-Resistant Proof-of-Resolution Fields
    resolution_image_url TEXT,
    resolution_location GEOMETRY(Point, 4326),
    resolution_submitted_at TIMESTAMPTZ,
    supervisor_notes TEXT,
    verified_at TIMESTAMPTZ,
    reopen_window_closes_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Linked Tickets / Child Reports Table (For duplicate merges)
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

-- 7. Citizen Upvotes Association Table (Tracks Unique Upvoters)
CREATE TABLE IF NOT EXISTS complaint_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_complaint_user UNIQUE(complaint_id, citizen_id)
);

-- 8. Comprehensive Lifecycle Audit & Traceability Log
CREATE TABLE IF NOT EXISTS complaint_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    from_status complaint_status,
    to_status complaint_status,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Spatial & Operational Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON wards USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_complaints_resolution_loc ON complaints USING GIST (resolution_location);
CREATE INDEX IF NOT EXISTS idx_linked_tickets_parent ON linked_tickets (parent_ticket_id);
CREATE INDEX IF NOT EXISTS idx_linked_tickets_location ON linked_tickets USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_complaints_ward_status ON complaints (ward_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_crew_tasks ON complaints (assigned_crew_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_active ON complaints (sla_deadline) 
    WHERE status NOT IN ('RESOLVED', 'REJECTED');
CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_comp_id ON complaint_upvotes (complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_complaint_id ON complaint_audit_logs (complaint_id, created_at DESC);

-- 10. Proximity Deduplication Engine (20-Meter Radius Check + Similarity)
CREATE OR REPLACE FUNCTION check_duplicate_complaint(
    new_lat DOUBLE PRECISION,
    new_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 20.0
)
RETURNS TABLE (duplicate_id UUID, current_upvotes INT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.upvotes_count
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

-- 11. Automated Polygon Ward Assignment Trigger
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

-- 12. Automated SLA Deadline & Default Calculation
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

-- 13. Row Level Security (RLS) Policies
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public Read Access" ON complaints;
    CREATE POLICY "Public Read Access" ON complaints FOR SELECT TO authenticated, anon USING (true);

    DROP POLICY IF EXISTS "Public Read Linked Tickets" ON linked_tickets;
    CREATE POLICY "Public Read Linked Tickets" ON linked_tickets FOR SELECT TO authenticated, anon USING (true);

    DROP POLICY IF EXISTS "Citizen Submission Access" ON complaints;
    CREATE POLICY "Citizen Submission Access" ON complaints FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "Field Crew Submission Access" ON complaints;
    CREATE POLICY "Field Crew Submission Access" ON complaints FOR UPDATE TO authenticated 
    USING (assigned_crew_id = auth.uid() AND status = 'ASSIGNED')
    WITH CHECK (status = 'WORK_SUBMITTED');

    DROP POLICY IF EXISTS "Supervisor Ward Administration" ON complaints;
    CREATE POLICY "Supervisor Ward Administration" ON complaints FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'WARD_SUPERVISOR' AND profiles.ward_id = complaints.ward_id));

    DROP POLICY IF EXISTS "Commissioner Global Authority" ON complaints;
    CREATE POLICY "Commissioner Global Authority" ON complaints FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'MUNICIPAL_COMMISSIONER'));
END $$;
