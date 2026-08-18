import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data/katl_ops.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// Fetch existing valid IDs in parent tables to sanitize any orphan foreign keys
const users = db.prepare('SELECT id, name FROM users').all();
const validUserIds = new Set(users.map(r => r.id));
const nameToUserId = new Map(users.map(r => [r.name.toLowerCase().trim(), r.id]));

const validDesignationIds = new Set(db.prepare('SELECT id FROM designations').all().map(r => r.id));
const validWorkItemIds = new Set(db.prepare('SELECT id FROM work_items').all().map(r => r.id));
const validFlowIds = new Set(db.prepare('SELECT id FROM fms_flow_instances').all().map(r => r.id));

const tables = [
  'users',
  'designations',
  'master_lists',
  'holidays',
  'user_designations',
  'designation_capabilities',
  'checklist_definitions',
  'designation_task_templates',
  'fms_flow_instances',
  'work_items',
  'fms_step_instances',
  'delegations',
  'score_events',
  'fms_deleted_repository',
  'help_slips',
  'audit_logs',
  'queue_snapshots'
];

const BOOLEAN_COLUMNS = new Set([
  'is_active',
  'is_important',
  'is_done',
  'is_on_time',
  'is_compliance',
  'auto_replaced',
  'is_delegation_task'
]);

const JSON_COLUMNS = new Set([
  'all_form_data',
  'form_data',
  'questions_json',
  'extra_json',
  'full_snapshot_json'
]);

function sanitizeRow(tbl, row) {
  // If work_item_id is not in work_items table, set to null
  if (row.work_item_id && !validWorkItemIds.has(row.work_item_id)) {
    row.work_item_id = null;
  }
  // If flow_id is not in fms_flow_instances table, set to null
  if (row.flow_id && !validFlowIds.has(row.flow_id)) {
    row.flow_id = null;
  }
  // If designation_id is not in designations table, set to null
  if (row.designation_id && !validDesignationIds.has(row.designation_id)) {
    row.designation_id = null;
  }
  // If assignee_user_id is not in users table, map or null
  if (row.assignee_user_id && !validUserIds.has(row.assignee_user_id)) {
    const matched = nameToUserId.get(String(row.assignee_user_id).toLowerCase().trim());
    row.assignee_user_id = matched || null;
  }
  // If created_by is not in users table, map or null
  if (row.created_by && !validUserIds.has(row.created_by)) {
    const matched = nameToUserId.get(String(row.created_by).toLowerCase().trim());
    row.created_by = matched || null;
  }
  // If raised_by is not in users table, map or null
  if (row.raised_by && !validUserIds.has(row.raised_by)) {
    const matched = nameToUserId.get(String(row.raised_by).toLowerCase().trim());
    row.raised_by = matched || null;
  }
  // If audited_by is not in users table (e.g. was stored as staff name 'Kanchan Kori'), resolve to user ID
  if (row.audited_by && !validUserIds.has(row.audited_by)) {
    const matched = nameToUserId.get(String(row.audited_by).toLowerCase().trim());
    row.audited_by = matched || null;
  }
  return row;
}

function formatSqlValue(val, colName) {
  if (val === null || val === undefined) return 'NULL';

  // Explicitly check boolean columns
  if (BOOLEAN_COLUMNS.has(colName)) {
    return (val === 1 || val === '1' || val === true || val === 'true') ? 'TRUE' : 'FALSE';
  }

  // Handle JSON
  if (JSON_COLUMNS.has(colName)) {
    let str = String(val);
    if (!str || str.trim() === '') str = '{}';
    return `'${str.replace(/'/g, "''")}'::jsonb`;
  }

  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';

  // Escape single quotes for SQL string
  let str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

let fullExportSql = `-- =========================================================
-- KATL Operations: Supabase Data Export from Local SQLite DB
-- Generated on: ${new Date().toISOString()}
-- =========================================================

BEGIN;

`;

let stats = {};

for (const tbl of tables) {
  try {
    let rows = db.prepare(`SELECT * FROM ${tbl}`).all();
    stats[tbl] = rows.length;
    if (rows.length === 0) continue;

    fullExportSql += `\n-- Table: ${tbl} (${rows.length} rows)\n`;
    const cols = Object.keys(rows[0]);
    
    for (let row of rows) {
      row = sanitizeRow(tbl, row);
      const colNames = cols.join(', ');
      const valStr = cols.map(c => formatSqlValue(row[c], c)).join(', ');
      fullExportSql += `INSERT INTO public.${tbl} (${colNames}) VALUES (${valStr}) ON CONFLICT DO NOTHING;\n`;
    }
  } catch (err) {
    console.warn(`Could not read table ${tbl}:`, err.message);
  }
}

fullExportSql += `\nCOMMIT;\n`;

fs.writeFileSync('supabase_data_seed.sql', fullExportSql, 'utf-8');
console.log('Successfully regenerated supabase_data_seed.sql:');
console.log(JSON.stringify(stats, null, 2));
