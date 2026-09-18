-- CivicPulse AI / Smart Civic CMS - Seed Data
-- Sample Wards, User Profiles, Master Complaints, and Audit Logs

-- 1. Insert Sample Wards with GeoJSON Polygons (Jaipur Metro Reference Area)
-- Ward 14: Civil Lines (Central Zone)
INSERT INTO wards (id, name, zone, boundary) VALUES
(
    'WARD_14',
    'Ward 14 • Civil Lines',
    'Central Zone',
    ST_GeomFromText('POLYGON((75.775 26.900, 75.805 26.900, 75.805 26.925, 75.775 26.925, 75.775 26.900))', 4326)
) ON CONFLICT (id) DO NOTHING;

-- Ward 15: Mansarovar (South Zone)
INSERT INTO wards (id, name, zone, boundary) VALUES
(
    'WARD_15',
    'Ward 15 • Mansarovar',
    'South Zone',
    ST_GeomFromText('POLYGON((75.745 26.840, 75.785 26.840, 75.785 26.875, 75.745 26.875, 75.745 26.840))', 4326)
) ON CONFLICT (id) DO NOTHING;

-- Ward 16: Vaishali Nagar (West Zone)
INSERT INTO wards (id, name, zone, boundary) VALUES
(
    'WARD_16',
    'Ward 16 • Vaishali Nagar',
    'West Zone',
    ST_GeomFromText('POLYGON((75.720 26.890, 75.760 26.890, 75.760 26.930, 75.720 26.930, 75.720 26.890))', 4326)
) ON CONFLICT (id) DO NOTHING;

-- Ward 17: C-Scheme (Commercial Core)
INSERT INTO wards (id, name, zone, boundary) VALUES
(
    'WARD_17',
    'Ward 17 • C-Scheme',
    'Central Zone',
    ST_GeomFromText('POLYGON((75.795 26.905, 75.825 26.905, 75.825 26.935, 75.795 26.935, 75.795 26.905))', 4326)
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Profiles (Mock Auth Identifiers)
INSERT INTO profiles (id, full_name, phone, role, ward_id) VALUES
('22222222-2222-2222-2222-222222222222', 'Ramesh Kumar (Roads & Potholes)', '+91 98290 23456', 'FIELD_CREW', 'WARD_14'),
('22222222-2222-2222-2222-333333333333', 'Mohan Lal (Sanitation Crew)', '+91 98290 34567', 'FIELD_CREW', 'WARD_15'),
('33333333-3333-3333-3333-111111111111', 'Er. Anita Verma (Supervisor W-14)', '+91 98290 45678', 'WARD_SUPERVISOR', 'WARD_14'),
('33333333-3333-3333-3333-222222222222', 'Er. Suresh Gupta (Supervisor W-15)', '+91 98290 56789', 'WARD_SUPERVISOR', 'WARD_15'),
('44444444-4444-4444-4444-111111111111', 'Dr. Rajesh Meena, IAS (Commissioner)', '+91 98290 99999', 'MUNICIPAL_COMMISSIONER', NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Master Complaints Across Lifecycle
-- 3.1 PENDING
INSERT INTO complaints (
    id, citizen_id, title, description, category, status,
    location, address_text, ward_id, image_url, upvotes_count,
    sla_deadline, created_at
) VALUES (
    'c1111111-1111-1111-1111-111111111101',
    '11111111-1111-1111-1111-111111111111',
    'Deep crater pothole near Railway Crossing',
    'Dangerous pothole approximately 1.5ft deep on main corridor causing traffic crawl and two-wheeler skids.',
    'POTHOLE',
    'PENDING',
    ST_SetSRID(ST_MakePoint(75.789120, 26.912440), 4326),
    'Hawa Sadak near Railway Crossing, Civil Lines',
    'WARD_14',
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80',
    4,
    NOW() + INTERVAL '36 hours',
    NOW() - INTERVAL '12 hours'
) ON CONFLICT (id) DO NOTHING;

-- 3.2 ASSIGNED
INSERT INTO complaints (
    id, citizen_id, title, description, category, status,
    location, address_text, ward_id, image_url, upvotes_count,
    assigned_crew_id, supervisor_id, sla_deadline, created_at
) VALUES (
    'c1111111-1111-1111-1111-111111111102',
    '11111111-1111-1111-1111-111111111111',
    'Overflowing municipal garbage container',
    'Garbage spilled across pavement blocking pedestrian walkway and emitting foul odor outside public park.',
    'GARBAGE',
    'ASSIGNED',
    ST_SetSRID(ST_MakePoint(75.765400, 26.858200), 4326),
    'Sector 3 Circle, Mansarovar',
    'WARD_15',
    'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&q=80',
    2,
    '22222222-2222-2222-2222-333333333333',
    '33333333-3333-3333-3333-222222222222',
    NOW() + INTERVAL '14 hours',
    NOW() - INTERVAL '10 hours'
) ON CONFLICT (id) DO NOTHING;

-- 3.3 WORK_SUBMITTED (Ready for Supervisor Dual-Photo Gate Verification)
INSERT INTO complaints (
    id, citizen_id, title, description, category, status,
    location, address_text, ward_id, image_url, upvotes_count,
    assigned_crew_id, supervisor_id,
    resolution_image_url, resolution_location, resolution_submitted_at,
    sla_deadline, created_at
) VALUES (
    'c1111111-1111-1111-1111-111111111103',
    '11111111-1111-1111-1111-111111111111',
    'Non-functioning high-mast streetlight pole',
    '3 lights completely unlit for past 4 nights creating dark unsafe zone for evening pedestrians.',
    'STREETLIGHT',
    'WORK_SUBMITTED',
    ST_SetSRID(ST_MakePoint(75.742010, 26.911020), 4326),
    'Queen''s Road, Vaishali Nagar',
    'WARD_16',
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&q=80',
    3,
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-111111111111',
    'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&q=80',
    ST_SetSRID(ST_MakePoint(75.742018, 26.911025), 4326),
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '28 hours',
    NOW() - INTERVAL '20 hours'
) ON CONFLICT (id) DO NOTHING;

-- 3.4 RESOLVED (Active 48-Hour Citizen Audit Window)
INSERT INTO complaints (
    id, citizen_id, title, description, category, status,
    location, address_text, ward_id, image_url, upvotes_count,
    assigned_crew_id, supervisor_id,
    resolution_image_url, resolution_location, resolution_submitted_at,
    supervisor_notes, verified_at, reopen_window_closes_at,
    sla_deadline, created_at
) VALUES (
    'c1111111-1111-1111-1111-111111111104',
    '11111111-1111-1111-1111-111111111111',
    'Potable water pipeline rupture on service lane',
    'Fresh drinking water gushing onto the road causing water loss and low pressure in nearby residences.',
    'WATER_LEAK',
    'RESOLVED',
    ST_SetSRID(ST_MakePoint(75.792500, 26.915000), 4326),
    'Near Tonk Phatak underpass, Ward 14',
    'WARD_14',
    'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&q=80',
    7,
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-111111111111',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
    ST_SetSRID(ST_MakePoint(75.792505, 26.915004), 4326),
    NOW() - INTERVAL '6 hours',
    'Verified repair quality on site. Pipeline clamped and asphalt resurfaced.',
    NOW() - INTERVAL '4 hours',
    NOW() + INTERVAL '44 hours',
    NOW() + INTERVAL '18 hours',
    NOW() - INTERVAL '30 hours'
) ON CONFLICT (id) DO NOTHING;

-- 3.5 ESCALATED (Breached SLA Deadline)
INSERT INTO complaints (
    id, citizen_id, title, description, category, status,
    location, address_text, ward_id, image_url, upvotes_count,
    sla_deadline, created_at
) VALUES (
    'c1111111-1111-1111-1111-111111111105',
    '11111111-1111-1111-1111-111111111111',
    'Collapsed drain slab on pedestrian footpath',
    'Hazardous open hole 6 feet deep where concrete slab caved in. Pedestrians at severe risk.',
    'OTHER',
    'ESCALATED',
    ST_SetSRID(ST_MakePoint(75.811200, 26.918400), 4326),
    'MI Road Commercial Walkway, C-Scheme',
    'WARD_17',
    'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?w=800&q=80',
    12,
    NOW() - INTERVAL '8 hours',
    NOW() - INTERVAL '56 hours'
) ON CONFLICT (id) DO NOTHING;
