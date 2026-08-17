# Database Analysis — KATL Operations

## Part 1: Current Database in Use

### We are using **SQLite** (via `better-sqlite3`)

| Property | Detail |
|---|---|
| **Library** | `better-sqlite3` v13.0.3 |
| **File location** | `data/katl_ops.db` (auto-created on server start) |
| **Mode** | WAL (Write-Ahead Logging) — high concurrency |
| **Foreign Keys** | Enabled |
| **Type** | Embedded, file-based, no separate server needed |

### How it works right now

The database file lives **locally on the machine running the server**.  
Every time you run `npx tsx src/server/index.ts`, it:
1. Creates the `data/` folder if it doesn't exist
2. Opens / creates `data/katl_ops.db`
3. Runs `CREATE TABLE IF NOT EXISTS ...` for all 14 tables
4. Seeds daily checklist items for all 26 staff

### Current Schema — 14 Tables

```
users                    → Staff profiles, roles, PIN hashes
designations             → Job titles (Accounts, Warehouse, etc.)
user_designations        → Many-to-many: user <-> designation
designation_capabilities → What each designation can do
work_items               → Daily tasks assigned to staff
score_events             → Scoring ledger (weight, done, on-time)
checklist_definitions    → Master list of 139 daily task templates
fms_flow_instances       → Active O2D / PUR / JS flows
fms_step_instances       → Individual step records in a flow
fms_deleted_repository   → Soft-deleted flow archive
help_slips               → Staff -> Manager questions
delegations              → Ad-hoc tasks from manager -> staff
master_lists             → Dropdown values (fabric types, etc.)
holidays                 → Holiday calendar
audit_logs               → Owner/Mandate audit records
queue_snapshots          → Bottleneck analysis snapshots
```

### 3 Performance Indexes

```sql
idx_work_items_assignee    -- (assignee_user_id, status)
idx_work_items_planned     -- (planned_at)
idx_score_events_user_week -- (user_id, week_start_date)
```

---

## Part 2: Should We Switch to Supabase?

### What is Supabase?

Supabase is a **hosted PostgreSQL database** with extras built on top:
- **PostgreSQL** (same SQL syntax, much more powerful than SQLite)
- **Realtime subscriptions** (WebSocket-based live data)
- **Auth** (user login, JWT, Row-Level Security)
- **Storage** (file uploads: selfies, audio help slips)
- **Edge Functions** (serverless backend logic)
- **Free tier** available (500MB database, 1GB file storage/month)

---

### Comparison: SQLite vs Supabase for KATL Ops

| Feature | SQLite (Current) | Supabase (PostgreSQL) |
|---|---|---|
| **Setup** | Zero setup, runs instantly | Requires project creation + env keys |
| **Works offline** | Yes — runs on local machine | No — needs internet |
| **Multi-device access** | Only on 1 machine | Accessible from any device/browser |
| **Real-time sync** | Polling only (8-10s delay) | True WebSocket push — instant |
| **Data safety** | File can be deleted/corrupted | Backups, point-in-time restore |
| **Scalability** | Breaks under heavy concurrent writes | Handles production load |
| **Selfie / Audio uploads** | Not implemented | Supabase Storage (built-in) |
| **Access from phone** | Only if server is always on | Always-on cloud database |
| **Cost** | Free | Free tier (generous limits) |
| **Migration effort** | — | Medium (~2-3 days) |

---

### Verdict

> [!IMPORTANT]
> **Yes — Supabase is an excellent fit for this project.**

#### Strong Reasons TO Switch

**1. True Real-time Updates**  
Right now, Owner/Mandate sees task completions after an 8-10 second polling delay. With Supabase Realtime, the card turns green **the instant** a worker taps "Mark Done" — no polling needed.

**2. Multi-device Access**  
Currently the entire app + database runs on **one Windows PC**. If that machine is off, nobody can log in. Supabase gives you a cloud database that is **always available** from any device on any network.

**3. File Storage for PRD Features**  
The PRD specifies selfie capture on login and audio help slips. These need proper file storage. **Supabase Storage** handles this natively — no third-party service needed.

**4. Row-Level Security (RLS)**  
Supabase can enforce at the database level that a `USER` can only query their own `work_items`. This is more secure than checking in the backend route.

**5. Deployment-Ready**  
When you deploy this app to any cloud host (Netlify, Cloud Run, Railway, etc.), SQLite will **not** work — cloud filesystems are ephemeral and reset on every deploy. Supabase solves this permanently.

---

#### What Would Need to Change

| Task | Effort |
|---|---|
| Replace `better-sqlite3` calls with Supabase client | Medium |
| Rewrite DB schema as Supabase SQL migrations | Medium |
| Replace `setInterval` polling with `supabase.channel()` realtime | Easy |
| Move auth to Supabase Auth OR keep our existing JWT | Medium |
| Upload audio/selfies to Supabase Storage | Easy |
| **Total estimated effort** | **~2-3 days** |

> [!NOTE]
> The current SQLite schema is already written in standard SQL — it is **fully PostgreSQL-compatible**. The table structures, indexes, and constraints can be copy-pasted directly into Supabase with minimal changes.

---

### Final Recommendation

```
Now (Development)  → Keep SQLite   — zero friction, fast iteration
Later (Go-Live)    → Migrate to Supabase — cloud, real-time, safe
```

> [!TIP]
> The smartest path: finish building the app with SQLite, then run the Supabase migration as a single dedicated effort right before you deploy for real staff use. Because the schema is PostgreSQL-compatible, this will be a straightforward 2-3 day migration.

---

*Generated: 2026-08-17 — KATL Operations Internal*
