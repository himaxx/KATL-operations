# Supabase Database Setup & Migration Questionnaire & Action Plan

This document outlines everything needed to configure, migrate, and optimize the KATL Operations database on Supabase (PostgreSQL).

Please answer the questions in the sections below (or confirm the proposed defaults). Once answered, we will generate the complete PostgreSQL migration script, configure authentication/RLS, storage buckets, and migrate existing seed data.

---

## 1. Supabase Project Credentials & Environment

| # | Question | Your Answer / Options |
|---|---|---|
| **1.1** | Do you already have a Supabase project created, or do you want us to create one / provide SQL scripts for you to run in the Supabase Dashboard SQL Editor? | `[ ] Already created / [ ] Provide SQL scripts / [ ] Setup via CLI/MCP` |
| **1.2** | If already created, what are your Project URL and service credentials? *(Do NOT share secret keys in public; you can keep `.env` local)* | `SUPABASE_URL=`<br>`SUPABASE_ANON_KEY=`<br>`SUPABASE_SERVICE_ROLE_KEY=` |
| **1.3** | Which hosting region did you pick or prefer for Supabase? (e.g., `ap-south-1` Mumbai is best for low latency in India). | `[ ] ap-south-1 (Mumbai) / [ ] Other:` |

---

## 2. Authentication & User Model Integration

In KATL Operations, workers currently log in using **Mobile Number + 4-Digit PIN** or **Password / Role PINs** (`OWNER`, `MANDATE_HOLDER`, `USER`).

| # | Question | Your Answer / Options |
|---|---|---|
| **2.1** | **Auth Strategy**: How would you like user logins to work in Supabase? | **Option A (Recommended)**: Keep custom Express backend handling Mobile + PIN authentication, using Supabase PostgreSQL via connection pool / Service Key.<br>**Option B**: Use Supabase Auth (GoTrue) phone OTP / email logins.<br>**Option C**: Hybrid (Custom PIN verify + Supabase JWT generation).<br>*(Select: A / B / C)* |
| **2.2** | **Row Level Security (RLS)**: Should RLS policies be enabled on PostgreSQL tables right away, or should Express server handle role authorization initially with `service_role`? | **Option A (Recommended)**: Express backend enforces roles with full DB access, then enable RLS progressively.<br>**Option B**: Strict RLS from Day 1 on all tables using Supabase JWT claims.<br>*(Select: A / B)* |
| **2.3** | **Default Seed Users**: Should we migrate the existing 26 staff members (with their hashed PINs, roles, designations, and phone numbers from `src/server/seed.ts` and `user_list.csv`) into the Supabase database? | `[ ] Yes, migrate all 26 users and designations / [ ] No, start clean` |

---

## 3. Storage Buckets (Selfies & Audio Files)

The app supports **Selfie Verification** on shift start and **Audio Help Slips** (`audio_url`, `selfie_url`).

| # | Question | Your Answer / Options |
|---|---|---|
| **3.1** | **Selfie Bucket**: Should we create a public or private Supabase Storage bucket named `selfies` for staff check-in photos? | `[ ] Public bucket (fast direct image loading) / [ ] Private bucket (signed URLs)` |
| **3.2** | **Audio Help Slips Bucket**: Should we create a bucket named `help-slip-audio` for recorded voice notes? | `[ ] Public / [ ] Private with signed URLs (Max file size: 10MB)` |
| **3.3** | **File Retention Policy**: Do you want auto-cleanup of old audio/selfies after a certain period (e.g. 90 days), or keep forever? | `[ ] Keep forever / [ ] Auto-archive after 90 days` |

---

## 4. Real-time Subscriptions & Live Triggers

Supabase Realtime uses PostgreSQL replication to push changes instantly over WebSockets.

| # | Question | Your Answer / Options |
|---|---|---|
| **4.1** | **Real-time Tables**: Which tables should have Real-time Broadcast enabled? | `[x] work_items` (Instant task completion green card for Mandate/Owner)<br>`[x] help_slips` (Instant notification when worker asks / manager answers)<br>`[x] delegations` (Instant update on manager delegations)<br>`[x] fms_step_instances` (Instant flow progress update)<br>`[ ] All tables` |
| **4.2** | **Live Score Calculation**: When a `work_items` row is marked `DONE`, should the `score_events` update via a PostgreSQL Trigger directly in Supabase or continue via Express backend service? | **Option A (Recommended)**: Keep business logic in TypeScript backend service for consistency.<br>**Option B**: PostgreSQL Trigger in Supabase DB for instant atomic execution.<br>*(Select: A / B)* |

---

## 5. PostgreSQL Schema & Data Types Mapping

SQLite uses dynamic typing and stores booleans as `0/1` and timestamps as `TEXT` ISO strings. In Supabase (Postgres), we can upgrade them to native types.

| # | Question | Your Answer / Options |
|---|---|---|
| **5.1** | **Boolean Columns**: Convert SQLite `INTEGER DEFAULT 0` (e.g. `is_active`, `is_important`, `is_done`, `is_on_time`, `is_compliance`) to native PostgreSQL `BOOLEAN DEFAULT FALSE`? | `[ ] Yes (Recommended for clean PostgreSQL schema) / [ ] Keep as SMALLINT/INTEGER (Easiest direct compatibility with current TS types)` |
| **5.2** | **Timestamps**: Convert `TEXT` ISO strings (e.g. `planned_at`, `completed_at`, `created_at`) to native `TIMESTAMPTZ`? | `[ ] Yes, use TIMESTAMPTZ with DEFAULT NOW() (Recommended) / [ ] Keep as TEXT` |
| **5.3** | **JSON Fields**: Convert `TEXT` JSON fields (`all_form_data`, `form_data`, `questions_json`, `extra_json`, `full_snapshot_json`) to native PostgreSQL `JSONB`? | `[ ] Yes, use JSONB with GIN indexing capability (Recommended) / [ ] Keep as TEXT` |
| **5.4** | **UUIDs vs String IDs**: Existing IDs are strings like `u_01`, `wi_123`, `flow_...`. Should we keep `TEXT` primary keys so current ID generator logic continues to work without disruption? | `[ ] Yes, keep TEXT primary keys (Recommended to avoid breaking frontend/backend ID patterns) / [ ] Migrate to UUID` |

---

## 6. Data Migration & Seeding Plan

| # | Question | Your Answer / Options |
|---|---|---|
| **6.1** | **Checklist Definitions**: Should all 139 standard daily/periodic checklist master task templates be seeded into Supabase immediately? | `[ ] Yes, seed all 139 definitions / [ ] No` |
| **6.2** | **Existing Live Data**: Do you have active production tasks/data in `data/katl_ops.db` that must be extracted and migrated, or should we seed fresh baseline master data? | `[ ] Fresh seed of users, designations, master lists, holidays & checklist definitions / [ ] Export all rows from local katl_ops.db and import to Supabase` |

---

## 7. Migration Execution Steps (Summary)

Once you provide your preferences:
1. **Generate `supabase_schema.sql`**: Complete PostgreSQL DDL with all 15 tables, indexes, enums, triggers, and foreign keys.
2. **Generate `supabase_seed.sql`**: SQL data seed script for users, designations, capabilities, checklist templates, master lists, and holidays.
3. **Configure Storage**: Setup SQL commands to create storage buckets (`selfies`, `help-slip-audio`) with proper access policies.
4. **Backend DB Client Migration**: Update backend database connector (`src/server/db/`) to connect to Supabase PostgreSQL (via `@supabase/supabase-js` or `pg` / `postgres.js`).
5. **Real-time Integration**: Wire up frontend WebSocket listeners for instant task updates.

---

### How to Proceed:
You can simply reply with your choices (e.g. *"Go with all recommended defaults, Project in ap-south-1, migrate seed data from local"*), or fill in specific preferences!
