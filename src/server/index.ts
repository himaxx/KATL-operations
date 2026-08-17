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
import { seedDatabase } from './seed';
import { WorkItemService } from './services/workItemService';
import { calculateMISScore, ScoreItemInput } from '../core/scoring/engine';
import { fmsRegistry, calculateNextStepPlannedAt, evaluateBranches, formatFmsDisplayNumber } from '../fms';
import { workingHoursBetween, addWorkingTime, getISTComponents } from '../core/working-time/engine';
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

  const payload = {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    designations: designations.map((d) => d.name),
    capabilities,
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

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    designations: designations.map((d) => d.name),
    capabilities,
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

  return {
    user: {
      ...user,
      designations: designations.map((d) => d.name),
      capabilities: user.role === 'OWNER' || user.role === 'MANDATE_HOLDER' 
        ? ['DELAY_DASHBOARD', 'AUDIT', 'DELEGATION_SHEET', 'VIDEO_BACKLOG', 'IMPORTANT_MISS_ALERT']
        : capabilities,
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
  // Return all tasks for today (both OPEN and DONE) plus any open tasks so completed tasks stay visible for the day!
  const items = db.prepare(`
    SELECT * FROM work_items 
    WHERE assignee_user_id = ? 
      AND (status = 'OPEN' OR DATE(completed_at) = DATE('now') OR DATE(planned_at) = DATE('now'))
    ORDER BY 
      CASE WHEN status = 'DONE' THEN 1 ELSE 0 END ASC,
      is_important DESC, 
      planned_at ASC
  `).all(req.user.id) as any[];

  const now = new Date();
  const enhancedItems = items.map((item) => {
    const plannedAt = new Date(item.planned_at);
    const nowIST = getISTComponents(now);
    const plannedIST = getISTComponents(plannedAt);
    
    const isPastDate = nowIST.dateStr > plannedIST.dateStr;
    const isPast8PM = nowIST.dateStr === plannedIST.dateStr && (nowIST.hours >= 20);
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
server.get('/api/scores/my', { preHandler: [authenticate] }, async (req: any) => {
  const period = req.query?.period || 'today';
  let query = `
    SELECT id, assignee_user_id as userId, is_important as isImportant,
           planned_at as plannedAt, completed_at as completedAt,
           status, title_en as titleEn, title_hi as titleHi,
           flagged_false_by as flaggedFalseBy, flagged_false_reason as flaggedFalseReason
    FROM work_items
    WHERE assignee_user_id = ?
  `;

  if (period === 'today') {
    query += ` AND (DATE(planned_at) = DATE('now') OR DATE(completed_at) = DATE('now'))`;
  }

  const items = db.prepare(query).all(req.user.id) as any[];

  const formattedItems: ScoreItemInput[] = items.map((i) => ({
    ...i,
    isImportant: Boolean(i.isImportant),
    plannedAt: new Date(i.plannedAt),
    completedAt: i.completedAt ? new Date(i.completedAt) : null,
  }));

  const scoreResult = calculateMISScore(req.user.id, formattedItems);
  return { score: scoreResult };
});

server.get('/api/scores/team', { preHandler: [authenticate] }, async (req: any, reply) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'MANDATE_HOLDER') {
    return reply.status(403).send({ error: 'Permission denied' });
  }

  const period = req.query?.period || 'today';
  const users = db.prepare('SELECT id, name, mobile, role FROM users WHERE is_active = 1').all() as any[];
  
  const teamScores = users.map((u) => {
    let query = `
      SELECT id, assignee_user_id as userId, is_important as isImportant,
             planned_at as plannedAt, completed_at as completedAt,
             status, title_en as titleEn, title_hi as titleHi,
             flagged_false_by as flaggedFalseBy
      FROM work_items
      WHERE assignee_user_id = ?
    `;

    if (period === 'today') {
      query += ` AND (DATE(planned_at) = DATE('now') OR DATE(completed_at) = DATE('now'))`;
    }

    const items = db.prepare(query).all(u.id) as any[];

    const formatted: ScoreItemInput[] = items.map((i) => ({
      ...i,
      isImportant: Boolean(i.isImportant),
      plannedAt: new Date(i.plannedAt),
      completedAt: i.completedAt ? new Date(i.completedAt) : null,
    }));

    const score = calculateMISScore(u.id, formatted);
    return {
      userId: u.id,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      totalTasks: items.length,
      doneTasksCount: score.doneItems.length,
      pendingTasksCount: score.notDoneItems.length,
      ...score,
    };
  });

  return { team_scores: teamScores };
});

// ----------------------------------------------------
// 4. FMS FLOWS & STEP EXECUTION
// ----------------------------------------------------
server.get('/api/fms/definitions', { preHandler: [authenticate] }, async () => {
  return { definitions: fmsRegistry.getAll() };
});

server.get('/api/fms/flows', { preHandler: [authenticate] }, async (req: any) => {
  const flows = db.prepare(`
    SELECT f.*, u.name as started_by_name
    FROM fms_flow_instances f
    LEFT JOIN users u ON u.id = f.started_by
    WHERE f.status != 'DELETED'
    ORDER BY f.started_at DESC
  `).all() as any[];

  return {
    flows: flows.map((f) => ({
      ...f,
      all_form_data: JSON.parse(f.all_form_data || '{}'),
    })),
  };
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
    let assigneeId = req.user.id;

    // Resolve assignee
    if (step2.assignee.type === 'DESIGNATION') {
      const user = db.prepare(`
        SELECT u.id FROM users u
        JOIN user_designations ud ON ud.user_id = u.id
        JOIN designations d ON d.id = ud.designation_id
        WHERE d.name LIKE ? AND u.is_active = 1
        LIMIT 1
      `).get(`%${step2.assignee.designation_id}%`) as any;
      if (user) assigneeId = user.id;
    }

    const { availableFrom, plannedAt } = calculateNextStepPlannedAt(now, step2, form_data || {}, def);

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

    db.prepare('UPDATE fms_flow_instances SET current_step = 2 WHERE id = ?').run(flowId);
  }

  return { success: true, flow_id: flowId, display_number: displayNumber };
});

server.post('/api/fms/submit-step', { preHandler: [authenticate] }, async (req: any, reply) => {
  const { flow_id, step_no, form_data, work_item_id } = req.body;
  const flow = db.prepare('SELECT * FROM fms_flow_instances WHERE id = ?').get(flow_id) as any;
  if (!flow) return reply.status(404).send({ error: 'Flow not found' });

  const def = fmsRegistry.get(flow.fms_code);
  if (!def) return reply.status(404).send({ error: 'FMS definition not found' });

  const stepDef = def.steps.find((s) => s.step_no === step_no);
  if (!stepDef) return reply.status(400).send({ error: `Step definition not found: ${step_no}` });

  const now = new Date();
  const currentMergedFormData = { ...JSON.parse(flow.all_form_data || '{}'), ...form_data };

  // Complete work item
  if (work_item_id) {
    WorkItemService.completeWorkItem({
      work_item_id,
      completed_by: req.user.id,
    });
  }

  // Update step instance
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

  const nextStepNo = typeof nextAction === 'object' && nextAction.goto_step ? nextAction.goto_step : step_no + 1;
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

  // Resolve next assignee
  let assigneeId = req.user.id;
  if (nextStepDef.assignee.type === 'DESIGNATION') {
    const u = db.prepare(`
      SELECT u.id FROM users u
      JOIN user_designations ud ON ud.user_id = u.id
      JOIN designations d ON d.id = ud.designation_id
      WHERE d.name LIKE ? AND u.is_active = 1
      LIMIT 1
    `).get(`%${nextStepDef.assignee.designation_id}%`) as any;
    if (u) assigneeId = u.id;
  }

  const { availableFrom, plannedAt } = calculateNextStepPlannedAt(now, nextStepDef, currentMergedFormData, def);

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

server.get('/api/admin/master-lists', { preHandler: [authenticate] }, async () => {
  const lists = db.prepare('SELECT * FROM master_lists').all() as any[];
  const grouped: Record<string, string[]> = {};
  for (const item of lists) {
    if (!grouped[item.list_key]) grouped[item.list_key] = [];
    grouped[item.list_key].push(item.item_value);
  }
  return { master_lists: grouped };
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
    database: 'SQLite WAL Mode (Ready for PostgreSQL sync)',
  };
});

server.get('/api/admin/video-backlog', { preHandler: [authenticate] }, async () => {
  const missing = db.prepare('SELECT * FROM checklist_definitions WHERE video_url IS NULL OR video_url = ""').all();
  return { missing_videos: missing };
});

// Start Server & Auto-Seed
const PORT = Number(process.env.PORT) || 3000;
async function start() {
  await seedDatabase();
  startDelegationCron();
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Ketan Aditya Ops API running on http://localhost:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
