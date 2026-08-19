import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db';
import { seedDatabase, ensureDailyWorkItemsForToday } from './seed';
import { WorkItemService } from './services/workItemService';
import { calculateMISScore, ScoreItemInput } from '../core/scoring/engine';
import { fmsRegistry, calculateNextStepPlannedAt, evaluateBranches, formatFmsDisplayNumber } from '../fms';
import { workingHoursBetween, addWorkingTime, getISTComponents } from '../core/working-time/engine';
import { O2CScheduler } from './services/o2cScheduler';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'katl-ops-super-secret-jwt-key-2026';

const server = Fastify({
  logger: false,
});

server.register(cors, {
  origin: true,
  credentials: true,
});

server.register(cookie);
server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Serve uploaded media
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

server.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  decorateReply: false,
});

// Auth Middleware Helper
function authenticate(req: any, reply: any, done: () => void) {
  const token = req.cookies.katl_token || (req.headers.authorization?.replace('Bearer ', ''));
  if (!token) {
    reply.status(401).send({ error: 'Authentication required' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    done();
  } catch (err) {
    reply.status(401).send({ error: 'Invalid or expired session' });
  }
}

// ----------------------------------------------------
// 1. AUTH ROUTES
// ----------------------------------------------------
server.post('/api/auth/login-staff', async (req: any, reply) => {
  const { mobile, pin } = req.body || {};
  if (!mobile || !pin) {
    return reply.status(400).send({ error: 'Mobile number and PIN are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE mobile = ? AND is_active = 1').get(mobile) as any;
  if (!user) {
    return reply.status(401).send({ error: 'User not found or inactive' });
  }

  // Check temp pin first if present
  let pinValid = false;
  if (user.temp_pin && user.temp_pin === pin) {
    pinValid = true;
  } else if (user.pin_hash) {
    pinValid = await bcrypt.compare(pin, user.pin_hash);
  }

  if (!pinValid) {
    return reply.status(401).send({ error: 'Incorrect PIN' });
  }

  // Fetch designations & capabilities
  const designations = db.prepare(`
    SELECT d.id, d.name, d.department 
    FROM designations d
    JOIN user_designations ud ON ud.designation_id = d.id
    WHERE ud.user_id = ?
  `).all(user.id) as any[];

  const capabilities = db.prepare(`
    SELECT DISTINCT dc.capability
    FROM designation_capabilities dc
    JOIN user_designations ud ON ud.designation_id = dc.designation_id
    WHERE ud.user_id = ?
  `).all(user.id).map((c: any) => c.capability);

  const systems = db.prepare(
    'SELECT system_code FROM user_systems WHERE user_id = ? ORDER BY system_code'
  ).all(user.id).map((s: any) => s.system_code);

  const payload = {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    designations: designations.map((d) => d.name),
    capabilities,
    systems,
    requiresNewPin: !!user.temp_pin,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

  reply.setCookie('katl_token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set true in production
  });

  return { success: true, user: payload, token };
});

server.post('/api/auth/login-admin', async (req: any, reply) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return reply.status(400).send({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(username) as any;
  if (!user || !user.password_hash) {
    return reply.status(401).send({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return reply.status(401).send({ error: 'Invalid credentials' });
  }

  const designations = db.prepare(`
    SELECT d.id, d.name, d.department 
    FROM designations d
    JOIN user_designations ud ON ud.designation_id = d.id
    WHERE ud.user_id = ?
  `).all(user.id) as any[];

  const capabilities = ['DELAY_DASHBOARD', 'AUDIT', 'DELEGATION_SHEET', 'VIDEO_BACKLOG', 'IMPORTANT_MISS_ALERT'];

  const systems = db.prepare(
    'SELECT system_code FROM user_systems WHERE user_id = ? ORDER BY system_code'
  ).all(user.id).map((s: any) => s.system_code);

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    designations: designations.map((d) => d.name),
    capabilities,
    systems,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

  reply.setCookie('katl_token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  });

  return { success: true, user: payload, token };
});

server.post('/api/auth/logout', async (req, reply) => {
  reply.clearCookie('katl_token', { path: '/' });
  return { success: true };
});

server.get('/api/auth/me', { preHandler: [authenticate] }, async (req: any) => {
  const user = db.prepare('SELECT id, name, mobile, email, role, selfie_url FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) return { error: 'User not found' };

  const designations = db.prepare(`
    SELECT d.id, d.name, d.department 
    FROM designations d
    JOIN user_designations ud ON ud.designation_id = d.id
    WHERE ud.user_id = ?
  `).all(user.id) as any[];

  const capabilities = db.prepare(`
    SELECT DISTINCT dc.capability
    FROM designation_capabilities dc
    JOIN user_designations ud ON ud.designation_id = dc.designation_id
    WHERE ud.user_id = ?
  `).all(user.id).map((c: any) => c.capability);

  const systems = db.prepare(
    'SELECT system_code FROM user_systems WHERE user_id = ? ORDER BY system_code'
  ).all(user.id).map((s: any) => s.system_code);

  return {
    user: {
      ...user,
      designations: designations.map((d) => d.name),
      capabilities: user.role === 'OWNER' || user.role === 'MANDATE_HOLDER' 
        ? ['DELAY_DASHBOARD', 'AUDIT', 'DELEGATION_SHEET', 'VIDEO_BACKLOG', 'IMPORTANT_MISS_ALERT']
        : capabilities,
      systems: user.role === 'OWNER' || user.role === 'MANDATE_HOLDER'
        ? ['CL', 'O2C', 'Purchase']
        : systems,
    },
  };
});

server.post('/api/auth/reset-pin', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }

  const { target_user_id } = req.body;
  const tempPin = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE users 
    SET temp_pin = ?, temp_pin_expires_at = ? 
    WHERE id = ?
  `).run(tempPin, expiresAt, target_user_id);

  return { success: true, temp_pin: tempPin };
});

server.post('/api/auth/set-pin', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { new_pin } = req.body;
  if (!new_pin || new_pin.length < 4 || new_pin.length > 6) {
    return reply.status(400).send({ error: 'PIN must be 4 to 6 digits' });
  }

  const pinHash = await bcrypt.hash(new_pin, 10);
  db.prepare(`
    UPDATE users 
    SET pin_hash = ?, temp_pin = NULL, temp_pin_expires_at = NULL 
    WHERE id = ?
  `).run(pinHash, req.user.id);

  return { success: true };
});

// ----------------------------------------------------
// 2. WORK ITEMS & TASKS
// ----------------------------------------------------
server.get('/api/work-items/my', { preHandler: [authenticate] }, async (req: any) => {
  // ── Home tab query logic:
  // • DELEGATION tasks (source_module='delegation'): always show if OPEN (pinned until done)
  // • COMPLIANCE tasks (task_type='COMPLIANCE'): always show if OPEN (pinned until done)
  // • Regular checklist / FMS tasks: only show today's (planned today OR completed today)
  let items = db.prepare(`
    SELECT * FROM work_items
    WHERE assignee_user_id = ?
      AND (
        -- Pinned: Delegation tasks always visible until done
        (source_module = 'delegation' AND status != 'DONE')
        -- Pinned: Compliance tasks always visible until done
        OR (task_type = 'COMPLIANCE' AND status != 'DONE')
        -- Open FMS tasks are ALWAYS visible until done
        OR (source_module = 'fms' AND status != 'DONE')
        -- Today's regular tasks (open or completed today)
        OR ((planned_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND source_module != 'delegation' AND task_type != 'COMPLIANCE')
        -- Any task completed today (to keep visible in list after submit)
        OR ((completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
      )
    ORDER BY
      -- Pinned group (DELEGATION + COMPLIANCE) comes first
      CASE
        WHEN source_module = 'delegation' AND status != 'DONE' THEN 0
        WHEN task_type = 'COMPLIANCE' AND status != 'DONE' THEN 0
        ELSE 1
      END ASC,
      -- Within each group: done items sink to bottom
      CASE WHEN status = 'DONE' THEN 1 ELSE 0 END ASC,
      is_important DESC,
      planned_at ASC
  `).all(req.user.id) as any[];

  // If no items returned, ensure today's checklist work items exist and retry
  if (items.length === 0) {
    try {
      ensureDailyWorkItemsForToday();
      items = db.prepare(`
        SELECT * FROM work_items
        WHERE assignee_user_id = ?
          AND (
            (source_module = 'delegation' AND status != 'DONE')
            OR (task_type = 'COMPLIANCE' AND status != 'DONE')
            OR (source_module = 'fms' AND status != 'DONE')
            OR ((planned_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND source_module != 'delegation' AND task_type != 'COMPLIANCE')
            OR ((completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
          )
        ORDER BY
          CASE
            WHEN source_module = 'delegation' AND status != 'DONE' THEN 0
            WHEN task_type = 'COMPLIANCE' AND status != 'DONE' THEN 0
            ELSE 1
          END ASC,
          CASE WHEN status = 'DONE' THEN 1 ELSE 0 END ASC,
          is_important DESC,
          planned_at ASC
      `).all(req.user.id) as any[];
    } catch (_) {}
  }

  const now = new Date();
  const enhancedItems = items.map((item) => {
    const plannedAt = new Date(item.planned_at);
    const nowIST = getISTComponents(now);
    const plannedIST = getISTComponents(plannedAt);

    const isPastDate = nowIST.dateStr > plannedIST.dateStr;
    const isPast8PM = nowIST.dateStr === plannedIST.dateStr && (nowIST.hours >= 20);
    // Only regular (non-compliance, non-delegation) daily checklist tasks get locked
    const isDailyChecklist = item.source_module === 'checklist' && item.task_type !== 'COMPLIANCE';
    const isLocked = item.status !== 'DONE' && isDailyChecklist && (isPastDate || isPast8PM);

    return {
      ...item,
      is_locked: isLocked,
      lock_reason: isLocked
        ? (isPastDate ? "Yesterday's task is expired and locked." : "Daily submission deadline (8:00 PM) has passed. Task is locked.")
        : null,
    };
  });

  return { work_items: enhancedItems };
});

server.post('/api/work-items/:id/open', { preHandler: [authenticate] }, async (req: any) => {
  WorkItemService.markFirstOpened(req.params.id);
  return { success: true };
});

server.post('/api/work-items/:id/complete', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { notes } = req.body || {};
  try {
    const isManager = req.user.role === 'OWNER' || req.user.role === 'MANDATE_HOLDER';
    WorkItemService.completeWorkItem({
      work_item_id: req.params.id,
      completed_by: req.user.id,
      is_admin_override: isManager,
    });
    return { success: true };
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Failed to submit task' });
  }
});

// Late-submit: allows a user to submit a past-due / locked task from the Score tab's "Not Done" section.
// Bypasses the 8 PM checklist lock. completed_at = NOW() so the scoring engine marks it "late"
// (completed_at > planned_at → not on time, but WD improves since it IS done).
server.post('/api/work-items/:id/late-submit', { preHandler: [authenticate] }, async (req: any, reply) => {
  const workItemId = req.params.id;

  // Verify the task exists and belongs to this user
  const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(workItemId) as any;
  if (!item) return reply.status(404).send({ error: 'Task not found' });
  if (
    item.assignee_user_id !== req.user.id &&
    req.user.role !== 'OWNER' &&
    req.user.role !== 'MANDATE_HOLDER'
  ) {
    return reply.status(403).send({ error: 'Permission denied — not your task' });
  }
  if (item.status === 'DONE') {
    return reply.status(400).send({ error: 'Task is already marked as done' });
  }
  if (item.status === 'FLAGGED_FALSE') {
    return reply.status(400).send({ error: 'Flagged-false tasks cannot be self-submitted' });
  }

  try {
    // Use WorkItemService with is_admin_override=true to bypass the 8 PM lock.
    // completed_at defaults to new Date() inside completeWorkItem.
    // The score engine will compare completed_at > planned_at and mark it Late.
    WorkItemService.completeWorkItem({
      work_item_id: workItemId,
      completed_by: req.user.id,
      is_admin_override: true, // bypass lock — user is submitting from Score tab backlog
    });

    const now = new Date();
    const isOnTime = now.getTime() <= new Date(item.planned_at).getTime();
    return { success: true, is_on_time: isOnTime };
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Late submit failed' });
  }
});

server.post('/api/work-items/:id/override', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  WorkItemService.overrideDone(req.params.id, req.user.name);
  return { success: true };
});

// ----------------------------------------------------
// 3. MIS SCORING ENGINE API
// ----------------------------------------------------

/**
 * Convert any Date to an IST date string "YYYY-MM-DD".
 * IST = UTC + 5h30m = UTC + 330 minutes.
 */
function toISTDateStr(date: Date = new Date()): string {
  const istMs = date.getTime() + 330 * 60 * 1000;
  return new Date(istMs).toISOString().split('T')[0]; // "YYYY-MM-DD"
}

/**
 * Get Monday of the current IST week as a "YYYY-MM-DD" string.
 * SQLite weekday: 0=Sun, 1=Mon … 6=Sat
 */
function getISTWeekStart(): string {
  const istMs = Date.now() + 330 * 60 * 1000;
  const dayOfWeek = new Date(istMs).getUTCDay(); // 0=Sun, 1=Mon…
  const daysSinceMonday = (dayOfWeek + 6) % 7;   // 0 on Mon, 6 on Sun
  const mondayMs = istMs - daysSinceMonday * 86400 * 1000;
  return new Date(mondayMs).toISOString().split('T')[0];
}

/**
 * Get Saturday of the current IST week as a "YYYY-MM-DD" string.
 */
function getISTWeekEnd(): string {
  const istMs = Date.now() + 330 * 60 * 1000;
  const dayOfWeek = new Date(istMs).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const saturdayMs = istMs + (5 - daysSinceMonday) * 86400 * 1000;
  return new Date(saturdayMs).toISOString().split('T')[0];
}

/**
 * Get first day of the current IST month as "YYYY-MM-DD".
 */
function getISTMonthStart(): string {
  const istMs = Date.now() + 330 * 60 * 1000;
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Get last day of the current IST month as "YYYY-MM-DD".
 */
function getISTMonthEnd(): string {
  const istMs = Date.now() + 330 * 60 * 1000;
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-indexed
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const mStr = String(m + 1).padStart(2, '0');
  const dStr = String(lastDay).padStart(2, '0');
  return `${y}-${mStr}-${dStr}`;
}

/**
 * Get start and end date of the current Indian FY quarter as "YYYY-MM-DD".
 * FY quarters: Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar
 */
function getISTQuarterRange(): { start: string; end: string } {
  const istMs = Date.now() + 330 * 60 * 1000;
  const d = new Date(istMs);
  const m = d.getUTCMonth(); // 0-indexed (0=Jan … 11=Dec)
  const y = d.getUTCFullYear();
  if (m >= 3 && m <= 5) {
    return { start: `${y}-04-01`, end: `${y}-06-30` }; // Q1
  } else if (m >= 6 && m <= 8) {
    return { start: `${y}-07-01`, end: `${y}-09-30` }; // Q2
  } else if (m >= 9 && m <= 11) {
    return { start: `${y}-10-01`, end: `${y}-12-31` }; // Q3
  } else {
    return { start: `${y}-01-01`, end: `${y}-03-31` }; // Q4
  }
}

server.get('/api/scores/my', { preHandler: [authenticate] }, async (req: any) => {
  // Supported periods: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  const rawPeriod = (req.query?.period as string) || 'daily';
  let period = rawPeriod.toLowerCase();
  if (period === 'today') period = 'daily';
  if (period === 'this_week') period = 'weekly';
  if (period === 'this_month') period = 'monthly';
  if (period === 'this_quarter') period = 'quarterly';

  // ── Compute IST date boundaries (all as 'YYYY-MM-DD' strings) ──
  const todayIST = toISTDateStr();
  const weekStartIST = getISTWeekStart();   // Monday
  const weekEndIST   = getISTWeekEnd();     // Saturday
  const monthStartIST = getISTMonthStart();
  const monthEndIST   = getISTMonthEnd();
  const quarterRange  = getISTQuarterRange();

  // SQL fragment: convert a UTC timestamp column to IST date for comparison.
  // '+330 minutes' shifts stored UTC time to IST, then DATE() extracts date part.
  const toISTDate = `DATE(planned_at, '+330 minutes')`;

  let periodFilter = '';
  const params: string[] = [req.user.id];

  if (period === 'daily') {
    // ── DAILY: strictly today's tasks only ──
    periodFilter = `AND ${toISTDate} = ?`;
    params.push(todayIST);
  } else if (period === 'weekly') {
    // ── WEEKLY: Monday through Saturday of the current IST week ──
    periodFilter = `AND ${toISTDate} >= ? AND ${toISTDate} <= ?`;
    params.push(weekStartIST, weekEndIST);
  } else if (period === 'monthly') {
    // ── MONTHLY: first day through last day of current IST month ──
    periodFilter = `AND ${toISTDate} >= ? AND ${toISTDate} <= ?`;
    params.push(monthStartIST, monthEndIST);
  } else if (period === 'quarterly') {
    // ── QUARTERLY: current Indian FY quarter date range ──
    periodFilter = `AND ${toISTDate} >= ? AND ${toISTDate} <= ?`;
    params.push(quarterRange.start, quarterRange.end);
  }
  // Unknown period: no filter (all-time)

  const query = `
    SELECT id, assignee_user_id, is_important, planned_at, completed_at,
           status, title_en, title_hi, source_module, task_type,
           flagged_false_by, flagged_false_reason
    FROM work_items
    WHERE assignee_user_id = ?
    ${periodFilter}
    ORDER BY planned_at ASC
  `;

  const items = db.prepare(query).all(...params) as any[];

  const formattedItems: ScoreItemInput[] = items.map((i) => ({
    id: i.id,
    userId: i.assignee_user_id || i.userId || i.userid,
    isImportant: Boolean(i.is_important ?? i.isImportant ?? i.isimportant),
    plannedAt: new Date(i.planned_at || i.plannedAt || i.plannedat),
    completedAt: (i.completed_at || i.completedAt || i.completedat) ? new Date(i.completed_at || i.completedAt || i.completedat) : null,
    status: i.status,
    titleEn: i.title_en || i.titleEn || i.titleen || '',
    titleHi: i.title_hi || i.titleHi || i.titlehi || '',
    sourceModule: i.source_module || i.sourceModule || i.sourcemodule,
    taskType: i.task_type || i.taskType || i.tasktype,
    flaggedFalseBy: i.flagged_false_by || i.flaggedFalseBy || i.flaggedfalseby,
    flaggedFalseReason: i.flagged_false_reason || i.flaggedFalseReason || i.flaggedfalsereason,
  }));

  const scoreResult = calculateMISScore(req.user.id, formattedItems);
  return {
    score: scoreResult,
    period,
    debug: { todayIST, weekStartIST, weekEndIST, monthStartIST, monthEndIST, quarterRange },
  };
});

server.get('/api/scores/team', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }

  const rawPeriod = (req.query?.period as string) || 'daily';
  let period = rawPeriod.toLowerCase();
  if (period === 'today') period = 'daily';
  if (period === 'this_week') period = 'weekly';
  if (period === 'this_month') period = 'monthly';
  if (period === 'this_quarter') period = 'quarterly';

  const todayIST = toISTDateStr();
  const weekStartIST = getISTWeekStart();
  const weekEndIST   = getISTWeekEnd();
  const monthStartIST = getISTMonthStart();
  const monthEndIST   = getISTMonthEnd();
  const quarterRange  = getISTQuarterRange();

  const toISTDate = `DATE(planned_at, '+330 minutes')`;

  let periodFilter = '';
  let dateParams: string[] = [];

  if (period === 'daily') {
    periodFilter = `AND ${toISTDate} = ?`;
    dateParams = [todayIST];
  } else if (period === 'weekly') {
    periodFilter = `AND ${toISTDate} >= ? AND ${toISTDate} <= ?`;
    dateParams = [weekStartIST, weekEndIST];
  } else if (period === 'monthly') {
    periodFilter = `AND ${toISTDate} >= ? AND ${toISTDate} <= ?`;
    dateParams = [monthStartIST, monthEndIST];
  } else if (period === 'quarterly') {
    periodFilter = `AND ${toISTDate} >= ? AND ${toISTDate} <= ?`;
    dateParams = [quarterRange.start, quarterRange.end];
  }

  const users = db.prepare('SELECT id, name, mobile, role FROM users WHERE is_active = 1 ORDER BY name ASC').all() as any[];
  
  const teamScores = users.map((u) => {
    const query = `
      SELECT id, assignee_user_id, is_important, planned_at, completed_at,
             status, title_en, title_hi, source_module, task_type,
             flagged_false_by, flagged_false_reason
      FROM work_items
      WHERE assignee_user_id = ?
      ${periodFilter}
      ORDER BY planned_at ASC
    `;

    const items = db.prepare(query).all(u.id, ...dateParams) as any[];

    const formatted: ScoreItemInput[] = items.map((i) => ({
      id: i.id,
      userId: i.assignee_user_id || i.userId || i.userid,
      isImportant: Boolean(i.is_important ?? i.isImportant ?? i.isimportant),
      plannedAt: new Date(i.planned_at || i.plannedAt || i.plannedat),
      completedAt: (i.completed_at || i.completedAt || i.completedat) ? new Date(i.completed_at || i.completedAt || i.completedat) : null,
      status: i.status,
      titleEn: i.title_en || i.titleEn || i.titleen || '',
      titleHi: i.title_hi || i.titleHi || i.titlehi || '',
      sourceModule: i.source_module || i.sourceModule || i.sourcemodule,
      taskType: i.task_type || i.taskType || i.tasktype,
      flaggedFalseBy: i.flagged_false_by || i.flaggedFalseBy || i.flaggedfalseby,
      flaggedFalseReason: i.flagged_false_reason || i.flaggedFalseReason || i.flaggedfalsereason,
    }));

    const score = calculateMISScore(u.id, formatted);
    return {
      ...score,
      userId: u.id,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      totalTasks: items.length,
      doneTasksCount: score.doneItems.length,
      pendingTasksCount: score.notDoneItems.length,
    };
  });

  return { 
    team_scores: teamScores,
    period,
    debug: { todayIST, weekStartIST, weekEndIST, monthStartIST, monthEndIST, quarterRange }
  };
});

// ----------------------------------------------------
// 4. FMS FLOWS & STEP EXECUTION
// ----------------------------------------------------
server.get('/api/fms/definitions', { preHandler: [authenticate] }, async () => {
  return { definitions: fmsRegistry.getAll() };
});

server.get('/api/fms/flows', { preHandler: [authenticate] }, async (req: any) => {
  const code = req.query.code;
  let query = `
    SELECT f.*, u.name as started_by_name
    FROM fms_flow_instances f
    LEFT JOIN users u ON u.id = f.started_by
    WHERE f.status != 'DELETED'
  `;
  const params: any[] = [];
  if (code) {
    query += ` AND f.fms_code = ?`;
    params.push(code);
  }
  query += ` ORDER BY f.started_at DESC`;

  const flows = (db.prepare(query).all(...params) as any[]).map((f) => ({
    ...f,
    all_form_data: typeof f.all_form_data === 'string' ? JSON.parse(f.all_form_data || '{}') : (f.all_form_data || {}),
  }));

  return { flows, instances: flows };
});

server.get('/api/fms/instances', { preHandler: [authenticate] }, async (req: any) => {
  const code = req.query.code;
  let query = `
    SELECT f.*, u.name as started_by_name
    FROM fms_flow_instances f
    LEFT JOIN users u ON u.id = f.started_by
    WHERE f.status != 'DELETED'
  `;
  const params: any[] = [];
  if (code) {
    query += ` AND f.fms_code = ?`;
    params.push(code);
  }
  query += ` ORDER BY f.started_at DESC`;

  const flows = (db.prepare(query).all(...params) as any[]).map((f) => ({
    ...f,
    all_form_data: typeof f.all_form_data === 'string' ? JSON.parse(f.all_form_data || '{}') : (f.all_form_data || {}),
  }));

  return { instances: flows, flows };
});

server.get('/api/fms/flows/:id', { preHandler: [authenticate] }, async (req: any) => {
  const flow = db.prepare('SELECT * FROM fms_flow_instances WHERE id = ?').get(req.params.id) as any;
  if (!flow) return { error: 'Flow not found' };

  const steps = db.prepare(`
    SELECT s.*, u.name as assignee_name, cb.name as completed_by_name
    FROM fms_step_instances s
    LEFT JOIN users u ON u.id = s.assignee_user_id
    LEFT JOIN users cb ON cb.id = s.completed_by
    WHERE s.flow_id = ?
    ORDER BY s.step_no ASC, s.repeat_index ASC
  `).all(flow.id) as any[];

  return {
    flow: {
      ...flow,
      all_form_data: JSON.parse(flow.all_form_data || '{}'),
      steps: steps.map((s) => ({
        ...s,
        form_data: JSON.parse(s.form_data || '{}'),
      })),
    },
  };
});

// Assignee resolver helper: supports DIRECT_USER_PHONE, SHARED_USERS, USER, and DESIGNATION
function resolveAssigneeId(assigneeSpec: any, fallbackUserId: string): string {
  if (!assigneeSpec) return fallbackUserId;

  if (assigneeSpec.type === 'DIRECT_USER_PHONE') {
    const user = db.prepare(`
      SELECT id FROM users 
      WHERE (mobile = ? OR name LIKE ?) AND is_active = 1
      LIMIT 1
    `).get(assigneeSpec.phone, `%${assigneeSpec.name}%`) as any;
    if (user) return user.id;
  } else if (assigneeSpec.type === 'SHARED_USERS' && Array.isArray(assigneeSpec.users) && assigneeSpec.users.length > 0) {
    const u = assigneeSpec.users[0];
    const user = db.prepare(`
      SELECT id FROM users 
      WHERE (mobile = ? OR name LIKE ?) AND is_active = 1
      LIMIT 1
    `).get(u.phone, `%${u.name}%`) as any;
    if (user) return user.id;
  } else if (assigneeSpec.type === 'USER') {
    return assigneeSpec.user_id;
  } else if (assigneeSpec.type === 'DESIGNATION') {
    const user = db.prepare(`
      SELECT u.id FROM users u
      JOIN user_designations ud ON ud.user_id = u.id
      JOIN designations d ON d.id = ud.designation_id
      WHERE d.name LIKE ? AND u.is_active = 1
      LIMIT 1
    `).get(`%${assigneeSpec.designation_id}%`) as any;
    if (user) return user.id;
  }
  return fallbackUserId;
}

function resolveAssigneeIds(assigneeSpec: any, fallbackUserId: string): string[] {
  if (!assigneeSpec) return [fallbackUserId];

  if (assigneeSpec.type === 'SHARED_USERS' && Array.isArray(assigneeSpec.users)) {
    const ids: string[] = [];
    for (const u of assigneeSpec.users) {
      const user = db.prepare(`
        SELECT id FROM users 
        WHERE (mobile = ? OR name LIKE ?) AND is_active = 1
        LIMIT 1
      `).get(u.phone, `%${u.name}%`) as any;
      if (user && !ids.includes(user.id)) ids.push(user.id);
    }
    return ids.length > 0 ? ids : [fallbackUserId];
  }

  return [resolveAssigneeId(assigneeSpec, fallbackUserId)];
}

server.post('/api/fms/start', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { fms_code, form_data } = req.body;
  const def = fmsRegistry.get(fms_code);
  if (!def) return reply.status(400).send({ error: `FMS definition not found: ${fms_code}` });

  const flowId = randomUUID();
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM fms_flow_instances WHERE fms_code = ?').get(fms_code) as any).cnt + 1;
  const displayNumber = formatFmsDisplayNumber(fms_code, count);
  const now = new Date();

  // Create Flow instance
  db.prepare(`
    INSERT INTO fms_flow_instances (
      id, fms_code, display_number, status, current_step, started_by, started_at, all_form_data
    ) VALUES (?, ?, ?, 'ACTIVE', 1, ?, ?, ?)
  `).run(flowId, fms_code, displayNumber, req.user.id, now.toISOString(), JSON.stringify(form_data || {}));

  // Create Step 1 instance & advance immediately since started by creator
  const step1 = def.steps[0];
  const step1WorkId = WorkItemService.createWorkItem({
    source_module: 'fms',
    source_ref_id: flowId,
    fms_code,
    step_no: 1,
    assignee_user_id: req.user.id,
    title_en: `[${displayNumber}] ${step1.label.en}`,
    title_hi: `[${displayNumber}] ${step1.label.hi}`,
    is_important: step1.is_important,
    available_from: now,
    planned_at: now,
  });

  WorkItemService.completeWorkItem({
    work_item_id: step1WorkId,
    completed_by: req.user.id,
  });

  db.prepare(`
    INSERT INTO fms_step_instances (
      id, flow_id, step_no, repeat_index, assignee_user_id, work_item_id, status, form_data, available_from, planned_at, completed_at, completed_by
    ) VALUES (?, ?, 1, 0, ?, ?, 'DONE', ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    flowId,
    req.user.id,
    step1WorkId,
    JSON.stringify(form_data || {}),
    now.toISOString(),
    now.toISOString(),
    now.toISOString(),
    req.user.id
  );

  // Advance to Step 2 if exists
  if (def.steps.length > 1) {
    const step2 = def.steps[1];
    const assigneeIds = resolveAssigneeIds(step2.assignee, req.user.id);
    const { availableFrom, plannedAt } = calculateNextStepPlannedAt(now, step2, form_data || {}, def);

    for (const assigneeId of assigneeIds) {
      const step2WorkId = WorkItemService.createWorkItem({
        source_module: 'fms',
        source_ref_id: flowId,
        fms_code,
        step_no: 2,
        assignee_user_id: assigneeId,
        title_en: `[${displayNumber}] ${step2.label.en}`,
        title_hi: `[${displayNumber}] ${step2.label.hi}`,
        is_important: step2.is_important,
        available_from: availableFrom,
        planned_at: plannedAt,
      });

      db.prepare(`
        INSERT INTO fms_step_instances (
          id, flow_id, step_no, repeat_index, assignee_user_id, work_item_id, status, form_data, available_from, planned_at
        ) VALUES (?, ?, 2, 0, ?, ?, 'OPEN', '{}', ?, ?)
      `).run(
        randomUUID(),
        flowId,
        assigneeId,
        step2WorkId,
        availableFrom.toISOString(),
        plannedAt.toISOString()
      );
    }

    db.prepare('UPDATE fms_flow_instances SET current_step = 2 WHERE id = ?').run(flowId);
  }

  return { success: true, flow_id: flowId, display_number: displayNumber };
});

// ----------------------------------------------------
// CUSTOMER CRM MASTER APIs
// ----------------------------------------------------
server.get('/api/customers', { preHandler: [authenticate] }, async (req: any) => {
  const search = (req.query.search || '').trim();
  let customers;
  if (search) {
    customers = db.prepare(`
      SELECT * FROM customers 
      WHERE name ILIKE ? OR mobile LIKE ?
      ORDER BY name ASC LIMIT 50
    `).all(`%${search}%`, `%${search}%`);
  } else {
    customers = db.prepare('SELECT * FROM customers ORDER BY name ASC LIMIT 100').all();
  }
  return { customers };
});

server.post('/api/customers', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { name, mobile, category, whatsapp_opt_out, agent_name, crm_executive } = req.body || {};
  if (!name) return reply.status(400).send({ error: 'Customer name is required' });
  const existing = db.prepare('SELECT * FROM customers WHERE name ILIKE ?').get(name) as any;
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(`
      UPDATE customers SET 
        mobile = COALESCE(?, mobile),
        category = COALESCE(?, category),
        whatsapp_opt_out = COALESCE(?, whatsapp_opt_out),
        agent_name = COALESCE(?, agent_name),
        crm_executive = COALESCE(?, crm_executive),
        updated_at = ?
      WHERE id = ?
    `).run(
      mobile || null,
      category || null,
      whatsapp_opt_out !== undefined ? (whatsapp_opt_out ? 1 : 0) : null,
      agent_name || null,
      crm_executive || null,
      now,
      existing.id
    );
    return { success: true, customer_id: existing.id };
  } else {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO customers (id, name, mobile, category, whatsapp_opt_out, agent_name, crm_executive, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, mobile || null, category || 'A', whatsapp_opt_out ? 1 : 0, agent_name || null, crm_executive || null, now, now);
    return { success: true, customer_id: id };
  }
});

server.patch('/api/customers/:id/opt-out', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { opt_out } = req.body || {};
  const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!cust) return reply.status(404).send({ error: 'Customer not found' });
  db.prepare('UPDATE customers SET whatsapp_opt_out = ?, updated_at = ? WHERE id = ?').run(
    opt_out ? 1 : 0,
    new Date().toISOString(),
    req.params.id
  );
  return { success: true, whatsapp_opt_out: Boolean(opt_out) };
});

// Helper for O2C dispatch milestone triggers
function createCrmActionIfNotExists(
  flowId: string,
  actionType: 'DISPATCH_25' | 'DISPATCH_50' | 'DISPATCH_70',
  assigneeUserId: string,
  displayNumber: string,
  percentLabel: string
) {
  const existing = db.prepare('SELECT id FROM o2c_crm_actions WHERE flow_id = ? AND action_type = ?').get(flowId, actionType);
  if (existing) return;

  const actionId = randomUUID();
  const now = new Date();

  const titleEn = `[${displayNumber}] ${percentLabel} Dispatch Update Notification`;
  const titleHi = `[${displayNumber}] ${percentLabel} डिस्पैच अपडेट सूचना`;

  const workItemId = WorkItemService.createWorkItem({
    source_module: 'fms',
    source_ref_id: flowId,
    fms_code: 'O2C',
    step_no: actionType === 'DISPATCH_25' ? 5 : actionType === 'DISPATCH_50' ? 6 : 7,
    assignee_user_id: assigneeUserId,
    title_en: titleEn,
    title_hi: titleHi,
    is_important: false,
    available_from: now,
    planned_at: now,
  });

  db.prepare(`
    INSERT INTO o2c_crm_actions (
      id, flow_id, action_type, assignee_user_id, status, triggered_at, work_item_id
    ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(actionId, flowId, actionType, assigneeUserId, now.toISOString(), workItemId);
}

// ----------------------------------------------------
// O2C FMS DISPATCH & CRM ACTION APIs
// ----------------------------------------------------
server.post('/api/fms/o2c/add-dispatch', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { flow_id, dispatch_entry } = req.body;
  if (!flow_id || !dispatch_entry) {
    return reply.status(400).send({ error: 'flow_id and dispatch_entry are required' });
  }

  const billNo = (dispatch_entry.bill_no || '').trim();
  if (!billNo) {
    return reply.status(400).send({ error: 'Bill No. is required' });
  }

  // Global duplicate bill number check across ALL O2C flows
  const allO2CFlows = db.prepare(
    "SELECT id, display_number, all_form_data FROM fms_flow_instances WHERE fms_code = 'O2C' AND status != 'DELETED'"
  ).all() as any[];

  for (const f of allO2CFlows) {
    if (f.id === flow_id) continue;
    const fData = typeof f.all_form_data === 'string'
      ? JSON.parse(f.all_form_data || '{}')
      : (f.all_form_data || {});
    const existingDispatches = Array.isArray(fData.dispatches) ? fData.dispatches : [];
    const duplicate = existingDispatches.find(
      (d: any) => d.bill_no && d.bill_no.trim().toLowerCase() === billNo.toLowerCase()
    );
    if (duplicate) {
      return reply.status(400).send({
        error: `Bill No. "${billNo}" already exists in order ${f.display_number || f.id}. Duplicate bill numbers are not allowed across orders.`,
      });
    }
  }

  const flow = db.prepare('SELECT * FROM fms_flow_instances WHERE id = ?').get(flow_id) as any;
  if (!flow) return reply.status(404).send({ error: 'Flow not found' });

  const allFormData = JSON.parse(flow.all_form_data || '{}');
  const dispatches = Array.isArray(allFormData.dispatches) ? allFormData.dispatches : [];

  const duplicateInSame = dispatches.find(
    (d: any) => d.bill_no && d.bill_no.trim().toLowerCase() === billNo.toLowerCase()
  );
  if (duplicateInSame) {
    return reply.status(400).send({
      error: `Bill No. "${billNo}" has already been entered for this order.`,
    });
  }

  const newEntry = {
    id: randomUUID(),
    bill_no: billNo,
    bill_amount: Number(dispatch_entry.bill_amount) || 0,
    qty_dispatched: Number(dispatch_entry.qty_dispatched) || 0,
    product_category: dispatch_entry.product_category || 'Top / T-Shirt',
    cross_check_verified: dispatch_entry.cross_check_verified || 'Yes — Fully Verified',
    entered_by_accountant: dispatch_entry.entered_by_accountant || req.user.name || 'Accounts',
    created_at: new Date().toISOString(),
    created_by: req.user.name || req.user.id,
  };

  dispatches.push(newEntry);

  const totalOrdered = Number(allFormData.quantity) || 0;
  const totalDispatched = dispatches.reduce((sum: number, d: any) => sum + (Number(d.qty_dispatched) || 0), 0);
  const totalBillAmount = dispatches.reduce((sum: number, d: any) => sum + (Number(d.bill_amount) || 0), 0);
  const dispatchPercent = totalOrdered > 0 ? (totalDispatched / totalOrdered) * 100 : 0;

  allFormData.dispatches = dispatches;
  allFormData.total_dispatched = totalDispatched;
  allFormData.total_bill_amount = totalBillAmount;
  allFormData.dispatch_percent = Math.round(dispatchPercent * 10) / 10;

  db.prepare('UPDATE fms_flow_instances SET all_form_data = ? WHERE id = ?').run(
    JSON.stringify(allFormData),
    flow_id
  );

  // Trigger CRM Actions based on order size and % milestones
  const lalita = db.prepare("SELECT id FROM users WHERE mobile = ? OR name LIKE ?").get('9009200757', '%Lalita%') as any;
  const lalitaId = lalita ? lalita.id : req.user.id;

  if (totalOrdered >= 900 && dispatchPercent >= 25) {
    createCrmActionIfNotExists(flow.id, 'DISPATCH_25', lalitaId, flow.display_number, '25%');
  }
  if (totalOrdered >= 400 && dispatchPercent >= 50) {
    createCrmActionIfNotExists(flow.id, 'DISPATCH_50', lalitaId, flow.display_number, '50%');
  }
  if (totalOrdered >= 400 && dispatchPercent >= 70) {
    createCrmActionIfNotExists(flow.id, 'DISPATCH_70', lalitaId, flow.display_number, '70%');
  }

  return {
    success: true,
    total_dispatched: totalDispatched,
    total_bill_amount: totalBillAmount,
    dispatch_percent: allFormData.dispatch_percent,
    dispatches,
    can_complete: allFormData.dispatch_percent >= 80,
  };
});

server.post('/api/fms/o2c/remove-dispatch', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { flow_id, dispatch_id } = req.body;
  if (!flow_id || !dispatch_id) {
    return reply.status(400).send({ error: 'flow_id and dispatch_id are required' });
  }

  const flow = db.prepare('SELECT * FROM fms_flow_instances WHERE id = ?').get(flow_id) as any;
  if (!flow) return reply.status(404).send({ error: 'Flow not found' });

  const allFormData = JSON.parse(flow.all_form_data || '{}');
  const dispatches = (Array.isArray(allFormData.dispatches) ? allFormData.dispatches : []).filter(
    (d: any) => d.id !== dispatch_id
  );

  const totalOrdered = Number(allFormData.quantity) || 0;
  const totalDispatched = dispatches.reduce((sum: number, d: any) => sum + (Number(d.qty_dispatched) || 0), 0);
  const totalBillAmount = dispatches.reduce((sum: number, d: any) => sum + (Number(d.bill_amount) || 0), 0);
  const dispatchPercent = totalOrdered > 0 ? (totalDispatched / totalOrdered) * 100 : 0;

  allFormData.dispatches = dispatches;
  allFormData.total_dispatched = totalDispatched;
  allFormData.total_bill_amount = totalBillAmount;
  allFormData.dispatch_percent = Math.round(dispatchPercent * 10) / 10;

  db.prepare('UPDATE fms_flow_instances SET all_form_data = ? WHERE id = ?').run(
    JSON.stringify(allFormData),
    flow_id
  );

  return {
    success: true,
    total_dispatched: totalDispatched,
    total_bill_amount: totalBillAmount,
    dispatch_percent: allFormData.dispatch_percent,
    dispatches,
  };
});

server.get('/api/fms/o2c/crm-actions', { preHandler: [authenticate] }, async (req: any) => {
  const actions = db.prepare(`
    SELECT a.*, f.display_number, f.all_form_data
    FROM o2c_crm_actions a
    JOIN fms_flow_instances f ON f.id = a.flow_id
    WHERE a.status = 'PENDING'
    ORDER BY a.triggered_at DESC
  `).all() as any[];

  const enriched = actions.map((act) => {
    const fData = typeof act.all_form_data === 'string'
      ? JSON.parse(act.all_form_data || '{}')
      : (act.all_form_data || {});
    return {
      ...act,
      customer_name: fData.customer_name_corrected || fData.customer_name || 'Customer',
      customer_mobile: fData.customer_mobile || '',
      agent_name: fData.agent_name || '',
      transport: fData.transport_name || '',
      total_quantity: fData.quantity || 0,
      total_dispatched: fData.total_dispatched || 0,
      dispatch_percent: fData.dispatch_percent || 0,
      dispatches: fData.dispatches || [],
    };
  });

  return { crm_actions: enriched };
});

server.get('/api/fms/o2c/crm-actions/count', { preHandler: [authenticate] }, async () => {
  const row = db.prepare("SELECT COUNT(*) as count FROM o2c_crm_actions WHERE status = 'PENDING'").get() as any;
  return { count: row?.count || 0 };
});

server.post('/api/fms/o2c/complete-crm-action', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { action_id, lr_number, customer_sent, agent_sent } = req.body;
  if (!action_id) return reply.status(400).send({ error: 'action_id is required' });

  const act = db.prepare('SELECT * FROM o2c_crm_actions WHERE id = ?').get(action_id) as any;
  if (!act) return reply.status(404).send({ error: 'CRM action not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE o2c_crm_actions SET
      status = 'DONE',
      lr_number = COALESCE(?, lr_number),
      customer_sent = COALESCE(?, customer_sent),
      agent_sent = COALESCE(?, agent_sent),
      completed_at = ?
    WHERE id = ?
  `).run(lr_number || null, customer_sent ? 1 : 0, agent_sent ? 1 : 0, now, action_id);

  if (act.work_item_id) {
    WorkItemService.completeWorkItem({
      work_item_id: act.work_item_id,
      completed_by: req.user.id,
    });
  }

  return { success: true };
});

server.post('/api/fms/submit-step', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { flow_id, step_no, form_data, work_item_id } = req.body;
  const flow = db.prepare('SELECT * FROM fms_flow_instances WHERE id = ?').get(flow_id) as any;
  if (!flow) return reply.status(404).send({ error: 'Flow not found' });

  const def = fmsRegistry.get(flow.fms_code);
  if (!def) return reply.status(404).send({ error: 'FMS definition not found' });

  const stepDef = def.steps.find((s) => s.step_no === step_no);
  if (!stepDef) return reply.status(400).send({ error: `Step definition not found: ${step_no}` });

  // ----------------------------------------------------
  // O2C STEP SPECIFIC VALIDATIONS & HOOKS
  // ----------------------------------------------------
  if (flow.fms_code === 'O2C') {
    // Step 3: VASTRA order number global unique validation
    if (step_no === 3) {
      const vastraNo = (form_data.vastra_order_number || '').trim();
      if (vastraNo) {
        const allO2C = db.prepare(
          "SELECT id, display_number, all_form_data FROM fms_flow_instances WHERE fms_code = 'O2C' AND id != ? AND status != 'DELETED'"
        ).all(flow_id) as any[];
        for (const f of allO2C) {
          const fData = typeof f.all_form_data === 'string' ? JSON.parse(f.all_form_data || '{}') : (f.all_form_data || {});
          if (fData.vastra_order_number && fData.vastra_order_number.trim().toLowerCase() === vastraNo.toLowerCase()) {
            return reply.status(400).send({
              error: `VASTRA Order Number "${vastraNo}" already exists in order ${f.display_number || f.id}. Duplicate VASTRA numbers are not allowed.`,
            });
          }
        }
      }
    }
  }

  const now = new Date();
  const currentMergedFormData = { ...JSON.parse(flow.all_form_data || '{}'), ...form_data };

  // O2C Step Hooks after merging form data
  if (flow.fms_code === 'O2C') {
    // Step 2: Sync customer master & calculate payment terms
    if (step_no === 2) {
      const custName = form_data.customer_name_corrected || currentMergedFormData.customer_name || '';
      const custMobile = form_data.customer_mobile || '';
      const custCategory = form_data.customer_category ? (form_data.customer_category.includes('B') ? 'B' : form_data.customer_category.includes('C') ? 'C' : 'A') : 'A';
      
      if (custName) {
        const existing = db.prepare('SELECT id FROM customers WHERE name ILIKE ?').get(custName) as any;
        const nowIso = now.toISOString();
        if (existing) {
          db.prepare(`
            UPDATE customers SET 
              mobile = COALESCE(?, mobile),
              category = COALESCE(?, category),
              agent_name = COALESCE(?, agent_name),
              crm_executive = COALESCE(?, crm_executive),
              updated_at = ?
            WHERE id = ?
          `).run(custMobile || null, custCategory, form_data.agent_name || null, form_data.crm_executive || null, nowIso, existing.id);
        } else {
          db.prepare(`
            INSERT INTO customers (id, name, mobile, category, agent_name, crm_executive, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(randomUUID(), custName, custMobile || null, custCategory, form_data.agent_name || null, form_data.crm_executive || null, nowIso, nowIso);
        }
      }

      if (!form_data.payment_terms_days) {
        form_data.payment_terms_days = custCategory === 'C' ? 90 : custCategory === 'B' ? 45 : 30;
        currentMergedFormData.payment_terms_days = form_data.payment_terms_days;
      }
    }

    // Step 10: Auto-create Help Slip if problem is reported
    if (step_no === 10 && form_data.problem_description && form_data.problem_description.trim().length > 0) {
      const helpSlipId = randomUUID();
      const custName = currentMergedFormData.customer_name_corrected || currentMergedFormData.customer_name || 'Customer';
      db.prepare(`
        INSERT INTO help_slips (id, raised_by, text_content, status, created_at)
        VALUES (?, ?, ?, 'ASKED', ?)
      `).run(
        helpSlipId,
        req.user.id,
        `[O2C Quality/Delivery Issue - ${flow.display_number} - ${custName}]: ${form_data.problem_description.trim()}`,
        now.toISOString()
      );
    }

    // Step 11: Auto-calculate Payment Due Date
    if (step_no === 11) {
      const termsDays = Number(currentMergedFormData.payment_terms_days) || 30;
      const step8 = db.prepare('SELECT completed_at FROM fms_step_instances WHERE flow_id = ? AND step_no = 8').get(flow_id) as any;
      const baseDate = step8?.completed_at ? new Date(step8.completed_at) : now;
      const dueDate = new Date(baseDate.getTime() + termsDays * 24 * 60 * 60 * 1000);
      const dueDateFormatted = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      currentMergedFormData.payment_due_date = dueDateFormatted;
      currentMergedFormData.payment_due_timestamp = dueDate.toISOString();
    }

    // Step 16: Auto-escalate to KR (PSDM) if payment not received
    if (step_no === 16 && form_data.payment_received !== 'Yes — Received in Full') {
      const krUser = db.prepare('SELECT id FROM users WHERE mobile = ? OR name LIKE ?').get('9827055000', '%KR%') as any;
      if (krUser) {
        const custName = currentMergedFormData.customer_name_corrected || currentMergedFormData.customer_name || 'Customer';
        const billAmt = currentMergedFormData.total_bill_amount || 0;
        const delegationId = randomUUID();
        const delegWorkItemId = WorkItemService.createWorkItem({
          source_module: 'delegation',
          source_ref_id: delegationId,
          assignee_user_id: krUser.id,
          title_en: `[📌 Escalation] O2C Payment Recovery: ${flow.display_number} - ${custName} (₹${billAmt})`,
          title_hi: `[📌 एस्केलेशन] O2C पेमेंट वसूली: ${flow.display_number} - ${custName} (₹${billAmt})`,
          is_important: true,
          available_from: now,
          planned_at: addWorkingTime(now, 72),
          task_type: 'DELEGATION',
        });

        db.prepare(`
          INSERT INTO delegations (
            id, created_by, assignee_user_id, title_en, title_hi, tat_hours, is_important,
            status, work_item_id, deadline_at, deadline_no, is_delegation_task, created_at
          ) VALUES (?, ?, ?, ?, ?, 72, 1, 'OPEN', ?, ?, 1, 1, ?)
        `).run(
          delegationId,
          req.user.id,
          krUser.id,
          `O2C Payment Recovery: ${flow.display_number} - ${custName}`,
          `O2C पेमेंट वसूली: ${flow.display_number} - ${custName}`,
          delegWorkItemId,
          addWorkingTime(now, 72).toISOString(),
          now.toISOString()
        );
      }
    }
  }

  // Complete work item(s) for this step
  if (work_item_id) {
    WorkItemService.completeWorkItem({
      work_item_id,
      completed_by: req.user.id,
    });
  }
  // Also close any sibling work items for shared assignees on this step
  db.prepare(`
    UPDATE work_items 
    SET status = 'DONE', completed_at = ?, completed_by = ?
    WHERE source_module = 'fms' AND source_ref_id = ? AND step_no = ? AND status != 'DONE'
  `).run(now.toISOString(), req.user.id, flow_id, step_no);

  // Update step instance(s)
  db.prepare(`
    UPDATE fms_step_instances 
    SET status = 'DONE',
        form_data = ?,
        completed_at = ?,
        completed_by = ?
    WHERE flow_id = ? AND step_no = ? AND status = 'OPEN'
  `).run(JSON.stringify(form_data), now.toISOString(), req.user.id, flow_id, step_no);

  // Evaluate Next Action
  const nextAction = evaluateBranches(stepDef, form_data);

  if (nextAction === 'CLOSE') {
    db.prepare(`
      UPDATE fms_flow_instances 
      SET status = 'COMPLETED', completed_at = ?, all_form_data = ?
      WHERE id = ?
    `).run(now.toISOString(), JSON.stringify(currentMergedFormData), flow_id);
    return { success: true, action: 'CLOSE' };
  }

  let nextStepNo: number;
  if (typeof nextAction === 'object' && (nextAction as any).goto_step) {
    nextStepNo = (nextAction as any).goto_step;
  } else if (flow.fms_code === 'O2C' && step_no === 4) {
    nextStepNo = 8;
  } else {
    nextStepNo = step_no + 1;
  }
  const nextStepDef = def.steps.find((s) => s.step_no === nextStepNo);

  if (!nextStepDef) {
    // Flow complete
    db.prepare(`
      UPDATE fms_flow_instances 
      SET status = 'COMPLETED', completed_at = ?, all_form_data = ?
      WHERE id = ?
    `).run(now.toISOString(), JSON.stringify(currentMergedFormData), flow_id);
    return { success: true, action: 'COMPLETED' };
  }

  // Resolve next assignee(s) (supports SHARED_USERS)
  const assigneeIds = resolveAssigneeIds(nextStepDef.assignee, req.user.id);
  const { availableFrom, plannedAt } = calculateNextStepPlannedAt(now, nextStepDef, currentMergedFormData, def);

  for (const assigneeId of assigneeIds) {
    const nextWorkItemId = WorkItemService.createWorkItem({
      source_module: 'fms',
      source_ref_id: flow_id,
      fms_code: flow.fms_code,
      step_no: nextStepNo,
      assignee_user_id: assigneeId,
      title_en: `[${flow.display_number}] ${nextStepDef.label.en}`,
      title_hi: `[${flow.display_number}] ${nextStepDef.label.hi}`,
      is_important: nextStepDef.is_important,
      available_from: availableFrom,
      planned_at: plannedAt,
    });

    db.prepare(`
      INSERT INTO fms_step_instances (
        id, flow_id, step_no, repeat_index, assignee_user_id, work_item_id, status, form_data, available_from, planned_at
      ) VALUES (?, ?, ?, 0, ?, ?, 'OPEN', '{}', ?, ?)
    `).run(
      randomUUID(),
      flow_id,
      nextStepNo,
      assigneeId,
      nextWorkItemId,
      availableFrom.toISOString(),
      plannedAt.toISOString()
    );
  }

  db.prepare(`
    UPDATE fms_flow_instances 
    SET current_step = ?, all_form_data = ?
    WHERE id = ?
  `).run(nextStepNo, JSON.stringify(currentMergedFormData), flow_id);

  return { success: true, next_step: nextStepNo };
});

// Delete flow (Owner only -> copies to fms_deleted_repository)
server.delete('/api/fms/flows/:id', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER') {
    return reply.status(403).send({ error: 'Only the Owner can delete FMS records' });
  }

  const flow = db.prepare('SELECT * FROM fms_flow_instances WHERE id = ?').get(req.params.id) as any;
  if (!flow) return reply.status(404).send({ error: 'Flow not found' });

  const steps = db.prepare('SELECT * FROM fms_step_instances WHERE flow_id = ?').all(flow.id);
  const snapshot = { flow, steps };

  db.transaction(() => {
    db.prepare(`
      INSERT INTO fms_deleted_repository (
        id, flow_id, display_number, fms_code, deleted_by, deleted_at, full_snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      flow.id,
      flow.display_number,
      flow.fms_code,
      req.user.id,
      new Date().toISOString(),
      JSON.stringify(snapshot)
    );

    db.prepare("UPDATE fms_flow_instances SET status = 'DELETED' WHERE id = ?").run(flow.id);
    db.prepare("UPDATE work_items SET status = 'DONE' WHERE source_ref_id = ?").run(flow.id);
  })();

  return { success: true };
});

server.get('/api/fms/deleted-repository', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER') {
    return reply.status(403).send({ error: 'Only Owner can view deleted repository' });
  }
  const items = db.prepare(`
    SELECT d.*, u.name as deleted_by_name 
    FROM fms_deleted_repository d
    LEFT JOIN users u ON u.id = d.deleted_by
    ORDER BY d.deleted_at DESC
  `).all();
  return { deleted_flows: items };
});

// ----------------------------------------------------
// 5. CHECKLIST SYSTEM
// ----------------------------------------------------
server.get('/api/checklists/definitions', { preHandler: [authenticate] }, async () => {
  const definitions = db.prepare(`
    SELECT cd.*, 
      CASE WHEN cd.target_type = 'DESIGNATION' THEN d.name ELSE u.name END as target_name
    FROM checklist_definitions cd
    LEFT JOIN designations d ON d.id = cd.target_id
    LEFT JOIN users u ON u.id = cd.target_id
    ORDER BY cd.created_at DESC
  `).all();
  return { definitions };
});

server.post('/api/checklists/definitions', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }

  const { title_en, title_hi, target_type, target_id, frequency, start_date, due_time, is_important, video_url, is_compliance } = req.body;
  const id = randomUUID();
  const now = new Date();

  db.prepare(`
    INSERT INTO checklist_definitions (
      id, title_en, title_hi, target_type, target_id, frequency, start_date, due_time, is_important, is_compliance, video_url, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    id, title_en, title_hi, target_type, target_id, frequency, start_date || now.toISOString().split('T')[0],
    due_time || '19:00', is_important ? 1 : 0, is_compliance ? 1 : 0, video_url || null, now.toISOString()
  );

  // If target is a USER, create initial work item immediately
  if (target_type === 'USER') {
    const dueToday = new Date(now);
    const [dH, dM] = (due_time || '19:00').split(':').map(Number);
    dueToday.setHours(dH, dM, 0, 0);
    const plannedAt = dueToday > now ? dueToday : new Date(now.getTime() + 9 * 60 * 60 * 1000);

    const taskTypeTag = is_compliance ? 'COMPLIANCE' : 'REPETITIVE';

    WorkItemService.createWorkItem({
      source_module: 'checklist',
      source_ref_id: id,
      assignee_user_id: target_id,
      title_en: `${is_compliance ? '[🔒 Compliance] ' : ''}${title_en}`,
      title_hi: `${is_compliance ? '[🔒 अनुपालन] ' : ''}${title_hi}`,
      is_important: Boolean(is_important) || is_compliance === 1,
      available_from: now,
      planned_at: plannedAt,
      task_type: taskTypeTag,
    });
  }

  return { success: true, id };
});

server.delete('/api/checklists/definitions/:id', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { id } = req.params;
  db.prepare('UPDATE checklist_definitions SET is_active = 0 WHERE id = ?').run(id);
  // Also delete any open work items for this definition
  db.prepare("DELETE FROM work_items WHERE source_module = 'checklist' AND source_ref_id = ? AND status = 'OPEN'").run(id);
  return { success: true };
});

// ----------------------------------------------------
// 6. HELP SLIP
// ----------------------------------------------------
server.get('/api/help-slips', { preHandler: [authenticate] }, async (req: any) => {
  let slips;
  if (req.user.role === 'OWNER' || req.user.role === 'MANDATE_HOLDER') {
    slips = db.prepare(`
      SELECT hs.*, u.name as raised_by_name, u.mobile as raised_by_mobile
      FROM help_slips hs
      JOIN users u ON u.id = hs.raised_by
      WHERE hs.status != 'UNDERSTOOD'
      ORDER BY hs.created_at DESC
    `).all();
  } else {
    slips = db.prepare(`
      SELECT * FROM help_slips 
      WHERE raised_by = ? AND status != 'UNDERSTOOD'
      ORDER BY created_at DESC
    `).all(req.user.id);
  }
  return { help_slips: slips };
});

server.post('/api/help-slips', { preHandler: [authenticate] }, async (req: any) => {
  const { text_content, audio_url } = req.body;
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO help_slips (id, raised_by, text_content, audio_url, status, created_at)
    VALUES (?, ?, ?, ?, 'ASKED', ?)
  `).run(id, req.user.id, text_content || null, audio_url || null, now);

  return { success: true, id };
});

server.post('/api/help-slips/:id/answer', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }

  const { answer_text } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE help_slips
    SET answer_text = ?, answered_by = ?, answered_at = ?, status = 'ANSWERED'
    WHERE id = ?
  `).run(answer_text, req.user.id, now, req.params.id);

  return { success: true };
});

server.post('/api/help-slips/:id/understand', { preHandler: [authenticate] }, async (req: any) => {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE help_slips
    SET status = 'UNDERSTOOD', understood_at = ?
    WHERE id = ? AND raised_by = ?
  `).run(now, req.params.id, req.user.id);

  return { success: true };
});

// ----------------------------------------------------
// 7. MANDATE HOLDER — TEAM & TASK MANAGEMENT HUB
// ----------------------------------------------------

// --- A. Team Member Management (CRUD) ---

// Helper to sync designation tasks for a user when assigned a designation
function syncDesignationTasksForUser(userId: string, designationId: string) {
  const now = new Date();
  const templates = db.prepare(`
    SELECT * FROM designation_task_templates 
    WHERE designation_id = ? AND is_active = 1
  `).all(designationId) as any[];

  for (const t of templates) {
    const existing = db.prepare(`
      SELECT id FROM checklist_definitions 
      WHERE target_type = 'USER' AND target_id = ? AND title_en = ? AND frequency = ? AND is_active = 1
    `).get(userId, t.title_en, t.frequency);

    if (!existing) {
      const checklistId = randomUUID();
      db.prepare(`
        INSERT INTO checklist_definitions (
          id, title_en, title_hi, target_type, target_id, frequency, start_date,
          due_time, is_important, is_compliance, is_active, created_at
        ) VALUES (?, ?, ?, 'USER', ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        checklistId, t.title_en, t.title_hi, userId,
        t.frequency || 'DAILY', now.toISOString().split('T')[0],
        t.due_time || '19:00', t.is_important ? 1 : 0, t.is_compliance ? 1 : 0, now.toISOString()
      );

      const dueToday = new Date(now);
      const [dH, dM] = (t.due_time || '19:00').split(':').map(Number);
      dueToday.setHours(dH, dM, 0, 0);
      const plannedAt = dueToday > now ? dueToday : new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const taskTypeTag = t.is_compliance ? 'COMPLIANCE' : 'REPETITIVE';

      WorkItemService.createWorkItem({
        source_module: 'checklist',
        source_ref_id: checklistId,
        assignee_user_id: userId,
        title_en: `${t.is_compliance ? '[🔒 Compliance] ' : ''}${t.title_en}`,
        title_hi: `${t.is_compliance ? '[🔒 अनुपालन] ' : ''}${t.title_hi}`,
        is_important: Boolean(t.is_important) || t.is_compliance === 1,
        available_from: now,
        planned_at: plannedAt,
        task_type: taskTypeTag,
      });
    }
  }
}

server.get('/api/mandate/team', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const users = db.prepare(`
    SELECT id, name, mobile, role, selfie_url, is_active, created_at
    FROM users WHERE role != 'OWNER'
    ORDER BY name ASC
  `).all() as any[];

  const designations = db.prepare(`
    SELECT ud.user_id, d.id as designation_id, d.name, d.department
    FROM user_designations ud
    JOIN designations d ON d.id = ud.designation_id
  `).all() as any[];

  const allDesignations = db.prepare('SELECT * FROM designations ORDER BY name ASC').all();

  const userMap = users.map((u) => ({
    ...u,
    designations: designations.filter((d) => d.user_id === u.id),
  }));

  return { team: userMap, all_designations: allDesignations };
});

server.post('/api/mandate/team', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { name, mobile, role, designation_id } = req.body;
  if (!name || !mobile) return reply.status(400).send({ error: 'Name and mobile required' });

  const existing = db.prepare('SELECT id FROM users WHERE mobile = ?').get(mobile);
  if (existing) return reply.status(409).send({ error: 'User with this mobile already exists' });

  const id = randomUUID();
  const now = new Date().toISOString();
  const defaultPin = await bcrypt.hash('1234', 10);

  db.prepare(`
    INSERT INTO users (id, name, mobile, pin_hash, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(id, name, mobile, defaultPin, role || 'USER', now);

  if (designation_id) {
    db.prepare('INSERT OR IGNORE INTO user_designations (user_id, designation_id) VALUES (?, ?)').run(id, designation_id);
    syncDesignationTasksForUser(id, designation_id);
  }

  return { success: true, id, temp_pin: '1234' };
});

server.patch('/api/mandate/team/:userId', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { name, is_active, role } = req.body;
  const userId = req.params.userId;

  const updates: string[] = [];
  const values: any[] = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (role !== undefined) { updates.push('role = ?'); values.push(role); }
  if (updates.length === 0) return reply.status(400).send({ error: 'Nothing to update' });

  values.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return { success: true };
});

server.get('/api/mandate/team/:userId/tasks', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const tasks = db.prepare(`
    SELECT * FROM work_items
    WHERE assignee_user_id = ?
    AND (status = 'OPEN' OR DATE(completed_at) = DATE('now') OR DATE(planned_at) = DATE('now'))
    ORDER BY
      CASE WHEN status = 'DONE' THEN 1 ELSE 0 END ASC,
      is_important DESC, planned_at ASC
  `).all(req.params.userId);
  return { tasks };
});

server.post('/api/mandate/team/:userId/designations', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { designation_id } = req.body;
  db.prepare('INSERT OR IGNORE INTO user_designations (user_id, designation_id) VALUES (?, ?)').run(req.params.userId, designation_id);
  
  syncDesignationTasksForUser(req.params.userId, designation_id);
  return { success: true };
});

server.delete('/api/mandate/team/:userId/designations/:desigId', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  db.prepare('DELETE FROM user_designations WHERE user_id = ? AND designation_id = ?').run(req.params.userId, req.params.desigId);
  return { success: true };
});

// --- B. Designation-Based Bulk Task Assignment ---

server.get('/api/mandate/designation-tasks', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const templates = db.prepare(`
    SELECT dt.*, d.name as designation_name, d.department, u.name as created_by_name
    FROM designation_task_templates dt
    JOIN designations d ON d.id = dt.designation_id
    JOIN users u ON u.id = dt.created_by
    WHERE dt.is_active = 1
    ORDER BY dt.created_at DESC
  `).all();
  return { templates };
});

server.post('/api/mandate/designation-tasks', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { title_en, title_hi, priority, task_type, frequency, designation_id, is_important, due_time } = req.body;
  if (!title_en || !title_hi || !designation_id) return reply.status(400).send({ error: 'Title (en + hi) and designation required' });

  const id = randomUUID();
  const now = new Date();
  const isCompliance = task_type === 'COMPLIANCE' ? 1 : 0;

  db.prepare(`
    INSERT INTO designation_task_templates (
      id, title_en, title_hi, priority, task_type, frequency, designation_id,
      is_important, is_compliance, due_time, created_by, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    id, title_en, title_hi, priority || 'MEDIUM', task_type || 'REPETITIVE',
    frequency || 'DAILY', designation_id,
    is_important ? 1 : 0, isCompliance, due_time || '19:00',
    req.user.id, now.toISOString()
  );

  // Fan out to all users holding this designation
  const users = db.prepare(`
    SELECT u.id, u.name FROM users u
    JOIN user_designations ud ON ud.user_id = u.id
    WHERE ud.designation_id = ? AND u.is_active = 1
  `).all(designation_id) as any[];

  const taskTypeTag = isCompliance ? 'COMPLIANCE' : 'REPETITIVE';
  let assignedCount = 0;

  for (const user of users) {
    // Create a checklist definition per user
    const checklistId = randomUUID();
    db.prepare(`
      INSERT INTO checklist_definitions (
        id, title_en, title_hi, target_type, target_id, frequency, start_date,
        due_time, is_important, is_compliance, is_active, created_at
      ) VALUES (?, ?, ?, 'USER', ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      checklistId, title_en, title_hi, user.id,
      frequency || 'DAILY', now.toISOString().split('T')[0],
      due_time || '19:00', is_important ? 1 : 0, isCompliance, now.toISOString()
    );

    // Create initial work item
    const dueToday = new Date(now);
    const [dH, dM] = (due_time || '19:00').split(':').map(Number);
    dueToday.setHours(dH, dM, 0, 0);
    const plannedAt = dueToday > now ? dueToday : new Date(now.getTime() + 9 * 60 * 60 * 1000);

    WorkItemService.createWorkItem({
      source_module: 'checklist',
      source_ref_id: checklistId,
      assignee_user_id: user.id,
      title_en: `${isCompliance ? '[🔒 Compliance] ' : ''}${title_en}`,
      title_hi: `${isCompliance ? '[🔒 अनुपालन] ' : ''}${title_hi}`,
      is_important: Boolean(is_important) || isCompliance === 1,
      available_from: now,
      planned_at: plannedAt,
      task_type: taskTypeTag,
    });

    assignedCount++;
  }

  return { success: true, id, assigned_to_count: assignedCount, users: users.map(u => u.name) };
});

server.patch('/api/mandate/designation-tasks/:id', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { title_en, title_hi, priority, frequency, is_active } = req.body;
  const updates: string[] = [];
  const values: any[] = [];
  if (title_en !== undefined) { updates.push('title_en = ?'); values.push(title_en); }
  if (title_hi !== undefined) { updates.push('title_hi = ?'); values.push(title_hi); }
  if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
  if (frequency !== undefined) { updates.push('frequency = ?'); values.push(frequency); }
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (updates.length === 0) return reply.status(400).send({ error: 'Nothing to update' });
  values.push(req.params.id);
  db.prepare(`UPDATE designation_task_templates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return { success: true };
});

server.delete('/api/mandate/designation-tasks/:id', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  db.prepare('UPDATE designation_task_templates SET is_active = 0 WHERE id = ?').run(req.params.id);
  return { success: true };
});

// --- C. Delegation Tasks (3-Deadline Lifecycle) ---

server.get('/api/mandate/delegation-tasks', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const tasks = db.prepare(`
    SELECT d.*, u.name as assignee_name, u.mobile as assignee_mobile, u.selfie_url as assignee_selfie,
           c.name as created_by_name
    FROM delegations d
    JOIN users u ON u.id = d.assignee_user_id
    JOIN users c ON c.id = d.created_by
    WHERE d.is_delegation_task = 1 AND d.auto_replaced = 0
    ORDER BY d.created_at DESC
  `).all();
  return { delegation_tasks: tasks };
});

server.post('/api/mandate/delegation-tasks', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { assignee_user_id, title_en, title_hi, deadline_at, is_important } = req.body;
  if (!assignee_user_id || !title_en || !title_hi) {
    return reply.status(400).send({ error: 'Assignee, title_en, title_hi are required' });
  }

  const id = randomUUID();
  const now = new Date();

  // If deadline given, use it; otherwise, planned_at is far future (member sets later)
  const deadlineDate = deadline_at ? new Date(deadline_at) : null;
  const plannedAt = deadlineDate || addWorkingTime(now, 720); // 720h = ~80 days fallback

  const workItemId = WorkItemService.createWorkItem({
    source_module: 'delegation',
    source_ref_id: id,
    assignee_user_id,
    title_en: `[📌 Delegation] ${title_en}`,
    title_hi: `[📌 प्रतिनिधि कार्य] ${title_hi}`,
    is_important: Boolean(is_important),
    available_from: now,
    planned_at: plannedAt,
    task_type: 'DELEGATION',
  });

  db.prepare(`
    INSERT INTO delegations (
      id, created_by, assignee_user_id, title_en, title_hi, tat_hours, is_important,
      status, work_item_id, deadline_at, deadline_no, is_delegation_task, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, 1, 1, ?)
  `).run(
    id, req.user.id, assignee_user_id, title_en, title_hi,
    deadlineDate ? workingHoursBetween(now, deadlineDate) : 0,
    is_important ? 1 : 0,
    workItemId,
    deadline_at || null,
    now.toISOString()
  );

  return { success: true, id, work_item_id: workItemId };
});

server.patch('/api/mandate/delegation-tasks/:id/extend-deadline', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { new_deadline } = req.body;
  if (!new_deadline) return reply.status(400).send({ error: 'new_deadline is required' });

  const delegation = db.prepare('SELECT * FROM delegations WHERE id = ?').get(req.params.id) as any;
  if (!delegation) return reply.status(404).send({ error: 'Delegation task not found' });
  if (delegation.deadline_no >= 3) {
    return reply.status(400).send({ error: 'Maximum 3 deadlines reached. Task will auto-reset.' });
  }

  const newDeadlineNo = delegation.deadline_no + 1;
  const newDeadlineDate = new Date(new_deadline);

  db.prepare(`
    UPDATE delegations SET deadline_at = ?, deadline_no = ? WHERE id = ?
  `).run(new_deadline, newDeadlineNo, req.params.id);

  // Also update the work_item planned_at
  if (delegation.work_item_id) {
    db.prepare(`UPDATE work_items SET planned_at = ? WHERE id = ?`).run(newDeadlineDate.toISOString(), delegation.work_item_id);
  }

  return { success: true, deadline_no: newDeadlineNo };
});

server.post('/api/mandate/delegation-tasks/:id/mark-done', { preHandler: [authenticate] }, async (req: any, reply) => {
  const delegation = db.prepare('SELECT * FROM delegations WHERE id = ?').get(req.params.id) as any;
  if (!delegation) return reply.status(404).send({ error: 'Delegation task not found' });

  // Mark delegation as done
  db.prepare("UPDATE delegations SET status = 'DONE' WHERE id = ?").run(req.params.id);

  // Complete the work item
  if (delegation.work_item_id) {
    try {
      WorkItemService.completeWorkItem({
        work_item_id: delegation.work_item_id,
        completed_by: req.user.id,
        is_admin_override: req.user.role === 'OWNER' || req.user.role === 'MANDATE_HOLDER',
      });
    } catch (_) {
      // Already completed or locked — force override
      WorkItemService.overrideDone(delegation.work_item_id, req.user.id);
    }
  }

  return { success: true };
});

// Member sets their own deadline (when mandate holder didn't specify one)
server.patch('/api/delegations/:id/set-deadline', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { deadline_at } = req.body;
  if (!deadline_at) return reply.status(400).send({ error: 'deadline_at is required' });

  const delegation = db.prepare('SELECT * FROM delegations WHERE id = ? AND assignee_user_id = ?').get(req.params.id, req.user.id) as any;
  if (!delegation) return reply.status(404).send({ error: 'Delegation not found' });
  if (delegation.deadline_at) return reply.status(400).send({ error: 'Deadline already set' });
  if (delegation.deadline_no > 1) return reply.status(400).send({ error: 'Only the first deadline can be set by the member' });

  const deadlineDate = new Date(deadline_at);
  db.prepare('UPDATE delegations SET deadline_at = ? WHERE id = ?').run(deadline_at, req.params.id);

  if (delegation.work_item_id) {
    db.prepare('UPDATE work_items SET planned_at = ? WHERE id = ?').run(deadlineDate.toISOString(), delegation.work_item_id);
  }

  return { success: true };
});

// --- D. Auto-replace expired 3rd-deadline delegation tasks (called on server start + can be called on interval) ---
function checkExpiredDelegationTasks() {
  const now = new Date();
  const expiredTasks = db.prepare(`
    SELECT * FROM delegations
    WHERE is_delegation_task = 1
      AND status = 'OPEN'
      AND deadline_no >= 3
      AND deadline_at IS NOT NULL
      AND deadline_at < ?
      AND auto_replaced = 0
  `).all(now.toISOString()) as any[];

  for (const task of expiredTasks) {
    // Mark old task as auto-replaced
    db.prepare("UPDATE delegations SET status = 'MISSED', auto_replaced = 1 WHERE id = ?").run(task.id);

    // Mark old work item as MISSED
    if (task.work_item_id) {
      db.prepare("UPDATE work_items SET status = 'MISSED' WHERE id = ? AND status = 'OPEN'").run(task.work_item_id);
      db.prepare("UPDATE score_events SET is_done = 0, is_on_time = 0, updated_at = ? WHERE work_item_id = ?").run(now.toISOString(), task.work_item_id);
    }

    // Create fresh replacement
    const newId = randomUUID();
    const newWorkItemId = WorkItemService.createWorkItem({
      source_module: 'delegation',
      source_ref_id: newId,
      assignee_user_id: task.assignee_user_id,
      title_en: `[📌 Delegation] ${task.title_en}`,
      title_hi: `[📌 प्रतिनिधि कार्य] ${task.title_hi}`,
      is_important: Boolean(task.is_important),
      available_from: now,
      planned_at: addWorkingTime(now, 720), // No deadline — mandate holder will set
      task_type: 'DELEGATION',
    });

    db.prepare(`
      INSERT INTO delegations (
        id, created_by, assignee_user_id, title_en, title_hi, tat_hours, is_important,
        status, work_item_id, deadline_at, deadline_no, is_delegation_task, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, 'OPEN', ?, NULL, 1, 1, ?)
    `).run(
      newId, task.created_by, task.assignee_user_id, task.title_en, task.title_hi,
      task.is_important, newWorkItemId, now.toISOString()
    );

    // Link old → new
    db.prepare('UPDATE delegations SET replaced_by = ? WHERE id = ?').run(newId, task.id);
  }

  if (expiredTasks.length > 0) {
    console.log(`[DelegationCron] Auto-replaced ${expiredTasks.length} expired delegation task(s)`);
  }
}

// Run check hourly (startup check moved to start() function after db init/seeding)
const startDelegationCron = () => {
  checkExpiredDelegationTasks();
  setInterval(checkExpiredDelegationTasks, 60 * 60 * 1000);
};


// ----------------------------------------------------
// 7b. LEGACY DELEGATION SHEET (kept for backward compat)
// ----------------------------------------------------
server.get('/api/delegations', { preHandler: [authenticate] }, async (req: any) => {
  let delegations;
  if (req.user.role === 'OWNER' || req.user.role === 'MANDATE_HOLDER' || req.user.capabilities.includes('DELEGATION_SHEET')) {
    delegations = db.prepare(`
      SELECT d.*, u.name as assignee_name, u.mobile as assignee_mobile, c.name as created_by_name
      FROM delegations d
      JOIN users u ON u.id = d.assignee_user_id
      JOIN users c ON c.id = d.created_by
      ORDER BY d.created_at DESC
    `).all();
  } else {
    delegations = db.prepare(`
      SELECT d.*, c.name as created_by_name
      FROM delegations d
      JOIN users c ON c.id = d.created_by
      WHERE d.assignee_user_id = ?
      ORDER BY d.created_at DESC
    `).all(req.user.id);
  }
  return { delegations };
});

server.post('/api/delegations', { preHandler: [authenticate] }, async (req: any, reply) => {
  const canDelegate = req.user.role === 'OWNER' || req.user.role === 'MANDATE_HOLDER' || req.user.capabilities.includes('DELEGATION_SHEET');
  if (!canDelegate) return reply.status(403).send({ error: 'Permission denied' });

  const { assignee_user_id, title_en, title_hi, tat_hours, is_important } = req.body;
  const id = randomUUID();
  const now = new Date();
  const plannedAt = addWorkingTime(now, Number(tat_hours) || 9);

  const workItemId = WorkItemService.createWorkItem({
    source_module: 'delegation',
    source_ref_id: id,
    assignee_user_id,
    title_en: `[Delegated] ${title_en}`,
    title_hi: `[सौंपा गया कार्य] ${title_hi}`,
    is_important: Boolean(is_important),
    available_from: now,
    planned_at: plannedAt,
    task_type: 'DELEGATION',
  });

  db.prepare(`
    INSERT INTO delegations (
      id, created_by, assignee_user_id, title_en, title_hi, tat_hours, is_important, status, work_item_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
  `).run(
    id, req.user.id, assignee_user_id, title_en, title_hi, tat_hours, is_important ? 1 : 0, workItemId, now.toISOString()
  );

  return { success: true, id, work_item_id: workItemId };
});

// ----------------------------------------------------
// 8. AUDIT & DELAY DASHBOARDS
// ----------------------------------------------------
server.get('/api/audit/delay-dashboard', { preHandler: [authenticate] }, async () => {
  const now = new Date();
  const lateItems = db.prepare(`
    SELECT w.*, u.name as assignee_name, u.mobile as assignee_mobile
    FROM work_items w
    JOIN users u ON u.id = w.assignee_user_id
    WHERE w.status = 'OPEN' AND w.planned_at < ?
    ORDER BY w.planned_at ASC
  `).all(now.toISOString()) as any[];

  return {
    late_items: lateItems.map((item) => ({
      ...item,
      delay_hours: workingHoursBetween(new Date(item.planned_at), now),
      whatsapp_url: `https://wa.me/91${item.assignee_mobile}?text=${encodeURIComponent(
        `Ketan Aditya Ops Alert: Your task "${item.title_en}" is overdue. Please update status in app.`
      )}`,
      call_url: `tel:+91${item.assignee_mobile}`,
    })),
  };
});

server.get('/api/audit/daily-sample', { preHandler: [authenticate] }, async () => {
  // Draw 10 random completed items from across all systems
  const sample = db.prepare(`
    SELECT w.*, u.name as assignee_name, u.mobile as assignee_mobile
    FROM work_items w
    JOIN users u ON u.id = w.assignee_user_id
    WHERE w.status = 'DONE'
    ORDER BY RANDOM()
    LIMIT 10
  `).all();

  return { sample };
});

server.post('/api/audit/verify', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { work_item_id, result, notes } = req.body;
  if (result === 'FALSE') {
    WorkItemService.flagFalse(work_item_id, req.user.name, notes);
  }

  db.prepare(`
    INSERT INTO audit_logs (id, work_item_id, audited_by, audit_date, result, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), work_item_id, req.user.name, new Date().toISOString(), result, notes || null);

  return { success: true };
});

// ----------------------------------------------------
// 9. ADMIN & MASTER LISTS
// ----------------------------------------------------
server.get('/api/admin/users', { preHandler: [authenticate] }, async () => {
  const users = db.prepare('SELECT id, name, mobile, email, role, selfie_url, is_active FROM users').all() as any[];
  const designations = db.prepare(`
    SELECT ud.user_id, d.name 
    FROM user_designations ud 
    JOIN designations d ON d.id = ud.designation_id
  `).all() as any[];

  const userMap = users.map((u) => ({
    ...u,
    designations: designations.filter((d) => d.user_id === u.id).map((d) => d.name),
  }));

  return { users: userMap };
});

// GET all users with their systems — for Config > Access sub-tab
server.get('/api/admin/users-with-systems', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }

  const users = db.prepare(`
    SELECT id, name, mobile, role, is_active
    FROM users
    WHERE is_active = 1 AND role != 'OWNER'
    ORDER BY name ASC
  `).all() as any[];

  const designations = db.prepare(`
    SELECT ud.user_id, d.name 
    FROM user_designations ud 
    JOIN designations d ON d.id = ud.designation_id
  `).all() as any[];

  const allSystems = db.prepare('SELECT user_id, system_code FROM user_systems').all() as any[];

  const userMap = users.map((u) => ({
    ...u,
    designations: designations.filter((d) => d.user_id === u.id).map((d) => d.name),
    systems: allSystems.filter((s) => s.user_id === u.id).map((s) => s.system_code),
  }));

  return { users: userMap };
});

// PUT update a user's systems — replaces entire set atomically
server.put('/api/admin/users/:userId/systems', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }

  const { userId } = req.params;
  const { systems } = req.body as { systems: string[] };

  const VALID_SYSTEMS = ['CL', 'O2C', 'Purchase'];
  const sanitized = (systems || []).filter((s) => VALID_SYSTEMS.includes(s));

  // Atomic replace — delete then re-insert
  db.prepare('DELETE FROM user_systems WHERE user_id = ?').run(userId);
  const insert = db.prepare('INSERT INTO user_systems (user_id, system_code) VALUES (?, ?)');
  for (const code of sanitized) {
    insert.run(userId, code);
  }

  return { success: true, userId, systems: sanitized };
});


server.get('/api/admin/master-lists', { preHandler: [authenticate] }, async (req: any) => {
  const keyFilter = req.query?.key;

  // When ?key= is provided, return { items: [...] } for that specific list key
  // This is used by O2DOrderModal dropdowns (customers, transports, agents)
  if (keyFilter) {
    const rows = db.prepare('SELECT item_value FROM master_lists WHERE list_key = ? ORDER BY item_value').all(keyFilter) as any[];
    return { items: rows.map((r: any) => r.item_value) };
  }

  // Full master-lists response (used by admin views)
  const lists = db.prepare('SELECT * FROM master_lists').all() as any[];
  const grouped: Record<string, string[]> = {};
  const detailed: Record<string, any[]> = {};

  for (const item of lists) {
    if (!grouped[item.list_key]) grouped[item.list_key] = [];
    if (!detailed[item.list_key]) detailed[item.list_key] = [];

    grouped[item.list_key].push(item.item_value);
    
    let extra = {};
    try {
      extra = typeof item.extra_json === 'string' ? JSON.parse(item.extra_json || '{}') : (item.extra_json || {});
    } catch {}

    detailed[item.list_key].push({
      id: item.id,
      value: item.item_value,
      extra,
    });
  }
  return { master_lists: grouped, detailed_lists: detailed };
});

server.post('/api/master-lists/add', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { list_key, item_value, extra } = req.body || {};
  if (!list_key || !item_value || !item_value.trim()) {
    return reply.status(400).send({ error: 'list_key and item_value are required' });
  }

  const cleanVal = item_value.trim();
  const existing = db.prepare('SELECT id FROM master_lists WHERE list_key = ? AND LOWER(item_value) = LOWER(?)').get(list_key, cleanVal);
  if (existing) {
    return { success: true, item_value: cleanVal, already_exists: true };
  }

  const id = `ml-${list_key}-${cleanVal.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
  const extraJson = JSON.stringify(extra || {});
  
  db.prepare('INSERT INTO master_lists (id, list_key, item_value, extra_json) VALUES (?, ?, ?, ?)').run(
    id, list_key, cleanVal, extraJson
  );

  return { success: true, item_value: cleanVal, id };
});

server.post('/api/admin/master-lists', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }
  const { list_key, item_value } = req.body;
  db.prepare('INSERT INTO master_lists (id, list_key, item_value) VALUES (?, ?, ?)').run(
    randomUUID(), list_key, item_value
  );
  return { success: true };
});

server.post('/api/upload', { preHandler: [authenticate] }, async (req: any, reply) => {
  try {
    if (req.isMultipart && req.isMultipart()) {
      const data = await req.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });
      const ext = path.extname(data.filename) || '.jpg';
      const fileName = `upload-${randomUUID()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      const buffer = await data.toBuffer();
      fs.writeFileSync(filePath, buffer);
      return { success: true, url: `/uploads/${fileName}` };
    }

    // Base64 JSON fallback
    const { base64Data, fileName: origName } = req.body || {};
    if (!base64Data) {
      return reply.status(400).send({ error: 'base64Data or multipart file required' });
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');
    const ext = origName ? path.extname(origName) : '.jpg';
    const fileName = `upload-${randomUUID()}${ext || '.jpg'}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    return { success: true, url: `/uploads/${fileName}` };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message || 'Upload failed' });
  }
});

server.get('/api/admin/health', { preHandler: [authenticate] }, async () => {
  const workItemCount = (db.prepare('SELECT COUNT(*) as cnt FROM work_items').get() as any).cnt;
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;
  const flowCount = (db.prepare('SELECT COUNT(*) as cnt FROM fms_flow_instances').get() as any).cnt;

  return {
    status: 'HEALTHY',
    version: '2.0.0-phase1',
    uptime_seconds: process.uptime(),
    stats: {
      total_users: userCount,
      total_work_items: workItemCount,
      active_flows: flowCount,
    },
    database: 'Supabase PostgreSQL 17 (Cloud-Native)',
  };
});

server.get('/api/admin/video-backlog', { preHandler: [authenticate] }, async () => {
  const missing = db.prepare('SELECT * FROM checklist_definitions WHERE video_url IS NULL OR video_url = ""').all();
  return { missing_videos: missing };
});

// Start Server & Auto-Seed
const PORT = Number(process.env.PORT) || 3000;
async function start() {
  try {
    await seedDatabase();
    startDelegationCron();
    O2CScheduler.checkAndCreateScheduledTasks();
    setInterval(() => O2CScheduler.checkAndCreateScheduledTasks(), 30 * 60 * 1000);
  } catch (err: any) {
    console.warn('\n⚠️ Database seed skipped on startup:', err.message);
    if (process.env.DATABASE_URL?.includes('[YOUR-DB-PASSWORD]')) {
      console.warn('👉 Please update .env with your Supabase database password (DATABASE_URL).\n');
    }
  }

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Ketan Aditya Ops API running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to start Fastify server:', err);
    process.exit(1);
  }
}

start();
