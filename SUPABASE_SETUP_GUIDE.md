# 🚀 Supabase Complete Setup & Migration Guide for KATL Operations

This guide provides the exact steps and scripts to configure your database in Supabase and migrate all data with zero downtime.

---

## 📁 Generated Migration Files

1. **[supabase_schema.sql](file:///c:/Users/admin/Desktop/Website/KATL-operations/supabase_schema.sql)**:
   - Full PostgreSQL schema for all 15 operational tables.
   - Native `BOOLEAN`, `TIMESTAMPTZ`, and `JSONB` datatypes.
   - High-speed indexes on frequently queried columns (`assignee_user_id`, `planned_at`, `status`, etc.).
   - Full **Real-time broadcast replication** enabled on all primary tables.
   - Automatic setup of Storage buckets: `selfies` and `help-slip-audio`.
   - 45-day storage auto-cleanup function (`cleanup_old_storage_files`).

2. **[supabase_data_seed.sql](file:///c:/Users/admin/Desktop/Website/KATL-operations/supabase_data_seed.sql)**:
   - Complete data export extracted directly from your current active SQLite database.
   - **28 Users** (with roles, mobile numbers, PIN hashes, passwords).
   - **13 Designations** and **26 User Designations**.
   - **142 Checklist Definitions** (Master recurring task templates).
   - **143 Work Items & Score Events** (Active and completed shift items).
   - **29 Master List items**, **7 Holidays**, **4 Delegations**, **3 Help Slips**, **1 FMS Flow/Step**.

---

## 🛠️ Step-by-Step Execution Instructions

### Step 1: Create or Open Your Supabase Project
1. Log in to [supabase.com](https://supabase.com) and go to your dashboard.
2. Click **New Project** (or open your existing project).
3. Recommended Region: **ap-south-1 (Mumbai, India)** for lowest network latency.

---

### Step 2: Run the Schema Script in SQL Editor
1. In the Supabase Dashboard left menu, click **SQL Editor**.
2. Click **New query**.
3. Open and copy the entire contents of **[supabase_schema.sql](file:///c:/Users/admin/Desktop/Website/KATL-operations/supabase_schema.sql)**.
4. Paste into the SQL Editor and click **Run** (or `Ctrl + Enter`).
5. Verify that all 15 tables, indexes, realtime publications, and storage buckets are created successfully.

---

### Step 3: Run the Data Seed Script in SQL Editor
1. In the SQL Editor, click **New query**.
2. Open and copy the entire contents of **[supabase_data_seed.sql](file:///c:/Users/admin/Desktop/Website/KATL-operations/supabase_data_seed.sql)**.
3. Paste into the SQL Editor and click **Run**.
4. All 28 staff members, master checklists, work items, and configurations will be loaded.

---

### Step 4: Configure Storage Auto-Purge (45 Days)
To automatically delete check-in selfies and audio notes older than 45 days:
1. In Supabase Dashboard, go to **Database** -> **Extensions** and ensure `pg_cron` is enabled.
2. Run this quick query in SQL Editor:
```sql
SELECT cron.schedule(
    'cleanup-old-media-daily',
    '0 3 * * *', -- Runs every night at 3:00 AM
    'SELECT public.cleanup_old_storage_files()'
);
```

---

### Step 5: Connect KATL Operations App to Supabase

Add your Supabase credentials into your `.env` file in the project root:

```env
# Supabase Project Connection
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Database Direct Connection URL (From Supabase Project Settings -> Database)
DATABASE_URL=postgresql://postgres.your-project-id:your-db-password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 🔒 Authentication & Access Summary

- **Workers**: Continue logging in seamlessly with **Mobile Number + 4-Digit PIN**.
- **Owner & Mandate Holder**: Log in using **Username & Password / Role PIN**.
- **Backend**: Uses `SUPABASE_SERVICE_ROLE_KEY` or direct Postgres pooler (`DATABASE_URL`) to maintain existing custom business logic.
- **Frontend Real-time**: Connected directly via `@supabase/supabase-js` using `SUPABASE_ANON_KEY` to receive instant real-time card updates on task completions, help slips, and delegations without polling.
