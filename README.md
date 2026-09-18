# CivicPulse AI (Smart Civic CMS v2.0.0)
### Multi-Tier Municipal Complaint Redressal & Operational Governance Platform

CivicPulse AI is a cloud-decoupled, event-driven municipal governance platform engineered to eliminate civic triage bottlenecks, mass duplicate spam, and contractor fraud across four explicit operational tiers: **Citizen**, **Field Crew**, **Ward Supervisor**, and **Municipal Commissioner**.

---

## 🏛️ Four-Role Operational Governance Matrix

| Role | Target Viewport | Key Capabilities |
| :--- | :--- | :--- |
| **📱 Citizen** | Mobile PWA | 30s Zero-friction reporting, live camera guard (gallery blocked), GPS accuracy chip (`±4m`), **20m PostGIS spatial deduplication clustering**, permanent milestone tracking, and 48-hour resolution audit window. |
| **👷 Field Crew** | Mobile PWA | Proximity-ordered task queue, turn-by-turn navigation (Google Maps / OSM), **30m geofenced anti-fraud camera gate**, and timestamped on-site proof submission. |
| **🏢 Ward Supervisor** | Desktop / Tablet | 60/40 Split-screen GIS console (Leaflet + OpenStreetMap), polygon boundary triage, crew dispatch drawer with SLA binding, and **Dual-Photo Verification Gate (side-by-side Before/After + GPS delta offset)**. |
| **🏛️ Municipal Commissioner** | Command Center | City-wide choropleth macro heatmap, ward resolution velocity leaderboard, SLA breach monitoring, and **Contractor Penalty Audit Ledger** with automated financial deductions. |

---

## 🛰️ Geospatial Computation & Deduplication Engine

### 1. 20-Meter Proximity Deduplication (`check_duplicate_complaint`)
When a citizen initiates an issue submission, the backend evaluates the decimal coordinates against open incidents (`PENDING`, `ASSIGNED`, `WORK_SUBMITTED`) using geodetic PostGIS scanning:
```sql
ST_DWithin(
    c.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    20.0 -- 20 meters metric radius
)
```
- **If duplicate detected**: No duplicate ticket is created; the master ticket's `upvotes_count` is incremented by 1, and the citizen receives an instant slide-up notification with a direct link to the master incident.
- **If unique**: A new ticket is created and instantaneously routed.

### 2. Automated Ward Polygon Routing (`auto_assign_ward`)
Incoming coordinates are tested against municipal ward polygon boundaries using:
```sql
ST_Contains(wards.boundary, NEW.location)
```
Eliminates clerical sorting and immediately delivers tickets to the designated ward supervisor's map.

### 3. Anti-Fraud 30-Meter Geofence Guard
Field contractors can only submit resolution proof when physically present at the scene:
```sql
ST_Distance(c.location::geography, c.resolution_location::geography) <= 30.0 -- meters
```
Submissions exceeding 30 meters are rejected with an `INVALID_RESOLUTION_PROXIMITY` alert.

### 4. 48-Hour Citizen Resolution Audit Window
Upon supervisor approval, tickets enter a 48-hour countdown window with options to:
- **Confirm Fixed**: Permanently closes the ticket.
- **Dispute / Reopen**: Returns the ticket to `REOPENED` with citizen remarks for supervisor investigation.

---

## 🚀 Quick Start & Local Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Seamless Role Switching
Use the persistent header bar to instantly toggle between:
- 📱 `/citizen` — Citizen PWA
- 👷 `/crew` — Field Crew Task Queue
- 🏢 `/supervisor` — Ward Supervisor Command Board
- 🏛️ `/commissioner` — Executive Macro Governance

---

## 🗄️ Database Architecture (PostgreSQL 15+ & PostGIS)

The platform is designed to connect with Supabase or any standard PostgreSQL instance with PostGIS enabled:
- **`supabase/schema.sql`**: Full DDL, GiST spatial indexing, triggers (`auto_assign_ward`, `calculate_sla_deadline`), stored procedure (`check_duplicate_complaint`), and Row Level Security (RLS) policies.
- **`supabase/seed.sql`**: Pre-seeded municipal wards (polygons for Civil Lines, Mansarovar, Vaishali Nagar, and C-Scheme), profiles, and sample complaints across all lifecycle stages.

*(The application also includes an in-memory & local-storage reactive PostGIS simulation engine that works out-of-the-box immediately without requiring external database provisioning upfront).*
