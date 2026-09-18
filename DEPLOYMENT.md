# CivicPulse AI / Smart Civic CMS v2.0 - Production Launch & Deployment Guide

This guide walks you through deploying **CivicPulse AI (Smart Civic CMS)** to production across **GitHub**, **Supabase**, **Vercel**, and **Render**.

---

## Architecture Topology

```
                  +----------------------------------------------+
                  |                 GitHub Repo                  |
                  |     (CI/CD Pipeline via GitHub Actions)      |
                  +--------------+---------------+---------------+
                                 |               |
               +-----------------+               +-----------------+
               |                                                   |
               v                                                   v
+-----------------------------+                     +-----------------------------+
|           Vercel            |                     |           Render            |
| (Next.js 15 Edge Frontend & |                     | (Web Service / Docker Host) |
|      Serverless APIs)       |                     |  Auto-synced from Blueprint |
+--------------+--------------+                     +--------------+--------------+
               |                                                   |
               +-----------------------+---------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     |          Supabase Cloud           |
                     |  * PostgreSQL 15+ with PostGIS    |
                     |  * 4x Deno Edge Functions         |
                     |  * S3 Media & Proof Buckets       |
                     |  * WebSocket Realtime Replication |
                     +-----------------------------------+
```

---

## 1. GitHub Setup & CI/CD Pipeline

The repository includes a ready-to-run GitHub Actions workflow at [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml) that executes linting, TypeScript checking, and `next build` on every push or pull request.

### Step-by-Step GitHub Publish:
1. Initialize/Check your local git repository:
   ```bash
   git add .
   git commit -m "feat: complete production deployment configurations for Vercel, Supabase & Render"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g. `smart-civic-cms`).
3. Set your remote and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/smart-civic-cms.git
   git push -u origin main
   ```
4. Verify on GitHub: Navigate to the **Actions** tab in your GitHub repository to see the automated CI build pass.

---

## 2. Supabase Cloud Setup (Database, Storage & Edge Functions)

### Option A: Via Supabase Dashboard (Fastest — 3 minutes)
1. Log in to [Supabase](https://supabase.com/dashboard) and click **New Project**.
2. Note your **Project URL**, **anon key**, and **service_role key** from **Project Settings > API**.
3. Go to **SQL Editor > New Query**:
   - Copy and paste the contents of [`supabase/migrations/20250101000000_init_civic_schema.sql`](file:///supabase/migrations/20250101000000_init_civic_schema.sql).
   - Click **Run**.
4. (Optional) Run [`supabase/seed.sql`](file:///supabase/seed.sql) to populate initial sample wards (Civil Lines, Mansarovar, Vaishali Nagar, C-Scheme) and tickets.
5. Go to **Storage**:
   - Create bucket `complaint-media` (Public, 25MB limit).
   - Create bucket `resolution-proofs` (Public, 25MB limit).
6. Go to **Database > Replication**:
   - Enable replication for `complaints` and `complaint_audit_logs` to activate live multi-tier WebSocket updates.

### Option B: Via Supabase CLI (Automated)
```bash
# 1. Login to Supabase CLI
supabase login

# 2. Link your remote Supabase project
supabase link --project-ref <your-project-ref>

# 3. Push schema & migrations
supabase db push

# 4. Deploy the 4 Serverless Edge Functions
supabase functions deploy intake-webhook
supabase functions deploy crew-submit-resolution
supabase functions deploy supervisor-assign
supabase functions deploy supervisor-approve-resolution
```

---

## 3. Vercel Deployment (Primary Frontend Hosting)

The project includes pre-configured [`vercel.json`](file:///vercel.json) and standalone [`next.config.ts`](file:///next.config.ts) with strict security headers and image optimization.

### Step-by-Step Vercel Deploy:
1. Go to [Vercel Dashboard](https://vercel.com/new) and click **Add New Project**.
2. Select your GitHub repository `smart-civic-cms` and click **Import**.
3. Framework Preset will auto-detect **Next.js**.
4. Expand **Environment Variables** and add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project>.supabase.co` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Public Anon Key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Supabase Service Role Key |
5. Click **Deploy**.
6. Once deployed, test the diagnostic health probe at:
   `https://<your-vercel-domain>.vercel.app/api/health`

---

## 4. Render Deployment (Web Service / Docker Host)

The repository includes both a **Render Blueprint** ([`render.yaml`](file:///render.yaml)) and an optimized multi-stage container ([`Dockerfile`](file:///Dockerfile)).

### Method 1: Using Render Blueprint (Zero-Config)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Blueprint**.
2. Connect your GitHub repository `smart-civic-cms`.
3. Render will read [`render.yaml`](file:///render.yaml) and automatically configure:
   - **Service Type**: Web Service (Node.js)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Fill in the environment variable prompts for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
5. Click **Apply**.

### Method 2: Using Docker on Render
1. In Render Dashboard, click **New > Web Service**.
2. Select your repository and choose **Docker** as the Environment.
3. Render will automatically build using [`Dockerfile`](file:///Dockerfile).
4. Set the environment variables in the **Environment** tab.

---

## 5. Environment Variables Reference

| Variable Name | Required? | Purpose | Where to obtain |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional* | Supabase PostgreSQL REST & WebSocket endpoint | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional* | Client-side public key for browser subscriptions | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional* | Server-side elevated key for edge functions & admin ops | Supabase Dashboard > Settings > API |

*\*Note: The application has built-in zero-lock-in fallback. If Supabase keys are omitted, it operates seamlessly on its embedded local PostGIS reactive engine.*

---

## 6. Post-Launch Verification Checklist

- [ ] **Health Check**: Visit `/api/health` and verify `status: "healthy"`.
- [ ] **Citizen Portal**: Lodge a test report at `/` or `/citizen` and test geolocation capture.
- [ ] **Field Crew Queue**: Open `/crew` and verify task distance sorting and 30m geofenced photo submission.
- [ ] **Supervisor Console**: Open `/supervisor` and test Leaflet ward polygon boundary rendering, crew dispatch, and dual-photo inspection.
- [ ] **Commissioner Dashboard**: Open `/commissioner` and verify KPI metrics strip, contractor penalty ledger, and ward velocity ranking.
- [ ] **Realtime Sync**: Open citizen portal and supervisor console in two separate browser windows to test real-time complaint updates.
