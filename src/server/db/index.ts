import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'katl_ops.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE,
      email TEXT UNIQUE,
      pin_hash TEXT,
      password_hash TEXT,
      role TEXT NOT NULL CHECK(role IN ('OWNER', 'MANDATE_HOLDER', 'USER')),
      selfie_url TEXT,
      temp_pin TEXT,
      temp_pin_expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS designations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_designations (
      user_id TEXT NOT NULL,
      designation_id TEXT NOT NULL,
      PRIMARY KEY (user_id, designation_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS designation_capabilities (
      designation_id TEXT NOT NULL,
      capability TEXT NOT NULL,
      PRIMARY KEY (designation_id, capability),
      FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      source_module TEXT NOT NULL,
      source_ref_id TEXT NOT NULL,
      fms_code TEXT,
      step_no INTEGER,
      assignee_user_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      is_important INTEGER DEFAULT 0,
      available_from TEXT NOT NULL,
      planned_at TEXT NOT NULL,
      first_opened_at TEXT,
      completed_at TEXT,
      completed_by TEXT,
      queue_wait_hours REAL,
      delay_hours REAL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'DONE', 'MISSED', 'FLAGGED_FALSE')),
      flagged_false_by TEXT,
      flagged_false_reason TEXT,
      locked_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS score_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_item_id TEXT NOT NULL UNIQUE,
      week_start_date TEXT NOT NULL,
      weight INTEGER NOT NULL,
      is_done INTEGER NOT NULL,
      is_on_time INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checklist_definitions (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('DESIGNATION', 'USER')),
      target_id TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
      start_date TEXT NOT NULL,
      due_time TEXT NOT NULL DEFAULT '19:00',
      is_important INTEGER DEFAULT 0,
      video_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fms_flow_instances (
      id TEXT PRIMARY KEY,
      fms_code TEXT NOT NULL,
      display_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'DELETED')),
      current_step INTEGER NOT NULL DEFAULT 1,
      started_by TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      settled_by TEXT,
      settled_at TEXT,
      all_form_data TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (started_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fms_step_instances (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      step_no INTEGER NOT NULL,
      repeat_index INTEGER NOT NULL DEFAULT 0,
      assignee_user_id TEXT NOT NULL,
      work_item_id TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      form_data TEXT NOT NULL DEFAULT '{}',
      available_from TEXT NOT NULL,
      planned_at TEXT NOT NULL,
      completed_at TEXT,
      completed_by TEXT,
      FOREIGN KEY (flow_id) REFERENCES fms_flow_instances(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fms_deleted_repository (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      display_number TEXT NOT NULL,
      fms_code TEXT NOT NULL,
      deleted_by TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      full_snapshot_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS help_slips (
      id TEXT PRIMARY KEY,
      raised_by TEXT NOT NULL,
      text_content TEXT,
      audio_url TEXT,
      status TEXT NOT NULL DEFAULT 'ASKED' CHECK(status IN ('ASKED', 'ANSWERED', 'UNDERSTOOD')),
      answer_text TEXT,
      answered_by TEXT,
      created_at TEXT NOT NULL,
      answered_at TEXT,
      understood_at TEXT,
      FOREIGN KEY (raised_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS delegations (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      assignee_user_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      tat_hours REAL NOT NULL,
      is_important INTEGER DEFAULT 0,
      questions_json TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      work_item_id TEXT,
      change_request_text TEXT,
      change_request_status TEXT DEFAULT 'NONE' CHECK(change_request_status IN ('NONE', 'PENDING', 'APPROVED', 'DENIED')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assignee_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS master_lists (
      id TEXT PRIMARY KEY,
      list_key TEXT NOT NULL,
      item_value TEXT NOT NULL,
      extra_json TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL,
      audited_by TEXT NOT NULL,
      audit_date TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('VERIFIED', 'FALSE')),
      notes TEXT,
      FOREIGN KEY (work_item_id) REFERENCES work_items(id)
    );

    CREATE TABLE IF NOT EXISTS queue_snapshots (
      id TEXT PRIMARY KEY,
      snapshot_at TEXT NOT NULL,
      source_module TEXT NOT NULL,
      fms_code TEXT,
      step_no INTEGER,
      designation_id TEXT,
      items_waiting INTEGER NOT NULL,
      oldest_item_wait_hours REAL NOT NULL,
      avg_wait_hours REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS designation_task_templates (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
      task_type TEXT NOT NULL DEFAULT 'REPETITIVE' CHECK(task_type IN ('REPETITIVE', 'COMPLIANCE')),
      frequency TEXT NOT NULL CHECK(frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
      designation_id TEXT NOT NULL,
      is_important INTEGER DEFAULT 0,
      is_compliance INTEGER DEFAULT 0,
      due_time TEXT DEFAULT '19:00',
      video_url TEXT,
      created_by TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (designation_id) REFERENCES designations(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON work_items(assignee_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_work_items_planned ON work_items(planned_at);
    CREATE INDEX IF NOT EXISTS idx_work_items_source ON work_items(source_module);
    CREATE INDEX IF NOT EXISTS idx_score_events_user_week ON score_events(user_id, week_start_date);
    CREATE INDEX IF NOT EXISTS idx_master_lists_key ON master_lists(list_key);
    CREATE INDEX IF NOT EXISTS idx_desig_task_templates ON designation_task_templates(designation_id);
    CREATE INDEX IF NOT EXISTS idx_delegations_assignee ON delegations(assignee_user_id, status);
  `);

  // Additive schema migrations — safe to re-run (try/catch for SQLite which lacks IF NOT EXISTS on ADD COLUMN)
  const safeAddColumn = (table: string, col: string, colDef: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${colDef}`); } catch (_) { /* column already exists */ }
  };

  // Delegation lifecycle columns
  safeAddColumn('delegations', 'deadline_at', 'TEXT');
  safeAddColumn('delegations', 'deadline_no', 'INTEGER DEFAULT 1');
  safeAddColumn('delegations', 'auto_replaced', 'INTEGER DEFAULT 0');
  safeAddColumn('delegations', 'replaced_by', 'TEXT');
  safeAddColumn('delegations', 'is_delegation_task', 'INTEGER DEFAULT 0');

  // Compliance flag on checklist definitions
  safeAddColumn('checklist_definitions', 'is_compliance', 'INTEGER DEFAULT 0');

  // Task type tag on work_items for frontend color coding
  safeAddColumn('work_items', 'task_type', "TEXT DEFAULT 'REPETITIVE'");
}
