# PRD — Ketan Aditya Ops

**Internal operations platform for Ketan Aditya Textiles**
Version 2.0 · Phase 1 build specification
Audience: the engineer/agent implementing this (Claude Code). Written to be built from directly.

---

## 0. How to read this document

Sections 1–16 are **Phase 1**. Build exactly that.
Sections 17–19 describe Phases 2–5. **Do not build them.** They are documented so that no decision made now quietly blocks them later.

### The four laws

These override every other instruction in this document. If any implementation choice conflicts with one of these, the law wins.

**Law 1 — Module isolation.**
Adding or changing any system must never require editing the framework, the scoring engine, or any other system. If a change to System A can break System B, the design is wrong and must be reworked.

**Law 2 — Universal Plan vs Actual.**
*Every* unit of work in *every* system — now and in all future phases — records **when it was planned**, **when it became available**, and **when it actually happened**. No exceptions, ever. This is not for scoring. It is the raw material for bottleneck analysis (Section 6). A system that does not record plan-vs-actual is invisible to the bottleneck engine, and an invisible system breaks the entire management method.

**Law 3 — Scoring is untouchable.**
No system may contain scoring logic, and the scoring engine may not contain a single reference to any specific system. Systems feed scoring through one interface only. Phase 5 must be addable without one line changing in the scoring engine.

**Law 4 — The users are blue-collar staff on cheap phones.**
Many have not finished 10th grade. Many have low-end Android phones on poor networks. Simple words, large targets, few screens, small payloads. Every design decision defers to this.

---

## 1. Context

Ketan Aditya Textiles currently runs its operations on Google Sheets fed by Google Forms. The logic is sound and battle-tested — it is reproduced faithfully in this spec — but the people it is built for cannot use it. The shop-floor, warehouse and production team have only phones, often low-end. Google Sheets and Looker Studio are too slow to load and too complex to read on a small screen. The result is a well-designed system that goes unused by the people who need it most.

This app replaces those sheets with a phone-first web application.

The wider programme is an "autopilot for the business": **3 pillars containing 11 systems**, rolled out in **5 phases, roughly one week each**. Phase 1 builds the foundation and the two engines that most of the 11 systems run on.

| | |
|---|---|
| Users at launch | 30–40 |
| Design headroom | 500, with no redesign |
| Access | Web only. No native app. Users "Add to Home Screen". |
| Languages | English · हिंदी (Devanagari) · Hindi (Roman) |
| Live volume today | ~160–170 orders and ~20–30 purchase orders in flight at any moment |

### Phase 1 scope

1. Authentication, users, designations
2. Working-time engine
3. **Universal work record** (plan vs actual) — the substrate everything writes to
4. Scoring engine ("MIS Scoring") and its reports
5. Checklist system
6. FMS framework + 10–12 individual FMS modules
7. Help Slip
8. Delegation Sheet
9. Three role-shaped interfaces

Nothing else.

---

## 2. Infrastructure

| Item | Value |
|---|---|
| Server | Hostinger VPS, plan **KVM 2** — 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB bandwidth |
| Host name | `srv1205187.hstgr.cloud` |
| Access | **SSH key only.** Password login and root login disabled. |
| Domain | A **subdomain** of a domain the client already owns, e.g. `ops.<domain>`. The root domain hosts an existing site — **it must not be touched**. |
| SSL | Let's Encrypt, auto-renew |
| Reverse proxy | Nginx |
| Process manager | PM2, restart on boot |
| Timezone | **Asia/Kolkata (IST)** — server, database, and application. No UTC storage ambiguity: store `timestamptz`, render IST. |
| Code | Private GitHub repository owned by the client |

### Stack

- **Backend:** Node.js LTS · TypeScript · Fastify
- **Database:** PostgreSQL 16
- **Migrations:** Prisma — reversible, committed, never hand-edited on the server
- **Frontend:** React · TypeScript · Vite — built as a PWA (manifest + icons, so "Add to Home Screen" behaves like an app)
- **Images:** `sharp`
- **Scheduled jobs:** `node-cron` in the API process
- **Auth:** JWT in an httpOnly cookie

TypeScript is mandatory. FMS definitions are typed objects, so a malformed flow fails at build time rather than in production at 11pm.

### No offline mode — deliberate

The app requires a live connection. Partial offline sync on low-end phones produces disputes ("I did it, it didn't sync") that are impossible to adjudicate. If there is no connection, show a clear message and accept nothing. **Never** show a submission as successful until the server has confirmed it.

### Deployment updates

Users bookmark a URL; they never install anything. A deployment is live for everyone on their next page load. Cache-bust on every build (hashed asset filenames, `no-cache` on `index.html`) so nobody is ever served a stale version.

---

## 3. Users, permissions, designations

### 3.1 Exactly three permission levels

More levels would mean more interfaces to design and maintain. This is a deliberate ceiling.

| Level | Can do |
|---|---|
| `OWNER` | Everything. **Only** role that can delete records, view the deleted-record repository, and take financial decisions. |
| `MANDATE_HOLDER` | Everything an Owner can do **except** deletion, the deleted repository, and financial decisions. Creates designations, assigns designations and people, creates checklist work, resets PINs, settles orders, overrides missed work, answers Help Slips. |
| `USER` | Own work, own scores, own systems. Raises Help Slips. |

### 3.2 Designations

A designation is a job role — Warehouse Staff, Production Executive, Order Data Executive, Process Coordinator, Executive Assistant, MIS Executive, Salesman, and so on.

- **Mandate Holders create designations inside the app.** No fixed list in code.
- Creating one shows a confirmation: *"Are you sure you want to create this designation? Please check the spelling."* Names stay editable afterwards.
- A user may hold **several** designations, and belong to several systems at once.
- Designations drive: automatic checklist assignment, and which capability blocks appear.

### 3.3 Capabilities

Extra functionality is switched on **per designation**, through a `designation_capabilities` table — configuration, never hardcoded logic. Adding a capability to a designation must never require a code change.

| Capability | Default designation | What it unlocks |
|---|---|---|
| `DELAY_DASHBOARD` | Process Coordinator | Every late task company-wide, with one-tap WhatsApp and Call |
| `AUDIT` | Process Coordinator | Daily random verification sample |
| `DELEGATION_SHEET` | Executive Assistant | Assign one-off work, approve/deny change requests |
| `VIDEO_BACKLOG` | MIS Executive | Checklist tasks lacking a training video, system health |
| `IMPORTANT_MISS_ALERT` | Executive Assistant | Receives the missed-important alert (Owner and Mandate Holders always receive it) |

---

## 4. Authentication

### 4.1 Signup

Fields: **name · mobile number · selfie (compulsory) · PIN (4–6 digits) · confirm PIN**.

The selfie is compulsory because two staff may share a name — a Mandate Holder assigning work must see a face.

**There is no approval step.** The account is created immediately. This is safe because:

> **A user with no designation can read nothing.** No tasks, no scores, no systems, no names, no company data of any kind. They see only: *"Your account is ready. Ask your manager to set up your work."*

Assigning a designation is what activates an account. That is the security boundary — enforce it server-side on every endpoint, not in the UI.

### 4.2 Login

- Mobile number + PIN.
- PINs hashed with **bcrypt, cost ≥ 12**. Never stored, logged, or transmitted in plain text. Not recoverable by anyone, including the Owner.
- Rate limit: 5 failures per mobile per 15 minutes, then a 15-minute lock.

### 4.3 Forgot PIN

No SMS, no OTP, no email — evaluated and rejected. (Minimum SMS purchase is ~5,000 messages for ~₹1,250, uneconomic at this scale; SIM-swap risk is real; and an internal system benefits from a human in the loop.)

Flow: user taps "Forgot PIN" → request surfaces to Owner/Mandate Holders → they tap **Reset PIN** → system generates a random 4-digit temporary PIN, shown **once on screen** → passed to the person directly or on WhatsApp.

The temporary PIN is **single-use** and expires in **24 hours**. On login with it, the user must set a new permanent PIN before reaching any other screen.

### 4.4 Session

JWT in an httpOnly, Secure, SameSite=Lax cookie.

**Sessions expire at 04:00 IST each working day.** Nobody is logged out mid-shift; everyone starts the day fresh. Closing the browser does not log a user out.

---

## 5. Working-time engine

Every deadline in this system is measured in **working hours**, never calendar hours. Used by the checklist, every FMS, the scoring engine, and later the bottleneck engine. Build it first, test it hardest.

### 5.1 Rules

- **Working days:** Monday – Saturday. **Sunday is always non-working.**
- **Working hours:** 10:00 – 19:00 IST → **9 working hours per day**.
- **Holidays:** admin-managed date list; those dates are non-working. Sundays need not be listed.
- All of the above are **rows in `settings` / `holidays`**, not constants in code.

### 5.2 Required functions

```ts
addWorkingTime(start: DateTime, hours: number): DateTime
```
Adds working hours, skipping non-working time. If `start` is outside working hours, the clock begins at the next working-period start.
*Example: created 18:00 Saturday, TAT 3h → resumes Monday 10:00 → planned Monday 13:00.*

```ts
workingHoursBetween(a: DateTime, b: DateTime): number
```
Working hours elapsed between two moments. Used for delay and for queue-wait measurement.

```ts
nextWorkingDay(d: Date): Date
```
Sunday or holiday → next working day.

```ts
isWorkingTime(t: DateTime): boolean
```

Write exhaustive unit tests: across a Sunday, across a holiday, starting before opening, starting after closing, spanning multiple weeks, zero-hour TAT.

### 5.3 TAT units

| Kind | Meaning |
|---|---|
| `ANYTIME` | No deadline (typically step 1 of an FMS) |
| `FIXED_HOURS` | Working hours |
| `FIXED_DAYS` | Working days × 9 hours |
| `DYNAMIC` | Read from a numeric answer in an **earlier step of the same flow** |

`DYNAMIC` is essential, not a nicety. A vendor promising 3 days and one promising 15 days cannot share a TAT. The client's live sheet proves the pattern: `Lead Time = 20` days → `Lead Time in Hrs = 180` — confirming 9 working hours per day.

---

## 6. The Universal Work Record — and why it exists

> **This section implements Law 2. It is the most consequential design decision in the build.**

### 6.1 One table for all work

Every unit of work in the entire platform — a checklist item, an FMS step, a delegated task, and every future system in Phases 2–5 — is a row in **one** table: `work_items`.

The homepage, the scoring engine, the delay dashboard, the audit sampler, and (in Phase 4) the bottleneck engine read **only** this table. A future system that writes rows in this shape inherits all of that behaviour for free, with zero changes to any existing code.

This is what makes Law 1 and Law 3 physically true rather than aspirational.

### 6.2 The four timestamps — mandatory on every row

Every row records four moments. **None may ever be null in a shipped system.**

| Field | Meaning | Why it matters |
|---|---|---|
| `available_from` | The moment this work entered the queue and became actionable | Start of the waiting line. **Without this, bottleneck analysis is impossible.** |
| `planned_at` | The moment it was due, computed via the working-time engine | Drives on-time scoring and expected throughput |
| `first_opened_at` | The first time the assignee opened it | Separates *"never saw it"* from *"saw it and sat on it"* — different problems, different fixes |
| `completed_at` | The moment it was actually submitted | Actual |

Two derived measures, computed in working hours, are stored on completion:

- **`queue_wait_hours`** = `workingHoursBetween(available_from, completed_at)` — total time this work spent in the system.
- **`delay_hours`** = `workingHoursBetween(planned_at, completed_at)`, negative if early.

### 6.3 Bottleneck foundation (Phase 4 reads this; Phase 1 records it)

The company's method, from Theory of Constraints:

> **Wherever the waiting line is longest, the bottleneck is the step immediately in front of or behind it.**

Work piles up *before* a constrained resource, and starves *after* it. To find that, Phase 4 needs to answer, for any step of any system, at any past moment: **how many items were waiting here, and for how long?**

Everything needed is derivable from `work_items` alone:

```
queue length at step S at time T
  = count of work_items where step = S
      and available_from <= T
      and (completed_at is null or completed_at > T)
```

To keep that fast over months of history, a nightly job writes:

```
queue_snapshots
  snapshot_at, source_module, fms_code, step_no, designation_id,
  items_waiting, oldest_item_wait_hours, avg_wait_hours
```

**Build `queue_snapshots` and the nightly job in Phase 1**, even though nothing reads it yet. It is cheap now and irreplaceable later — history cannot be reconstructed after the fact.

### 6.4 Schema

```sql
work_items
  id
  source_module        -- 'checklist' | 'fms' | 'delegation'  (extensible, never switched on)
  source_ref_id
  fms_code             -- nullable; e.g. 'O2D'
  step_no              -- nullable; FMS step number
  assignee_user_id     -- ALWAYS a specific person. Never a designation.
  title_en, title_hi
  is_important         -- true → weight 3, false → weight 1
  available_from       -- REQUIRED
  planned_at           -- REQUIRED
  first_opened_at      -- set on first open
  completed_at
  completed_by         -- may differ from assignee (Mandate Holder override)
  queue_wait_hours     -- computed on completion
  delay_hours          -- computed on completion
  status               -- OPEN | DONE | MISSED | FLAGGED_FALSE
  locked_at            -- checklist only
  created_at
```

**Rules, enforced in code review:**

1. `assignee_user_id` is always a named person. Nothing is ever assigned to a designation. Checklist definitions target a designation, but each *generated row* names one person.
2. `available_from` and `planned_at` are never null.
3. No system writes to `work_items` directly — all writes go through a single `WorkItemService`, so the invariants above are enforced in one place.

---

## 7. Scoring engine — "MIS Scoring"

> The company's operating principle: **what gets measured gets done; what is not measured never gets done.** This engine is the backbone of the management method. It must be exact, and it must never need to change again.

### 7.1 Two scores, always shown together

1. **Work Done** — did it happen at all?
2. **Work On Time** — did it happen by its planned time?

A person can score `0%` on Work Done and `−50%` on Work On Time: everything got done, half of it late. Both numbers are always displayed together — one without the other is misleading.

### 7.2 Formulas

```
weighted_due      = Σ weight                        over work counted in the period
weighted_done     = Σ weight where is_done
weighted_on_time  = Σ weight where is_on_time

done_pct     = weighted_done    / weighted_due × 100
on_time_pct  = weighted_on_time / weighted_due × 100

DISPLAY Work Done    = −round(100 − done_pct)     followed by "%"
DISPLAY Work On Time = −round(100 − on_time_pct)  followed by "%"
```

**Every score in this application is displayed as a negative number with a `%` sign.**

`0%` is perfect. `−26%` reads as *"26% of your work was not finished."*

This is not cosmetic. Staff read "80%" as a good result, when it means a fifth of the work did not happen. **Never render a positive score anywhere in the app** — not in reports, not in exports, not in the owner's dashboard.

**Weights:** `is_important = true → 3`, otherwise `1`. Applies identically to checklist items, FMS steps and delegated work.

**A person with no work in a period scores `0%` on both.** Never "N/A", never a penalty. They were given nothing; they failed at nothing.

### 7.3 Week definition

- A week runs **Monday 00:00 → Saturday 23:59:59 IST**. Sunday belongs to no week.
- Work belongs to the week containing its **`planned_at`** — never the week it was completed in. Work planned for Friday and completed the next Monday still scores against the Friday week, as done-late.
- Work counts toward the current week only once **`planned_at` has passed**. Work due later this week does not drag today's score down.

Periods are always defined in **whole weeks, never calendar dates**, so year-on-year comparison stays valid:

| Shown to user | Meaning |
|---|---|
| **This week** (default) | Current Monday–Saturday |
| Last quarter | Previous **13** completed weeks |
| Last 6 months | Previous **26** completed weeks |
| Last year | Previous **52** completed weeks |

On Monday, Owner and Mandate Holders review the **previous Monday–Saturday** block — not a rolling last-7-days.

### 7.4 State transitions

| Event | `is_done` | `is_on_time` |
|---|---|---|
| Completed on or before `planned_at` | ✅ true | ✅ true |
| Completed after `planned_at` | ✅ true | ❌ **false** |
| Checklist item not done, locked 19:30 | ❌ false | ❌ false |
| FMS step overdue, still open | ❌ false *(until done)* | ❌ **false, permanently** |
| Mandate Holder marks a missed item done later | ✅ true | ❌ false |
| Process Coordinator flags a completed item **FALSE** | ❌ **reverted to false** | ❌ false |

**An FMS step that passes its planned time can never regain on-time credit**, even when eventually completed. Intentional and non-negotiable.

### 7.5 `score_events`

```sql
score_events
  id, user_id, work_item_id,
  week_start_date,     -- Monday of the week containing work_items.planned_at
  weight,              -- 3 or 1
  is_done, is_on_time,
  updated_at
```

One row per work item, inserted when the item is created and updated on completion, lock, override, or audit flag. **Never deleted** — history must remain reconstructible.

### 7.6 The "Not Done" list

Inside the Score section, beneath the scores: every item the person did not finish, **newest first**.

- Ordinary miss — standard styling.
- **Flagged FALSE by the Process Coordinator** — rendered in **light pink**, with the line *"Marked done but not actually done — checked by <name>"*.

### 7.7 Missed-important alert

Some important tasks relate to government compliance. Missing one must be impossible to overlook.

A **light pink alert box pinned to the top of the home screen**, shown immediately on login, listing missed important work. Shown to:

- the **Owner**,
- every **Mandate Holder**,
- everyone with the `IMPORTANT_MISS_ALERT` capability (default: Executive Assistant designation).

### 7.8 Extension contract

A future system becomes fully scored by doing exactly one thing: **writing `work_items` rows with a correct `assignee_user_id`, `available_from`, `planned_at` and `is_important`, and setting `completed_at`.**

**Hard review rule:** the string `'fms'`, `'checklist'`, `'delegation'` or any FMS code must never appear anywhere in scoring code. No `if (source_module === ...)`. If scoring needs to know what kind of work it is looking at, the design has failed.

---

## 8. Checklist system

Recurring work attached to a role or a person.

### 8.1 Creating

Created by **Owner or Mandate Holder** only.

| Field | Notes |
|---|---|
| Title | **English and Hindi**, both required |
| Assign to | **A designation** (everyone holding it, now and in future) **or one specific person** |
| Frequency | Daily · Weekly · Monthly · Quarterly · Yearly |
| Start date | The first occurrence |
| Due time | Within the day; default 19:00 |
| Important? | 3× weight |
| Training video | YouTube URL, optional |

### 8.2 Recurrence

Computed from `start_date` and `frequency`:

- **Daily** — every working day.
- **Weekly** — the same weekday each week. *(Start date Wednesday → every Wednesday.)*
- **Monthly / Quarterly / Yearly** — the same calendar date, stepping 1 / 3 / 12 months.

> **If a computed date falls on a Sunday or a holiday, push it to the next working day.** This applies to every frequency without exception.

A nightly job generates the next occurrence only — never a year of rows in advance.

`available_from` = start of the working day on which the occurrence falls.
`planned_at` = that date at the definition's due time.

### 8.3 Completion and locking

The person opens the item, optionally watches the training video, optionally adds a note, taps **Done**.

At **19:30 on the due date**, anything incomplete is **locked**: it disappears from that person's list and scores `is_done = false`.

After locking, **only an Owner or Mandate Holder** can mark it done — used when the work genuinely happened but was not recorded. That sets `is_done = true`, `is_on_time = false`.

### 8.4 Deletion

Owner or Mandate Holder only. On delete, ask: **"Delete this for the whole designation, or only for one person?"**

Deleting stops future occurrences. It never removes past score history.

### 8.5 Training videos

Videos live on YouTube; only the link is stored — no video files on the server. The MIS Executive's dashboard lists every definition with no video, so the backlog can be worked down at roughly 5–10 videos a day until cleared.

The intended support path is deliberate: **task → training video → if still stuck, Help Slip.**

---

## 9. FMS framework

An FMS (Flowchart Management System) is a fixed sequence of steps where a step becomes available only when the previous one completes. Phase 1 ships **10–12 different FMS**: Purchase, Order-to-Delivery, Job Slip, Sales, Sales New Business Development, Client Retention & Reorder (CRR), MECA (Meetings / Conversion / Average Rupee Sale), and others.

> **Every FMS is different. The only thing they share is that they are flow-based.**

The problem being solved: with ~160–170 orders and ~20–30 purchase orders live simultaneously, no manager can hold in their head which order is at which stage. The FMS is not a data warehouse — **it exists to keep work moving.** Screens should reflect that: minimal, fast, focused on the next action.

### 9.1 Isolation — the core architectural requirement

```
src/fms/
  _framework/            <-- NEVER modified when adding or changing an FMS
    engine.ts            step advancement, work-item creation, planned-time calculation
    types.ts             the FmsDefinition type
    registry.ts          auto-discovery of FMS modules
    numbering.ts         display-number generation
    bill-sequence.ts     optional bill-number gap detection
  purchase/
    definition.ts        steps, questions, TATs, branches — data only
    hooks.ts             custom logic for THIS FMS only
    definition.test.ts
    index.ts
  order-to-delivery/
    definition.ts
    hooks.ts
    definition.test.ts
    index.ts
  ...
```

Hard requirements:

1. Adding an FMS = adding **one folder**. No framework edits. No edits to any other FMS. **No database migration.**
2. Each FMS folder has **its own test file, runnable in isolation**.
3. `_framework` contains **zero** references to any specific FMS code (`'O2D'`, `'PUR'`, …). Enforce with a lint rule if practical.
4. Definitions are **typed TypeScript objects** — a malformed flow fails `tsc`, not production.

### 9.2 Who creates an FMS

**Backend only. There is no FMS builder UI in Phase 1** — deliberate, so nobody can invent an unreviewed flow.

The process for each new FMS:

1. The Owner supplies a **photograph of the flow chart**.
2. The engineer asks, for every step: **What · Who · How · When · TAT**, the exact questions asked, which earlier data must be visible, and every branch condition.
3. A folder is added under `src/fms/`.

Document this process in the repo README — it is how the system will be extended for years.

### 9.3 Step definition

Modelled on the client's existing sheets, which already use **What / Who / How / When / TAT** as their column structure.

```ts
type FmsStep = {
  step_no: number
  label: { en: string; hi: string }                 // "What"
  assignee: { type: 'USER'; user_id: number }       // "Who" — ALWAYS a person
  is_important: boolean                             // 3× weight
  tat: TAT                                          // "When"
  questions: Question[]                             // the form
  visible_data?: string[]                           // field keys from earlier steps to show
  repeatable?: RepeatConfig
  branches?: Branch[]
  on_complete?: 'NEXT' | { goto_step: number } | 'CLOSE'
}

type Question = {
  key: string
  label: { en: string; hi: string }
  type: 'text' | 'number' | 'select' | 'date' | 'file' | 'master_list'
  options?: string[]                                // select
  master_list_key?: string                          // master_list, e.g. 'customers'
  required: boolean
}

type TAT =
  | { kind: 'ANYTIME' }
  | { kind: 'FIXED_HOURS'; hours: number }
  | { kind: 'FIXED_DAYS'; days: number }
  | { kind: 'DYNAMIC'; from_step: number; field_key: string; unit: 'HOURS' | 'DAYS' }
```

`planned_at` for a step = `addWorkingTime(previous step's actual completion, resolved TAT)`.
`available_from` for a step = the previous step's actual completion.

### 9.4 Starting a flow

Step 1 typically has `tat: ANYTIME` and is **open to a group** — e.g. any of the seven salesmen can log an order the moment it arrives. Implement step 1's "who" as either a named person or an open-entry step available to a designation; every subsequent step is a named person.

### 9.5 Branching and rework

```ts
branches: [
  { when: { field: 'already_ordered', equals: 'Yes'    }, action: 'CLOSE' },
  { when: { field: 'quality_check',   equals: 'Failed' }, action: { goto_step: 5 } },
]
```

Rework loops are `goto_step` pointing at an earlier step. **The target is chosen per FMS at definition time** — never a global "go back one step" rule. The client's Job Slip sheet contains exactly this pattern (`Cut to Pack?` Yes/No).

### 9.6 Repeating steps

A 15,000-piece order dispatches in batches of ~450–500 per bill. This is intentional — **staggered delivery** under Theory of Constraints, minimising time goods spend in the queue, rather than on-time-in-full.

```ts
repeatable: {
  quantity_field: 'qty_dispatched',
  target_field: { from_step: 1, key: 'quantity' },
  auto_complete_at_percent: 85,
  requires_settlement: true
}
```

Behaviour:

- The step accepts repeated submissions; each is an `fms_step_instance` with an incrementing `repeat_index`.
- Running balance is tracked and shown.
- At the threshold, the flow auto-marks complete — almost no order dispatches to exactly 100%.
- With `requires_settlement`, the flow **stays visible to the assignee even after auto-complete**, so a further dispatch can still be recorded. Only a **Mandate Holder settling it** truly closes it.

Thresholds are per-FMS settings decided at definition time, never global.

### 9.7 Numbering

- Format `<CODE>-<FY>-<SERIAL>` — e.g. **`O2D-2627-0001`**.
- Serial **resets to 0001 on 1 April** (Indian financial year).
- System-generated. **The user never types a number — only reads it.**
- A deleted flow's number is **never reused within the same financial year**.

### 9.8 What the doer sees

Deliberately minimal — slow phones, and the goal is flow, not archives.

On opening an FMS task:

1. The **display number**
2. The **step-1 data** — this is how staff recognise the job
3. Any fields listed in `visible_data`
4. Their own **empty form**

Nothing else by default. A **"See history"** button reveals every completed step **for that one flow**. Any member of that FMS may view it — none of this data is sensitive and hiding it slows people down.

**Never load an entire FMS's history onto a phone.** History is fetched per flow instance, on demand, only.

### 9.9 Editing and deletion

- **Only the Owner** may edit or delete an FMS record.
- Deletion copies the full record to `fms_deleted_repository`, visible only to the Owner.
- Deletion is the escape hatch for genuine rarities — e.g. a vendor refusing an order after acceptance, a once-in-several-years event. The flow is deleted and re-entered.

### 9.10 Bill-number tracking — Phase 1

Phase 1 includes bill-number capture and **sequence-gap detection** on dispatch-type steps, replacing the client's existing "Bill Sequence" and "Missed Bills" sheets. Implement as a reusable helper in `_framework/bill-sequence.ts` that any FMS may switch on. Phase 1 ships several sales FMS, which makes this immediately necessary.

### 9.11 Parallel steps

The framework should **support** two steps running concurrently, but **no Phase 1 FMS enables it.** Order-detail entry (product, design number, size, colour) arrives in a later phase and will run parallel to Order-to-Delivery then.

### 9.12 Master lists

Fields like Customer, Agent, Transport, Thekedar and Pressman are **chosen from a list, never typed fresh** — free text destroys reporting.

- Stored in `master_lists`, keyed by `list_key`.
- **Mandate Holders maintain them.**
- Phase 2 expands these into the full Full Kitting database (products with photos and aliases, job workers with contact, address and Google Maps location, who makes what, maximum production pipeline). **Design `master_lists` with an `extra_json` column so that growth needs no migration.**

---

## 10. Help Slip

A three-state support loop, deliberately short-lived so home screens stay clean.

1. **Ask** — any user, from the home screen, by **typed text or voice note**.
2. **Answer** — **Owner or Mandate Holder** replies in simple words. The raiser sees an "Answer ready" state.
3. **Understood** — the raiser opens the answer and taps **"I understood"**. The slip **disappears from their view completely**. The record stays in the database.

- Answered slips are **hard-deleted 6 months after resolution**, including the voice file. No legal retention requirement applies.
- Voice notes: record in-browser, compress, store as a file.

---

## 11. Delegation Sheet

One-off work assigned directly to a named person. Available to Owner, Mandate Holder, and anyone with the `DELEGATION_SHEET` capability (default: Executive Assistant).

- Fields: assign to (person, **shown with their photo**), title in **English and Hindi**, due (working hours/days), **Important?** (3× weight), and optional questions the doer must answer on completion.
- After assigning, a **"Send on WhatsApp"** button opens `https://wa.me/91<mobile>?text=<encoded>` pre-filled with the task and an instruction to mark it done in the app. **The sender presses send themselves.** The app never sends anything automatically.
- **This button exists only for delegated work.** FMS and checklist work is dashboard-only and never messaged — that is what makes the WhatsApp nudge meaningful.
- The assignee may mark it done, or **request a change** — but only **within 2 days of assignment**; the option then disappears permanently.
- The assignee can **never delete** delegated work.
- A change request is a flagged request, never a silent edit. It appears on the delegator's dashboard to **approve or deny**.

---

## 12. Capability dashboards

These are blocks **inside the existing sections** — never separate apps, never extra navigation.

### 12.1 Process Coordinator

**Delay Dashboard** — every work item company-wide past its `planned_at`, across every system, oldest first. Each row: the work, the person (**with photo**), how late in working hours, and **one-tap WhatsApp** (pre-filled) and **one-tap Call** (`tel:`).

The Coordinator's job is twofold: **audit** (below) and **unblock** — either chase the person directly, or raise a Help Slip if there is a genuine blocker.

**Daily Random Audit** — each working day the system draws a random sample of **completed** work (default 10, configurable) from across **all** systems, including FMS steps. The Coordinator marks each **Verified** or **False**.

Requirements: cryptographically random; no repeating pattern; no item re-sampled within a rolling window. Marking **False** reverses that item's done credit (§7.4) and surfaces it in the person's Not Done list in light pink.

### 12.2 Executive Assistant

Delegation Sheet (§11) plus pending change requests, plus the missed-important alert.

### 12.3 MIS Executive

Checklist definitions with no training video, plus system health: app status, last backup, storage used, errors this week.

The MIS role owns this platform's upkeep and evolution — the intent is that the company runs like a corporate while remaining MSME-sized.

---

## 13. The three interfaces

Same app, same design language, shaped to the role. Not three products — three arrangements.

### 13.1 Regular User — three sections

| # | Section | Contents |
|---|---|---|
| 1 | **Home** | My pending work. Missed-important alert if applicable. Help Slip entry directly beneath the list. |
| 2 | **Score** | My two scores · period selector · Not Done list |
| 3 | **My Systems** | The systems I belong to; tap one to see its live work. Any capability blocks I hold. Work I finished in the last 3 weeks. |

Everything reachable in three taps or fewer.

### 13.2 Mandate Holder — four sections

| # | Section | Contents |
|---|---|---|
| 1 | **Home** | Own pending work · missed-important alert (company-wide) |
| 2 | **Score** | Own scores, plus **team scores** for everyone, both measures, all periods |
| 3 | **Systems** | All systems, live work in each, settle orders, override missed work |
| 4 | **Manage** | People (assign designations, reset PINs, see photos) · Designations · Checklist definitions · Master lists · Help Slips to answer · Holidays · Settings |

### 13.3 Owner — four sections

The Owner receives no operational work, so a personal task list would be an empty screen. Section 1 becomes the company view.

| # | Section | Contents |
|---|---|---|
| 1 | **Overview** | Missed-important alerts · work late right now · live flow counts per FMS · open Help Slips · this week's team position at a glance |
| 2 | **Scores** | Whole team, both measures, every period, **Excel export** |
| 3 | **Systems** | Every FMS and its live work · edit and delete records · **deleted-record repository** |
| 4 | **Manage** | Everything a Mandate Holder has, plus financial visibility and owner-only settings |

*(In Phase 2 the 5 Building Blocks and the Monday Executive Meeting sheet attach to the Owner's Overview.)*

---

## 14. Interface rules

### 14.1 Colour

Four colours and their shades, nothing else:

| Role | Colour |
|---|---|
| Primary / structure | **Navy blue** — headers, avatars, structural surfaces |
| Action / emphasis | **Hot pink** — buttons, active states, progress, the current step |
| Surface | **White** and its off-white shades |
| Text / depth | **Black** and its greys |

Where this document says "red", use a **light pink** shade. Alerts, late badges and flagged rows all use pink shades — never a separate red.

Define the full palette once as CSS custom properties (base + tint + deep for navy and pink; a grey ramp for black). Nothing outside that palette anywhere in the app.

### 14.2 Three sections, not more

Bottom navigation carries **3 items for Regular Users** and **4 for Mandate Holders and Owners**. Never more. Everything else is reached from inside them.

### 14.3 Words

Short, plain, everyday words. **"Late"**, not "Overdue SLA breach". **"Done"**, not "Mark as completed". **"Ask for help"**, not "Raise a support ticket". Assume the reader has not finished 10th grade and is reading on a small screen in poor light, possibly on a factory floor.

### 14.4 Language

Three options, set per user: **English · हिंदी (Devanagari) · Hindi (Roman)**.

- Every interface string exists in all three.
- Staff-created content (checklist titles, delegated work) is entered by the creator in **English and Hindi**, and rendered per the reader's setting.
- Any automatic translation feature outputs **Devanagari**.
- The client's own sheets mix both scripts (`Kitne din me maal dega`, `माल कितने दिनों में`) — both are genuinely in use.

### 14.5 One card design

Every work item uses the **same card**, whatever system produced it. A small tag distinguishes the source; an "Important" tag appears where relevant. No per-module layouts — that was explicitly rejected as confusing.

### 14.6 Performance

Target: usable on a low-end Android phone over 3G.

- Initial JS payload under ~200 KB gzipped; lazy-load the rest.
- Paginate every list. Never load a full FMS history.
- Compress images before upload, client-side where possible.
- No blocking spinners on the home screen — render the task list first.

---

## 15. Files, photos, retention

- Every uploaded photo is resized to **max 1920px on the long edge** and compressed to **~80% quality** WebP/JPEG on upload. A 5 MB phone photo lands around **150–300 KB**.
- Originals are **not retained** — no operational need, and storage is finite.
- Expected volume: ~4,000–6,000 existing images, ~20,000/year incoming. Compressed and with the deletion rule below, steady-state stays comfortably inside the 100 GB disk.
- **Order-linked photos are deleted 1 year after that order's payment is marked fully received.** A manual **hold** flag pauses deletion for any record under dispute.
- **Transaction records are retained permanently.** Only heavy files are ever deleted. This comfortably exceeds the GST minimum (72 months from filing the annual return, Section 36 — confirm specifics with the company's CA; the app exceeds it either way).
- Help Slip content, including voice notes, is deleted 6 months after resolution.
- A nightly job performs deletions. **Every deletion is logged.**

**Backups:** nightly `pg_dump`, 30-day retention, stored off the application disk. **The restore must be tested before go-live** — an untested backup is not a backup.

**Health reporting:** a daily automated check and a weekly summary in plain language; immediate alert if something is actually broken.

---

## 16. Non-negotiable invariants

Treat as tests that must pass before any release.

1. Scoring code contains **no reference** to any system, module name, or FMS code.
2. Adding an FMS folder requires **no change** to `_framework`, to any other FMS, or to the schema.
3. `available_from` and `planned_at` are **never null** on any `work_items` row, from any system.
4. Every score rendered anywhere is **≤ 0** and carries a `%` sign.
5. No deadline anywhere is computed in calendar hours — all pass through the working-time engine.
6. `work_items.assignee_user_id` is always a specific user. Nothing is ever assigned to a designation.
7. No FMS display number is reused within a financial year.
8. A user with no designation can read **no** company data — enforced server-side.
9. PINs are never stored, logged, or transmitted in plain text.
10. Checklist items lock at 19:30 on their due date. **FMS steps never lock.**
11. An FMS step past its planned time can never regain on-time credit.
12. `queue_snapshots` is written nightly from day one, even though nothing reads it until Phase 4.

---

## 17. Build order

1. **Working-time engine + exhaustive tests** — everything depends on it
2. Auth · users · designations · capabilities
3. **`work_items` + `WorkItemService`** — the single write path
4. **Scoring engine + tests** — including the negative-display rule
5. `queue_snapshots` nightly job
6. App shell: the three interfaces, navigation, palette, language switching
7. Checklist system end to end
8. FMS framework + **one** real FMS as the reference implementation
9. Help Slip
10. Delegation Sheet
11. Capability dashboards (Process Coordinator, Executive Assistant, MIS)
12. Admin screens: people, designations, master lists, holidays, settings
13. Remaining FMS modules — one folder at a time
14. Deploy: Nginx · SSL · PM2 · backups · restore test · health checks

---

## 18. Later phases — do not build, do not block

One phase per week, approximately.

### Phase 2 — Full Kitting and owner systems

- **Full Kitting** — the master database everything downstream depends on. Products with photographs, generic aliases, who makes what; job workers with contact, address and Google Maps location; maximum production pipeline per worker; customers. The governing rule: **production never starts until every input is available** — fabric, labels, stickers, accessories, packaging, and an available job worker — so nothing stalls mid-production. **Phase 3 cannot begin without this.**
- **5 Building Blocks** (Owner only): 4:00–7:00am deep work block · one phone-free growth day per week, protected from operations · every hour of the week scheduled · Monday Executive Meeting, 3 minutes per person (last week's score → this week's commitment → next week, committed vs delivered) · Executive Assistant offloading non-growth work.
- **System Creation Team** — any employee may request that a manual process be automated; the request runs as its own FMS. Team: Executive Assistant, one MIS, one senior, one Process Coordinator (chosen for visibility into where work sticks).

### Phase 3 — Inventory Management (IMS)

Theory of Constraints, per *Isn't It Obvious* (Goldratt). Forecasting is rejected as unreliable; buffers are computed from actual movement:

```
buffer level = average daily sales × lead time × safety factor
```

*Example: 35 units/day × 10 days lead time × 1.5 = ~525 units held.*

Averages update on every order. Items ranked fastest to slowest moving; roughly the top 20% by gross profit are stocked. Also in this phase: order entry with commercial terms (discount, credit period), and **bulk dispatch upload via Excel** — 50 parcels a day must not mean 50 manual entries.

### Phase 4 — Bottleneck identification and analytics

Reads the plan-vs-actual and queue data every system has been recording since Phase 1.

> **Rule: wherever the waiting line is longest, the bottleneck is the step immediately in front of or behind it.**

Plus full analytics dashboards and downloadable reports.

### Phase 5 — Production Management (PMS)

Two systems: **dispatch planning** across multiple warehouses, and **production planning** — using Full Kitting and IMS to answer *what to produce, who produces it, and in what priority*, maximising production capacity. This is described by the client as the single most important problem in the business.

### Architectural implications to respect now

- `master_lists.extra_json` must let Phase 2 grow the product and job-worker database with no migration.
- Every work item already carries `available_from`, `planned_at`, `first_opened_at`, `completed_at`. **Phase 4 depends entirely on this existing from day one. Never omit it in any system.**
- Nothing in Phases 2–5 may require a change to the scoring engine.

---

## Appendix A — The client's live sheets

Two working Google Sheets were supplied. They are the source of truth for how these processes actually run today, and Phase 1 must reproduce their logic faithfully.

### Order-to-Delivery

Three steps, each fed by its own Google Form, keyed by Order Number:

| Step | What | Who | How | TAT |
|---|---|---|---|---|
| 1 | Order Entry | Order Data Executive | Google Form | Anytime |
| 2 | Dispatch Entry | — | Google Form | 0 — repeats per partial dispatch |
| 3 | Complete This Order | MK / NR / KR | Google Form | **270 working hours** = 30 working days |

Step 1 captures: Customer Name · Quantity · Order Type · Product Ordered · Special Requirements · Transport · Agent Name · **Lead Time in days** — which drives the dynamic TAT.
Every step stores **Planned · Actual · Time Delay**. The sheet header carries **10:00–19:00** office hours and a running serial. Final columns compute **Overall Delivery** and **On-time Delivery**.

### Job Slip

| Step | What | Who | How | TAT |
|---|---|---|---|---|
| 1 | Naame | Production Executive | Google Form + Gate Pass | Anytime |
| 2 | Unfinished Maal Jama | PC + Production Executive | Call + Google Form | **= Lead Time** (dynamic) |
| 3 | Press | Pressman (via Rakesh) | Called in + form | 2 days |
| 4 | Finished Maal Jama | PC calls Thekedar | Call and message | As per iron |

Captures Challan Number · Item · Pieces · Size · Thekedar Name · Plan No · Lead Time · **Cut to Pack? (Yes/No branch)**, and tracks **Balance / Jama / Settle** quantities across repeated submissions. Supporting forms exist for Accessories check, Unfinished Inward, and **Settle (with "Approved By?")** — confirming the settlement pattern in §9.6.

### What both sheets confirm

- **What / Who / How / When / TAT** per step — the definition shape in §9.3
- **Planned vs Actual vs Delay** recorded per step — Law 2, already in practice
- **9 working hours per day**, 10:00–19:00, Sundays and a holiday list excluded
- **Master lists** behind every name field
- **Repeated partial submissions** against a running balance, closed by settlement
- Each step is a **separate form** writing against one shared unique number — precisely the architecture in §9

---

*End of specification.*
