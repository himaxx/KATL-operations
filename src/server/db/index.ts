/**
 * Supabase PostgreSQL Database Adapter for KATL-Operations
 * Project: KATL-Operations (rjcgkmsqgzugvwxkkqfh)
 *
 * Provides a high-performance PostgreSQL connection pool with both:
 * 1. Synchronous compatibility interface (db.prepare().get() / .all() / .run(), db.transaction())
 *    backed by worker-thread SharedArrayBuffer Atomics bridge for zero-breakage backend operations.
 * 2. Asynchronous query helpers (query, queryOne, execute, sql template tag).
 *
 * Completely replaces SQLite — Supabase is the sole database engine.
 */

import { Worker } from 'worker_threads';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';

if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-DB-PASSWORD]')) {
  console.warn('\n⚠️  [SUPABASE CONFIG WARNING]');
  console.warn('DATABASE_URL in .env contains placeholder [YOUR-DB-PASSWORD].');
  console.warn('Please update .env with your Supabase database password:');
  console.warn('DATABASE_URL=postgresql://postgres.rjcgkmsqgzugvwxkkqfh:YOUR_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres\n');
}

// ─── Shared memory buffer for sync bridge ─────────────────────────────────────
// Layout: [0-3] signal int32 | [4-7] dataLen int32 | [8-...] data bytes (16MB)
const DATA_SIZE = 16 * 1024 * 1024; // 16 MB max payload
const sab = new SharedArrayBuffer(8 + DATA_SIZE);
const signalArr = new Int32Array(sab, 0, 1);
const lenArr = new Int32Array(sab, 4, 1);

// ─── Worker thread (CJS eval, uses postgres package directly) ─────────────────
const WORKER_SRC = `
const { workerData, parentPort } = require('worker_threads');
const postgres = require('postgres');

const url = workerData.url;
let sql;

try {
  sql = postgres(url, {
    max: 1,
    idle_timeout: 30,
    connect_timeout: 15,
    ssl: 'require',
    transform: {
      undefined: null,
    },
  });
} catch (err) {
  console.error('Failed to initialize postgres connection pool in worker:', err.message);
}

const sab = workerData.sab;
const signalArr = new Int32Array(sab, 0, 1);
const lenArr    = new Int32Array(sab, 4, 1);
const dataArr   = new Uint8Array(sab, 8);
const DATA_SIZE = dataArr.length;

parentPort.on('message', async ({ query, params }) => {
  let resultJson;
  try {
    if (!sql) {
      throw new Error('PostgreSQL connection pool not initialized. Check DATABASE_URL.');
    }
    const rows = await sql.unsafe(query, params ?? []);
    resultJson = JSON.stringify({ 
      ok: true, 
      rows: Array.from(rows), 
      rowCount: rows.count ?? rows.length 
    });
  } catch (e) {
    resultJson = JSON.stringify({ ok: false, error: e.message });
  }

  const encoded = Buffer.from(resultJson, 'utf8');
  const len = Math.min(encoded.length, DATA_SIZE);
  encoded.copy(Buffer.from(sab, 8, DATA_SIZE), 0, 0, len);
  Atomics.store(lenArr, 0, len);
  Atomics.store(signalArr, 0, 1);
  Atomics.notify(signalArr, 0);
});
`;

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(WORKER_SRC, {
      eval: true,
      workerData: { url: DATABASE_URL, sab },
    });
    worker.on('error', (e: any) => {
      console.error('❌ Supabase PostgreSQL worker error:', e?.message || e);
    });
  }
  return worker;
}

// ─── Core sync execution ──────────────────────────────────────────────────────
function execSync(query: string, params: unknown[] = []): { rows: any[]; rowCount: number } {
  if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-DB-PASSWORD]')) {
    throw new Error('Supabase password missing in .env. Please replace [YOUR-DB-PASSWORD] in DATABASE_URL with your actual Supabase database password.');
  }

  const w = getWorker();
  Atomics.store(signalArr, 0, 0);
  w.postMessage({ query, params });

  const waitResult = Atomics.wait(signalArr, 0, 0, 30_000);
  if (waitResult === 'timed-out') {
    throw new Error(`Supabase query timeout (30s): ${query.substring(0, 100)}...`);
  }

  const len = Atomics.load(lenArr, 0);
  const buf = Buffer.from(sab, 8, len);
  const parsed = JSON.parse(buf.toString('utf8'));
  if (!parsed.ok) {
    throw new Error(`Supabase Database error: ${parsed.error}\nQuery: ${query.substring(0, 300)}`);
  }
  return { rows: parsed.rows, rowCount: parsed.rowCount };
}

// ─── Query translation & dialect mapping (SQLite → PostgreSQL) ────────────────

/** Replace ? with $1, $2, ... for PostgreSQL positional parameters */
function toPostgresParams(sqlite: string): string {
  let i = 0;
  return sqlite.replace(/\?/g, () => `$${++i}`);
}

/** Map ON CONFLICT handling for INSERT OR IGNORE / INSERT OR REPLACE */
function fixConflict(sql: string): string {
  let s = sql;
  if (/INSERT OR IGNORE INTO/i.test(s)) {
    s = s.replace(/INSERT OR IGNORE INTO/i, 'INSERT INTO');
    if (!/ON CONFLICT/i.test(s)) {
      s += ' ON CONFLICT DO NOTHING';
    }
  }
  if (/INSERT OR REPLACE INTO checklist_definitions/i.test(s)) {
    s = s.replace(/INSERT OR REPLACE INTO checklist_definitions/i, 'INSERT INTO checklist_definitions');
    if (!/ON CONFLICT/i.test(s)) {
      s += ` ON CONFLICT (id) DO UPDATE SET 
        title_en = EXCLUDED.title_en,
        title_hi = EXCLUDED.title_hi,
        is_important = EXCLUDED.is_important,
        due_time = EXCLUDED.due_time,
        is_active = EXCLUDED.is_active`;
    }
  } else if (/INSERT OR REPLACE INTO/i.test(s)) {
    s = s.replace(/INSERT OR REPLACE INTO/i, 'INSERT INTO');
    if (!/ON CONFLICT/i.test(s)) {
      s += ' ON CONFLICT (id) DO NOTHING';
    }
  }
  return s;
}

/** Fix SQLite boolean integer comparisons and values (col = 1 / col = 0) for PostgreSQL boolean columns */
function fixBooleanExpressions(sql: string): string {
  return sql
    .replace(/\b(is_active|is_important|is_done|is_on_time|is_compliance|auto_replaced|is_delegation_task)\s*=\s*1\b/gi, '$1 = TRUE')
    .replace(/\b(is_active|is_important|is_done|is_on_time|is_compliance|auto_replaced|is_delegation_task)\s*=\s*0\b/gi, '$1 = FALSE')
    .replace(/\b(is_active|is_important|is_done|is_on_time|is_compliance|auto_replaced|is_delegation_task)\s*!=\s*1\b/gi, '$1 = FALSE')
    .replace(/\b(is_active|is_important|is_done|is_on_time|is_compliance|auto_replaced|is_delegation_task)\s*!=\s*0\b/gi, '$1 = TRUE')
    .replace(/\bSET\s+is_done\s*=\s*1\b/gi, 'SET is_done = TRUE')
    .replace(/\bSET\s+is_done\s*=\s*0\b/gi, 'SET is_done = FALSE')
    .replace(/\bSET\s+is_on_time\s*=\s*1\b/gi, 'SET is_on_time = TRUE')
    .replace(/\bSET\s+is_on_time\s*=\s*0\b/gi, 'SET is_on_time = FALSE')
    .replace(/\bSET\s+is_active\s*=\s*1\b/gi, 'SET is_active = TRUE')
    .replace(/\bSET\s+is_active\s*=\s*0\b/gi, 'SET is_active = FALSE');
}

/** Translate SQLite-specific date functions for PostgreSQL with Asia/Kolkata (IST) timezone */
function fixDateFunctions(sql: string): string {
  return sql
    // SQLite: DATE(col, '+330 minutes') → PG: DATE((col::timestamptz AT TIME ZONE 'Asia/Kolkata'))
    .replace(/DATE\((\w+),\s*['"]\+330 minutes['"]\)/g, `(($1::timestamptz AT TIME ZONE 'Asia/Kolkata')::date)`)
    // SQLite: DATE('now', 'localtime') → PG: (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    .replace(/DATE\('now',\s*'localtime'\)/g, `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`)
    // SQLite: DATE('now') → PG: (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    .replace(/DATE\('now'\)/g, `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`)
    // SQLite: DATE(col, 'localtime') → PG: (col::timestamptz AT TIME ZONE 'Asia/Kolkata')::date
    .replace(/DATE\((\w+),\s*'localtime'\)/g, `($1::timestamptz AT TIME ZONE 'Asia/Kolkata')::date`)
    // SQLite: DATE(col) → PG: (col::timestamptz AT TIME ZONE 'Asia/Kolkata')::date
    .replace(/DATE\((\w+)\)/g, `($1::timestamptz AT TIME ZONE 'Asia/Kolkata')::date`);
}

/** Normalize parameters for PostgreSQL */
function normalizeParams(params: unknown[]): unknown[] {
  return params.map((p) => {
    if (p === undefined) return null;
    return p;
  });
}

/** Map PostgreSQL row types to JavaScript values */
function mapRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = null;
    } else if (typeof v === 'boolean') {
      out[k] = v ? 1 : 0; // Expose as 1/0 for existing frontend boolean comparisons, and truthy in JS
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (typeof v === 'object') {
      // JSONB column → JSON string (matches SQLite text representation expected by certain parsers)
      out[k] = JSON.stringify(v);
    } else if (typeof v === 'bigint') {
      out[k] = Number(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ─── Prepared Statement (SQLite API Compatible for Supabase PostgreSQL) ───────
class PgStatement {
  private pgSql: string;

  constructor(private originalSql: string) {
    let s = originalSql;
    s = fixDateFunctions(s);
    s = fixConflict(s);
    s = fixBooleanExpressions(s);
    s = toPostgresParams(s);
    this.pgSql = s;
  }

  get(...args: unknown[]): any {
    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const { rows } = execSync(this.pgSql, normalizeParams(params));
    return rows.length > 0 ? mapRow(rows[0] as any) : undefined;
  }

  all(...args: unknown[]): any[] {
    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const { rows } = execSync(this.pgSql, normalizeParams(params));
    return rows.map((r) => mapRow(r as any));
  }

  run(...args: unknown[]): { changes: number; lastInsertRowid: number } {
    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const { rowCount } = execSync(this.pgSql, normalizeParams(params));
    return { changes: rowCount, lastInsertRowid: 0 };
  }
}

// ─── Transaction wrapper ──────────────────────────────────────────────────────
function pgTransaction(fn: () => void): () => void {
  return () => {
    execSync('BEGIN');
    try {
      fn();
      execSync('COMMIT');
    } catch (e) {
      try {
        execSync('ROLLBACK');
      } catch (_) {}
      throw e;
    }
  };
}

// ─── Supabase Database Object ────────────────────────────────────────────────
class SupabaseDatabase {
  prepare(sql: string): PgStatement {
    return new PgStatement(sql);
  }

  exec(sql: string): void {
    const stmts = sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of stmts) {
      try {
        execSync(s);
      } catch (e: any) {
        if (!e.message?.includes('already exists')) throw e;
      }
    }
  }

  pragma(_pragma: string): void {
    // No-op in PostgreSQL (WAL mode and foreign keys are natively managed by Supabase)
  }

  transaction(fn: () => void): () => void {
    return pgTransaction(fn);
  }
}

export const db = new SupabaseDatabase();

export function initDatabase(): void {
  try {
    const test = db.prepare('SELECT 1 AS ok').get();
    console.log('✅ Supabase PostgreSQL Connected: KATL-Operations (ap-northeast-2)');
  } catch (e: any) {
    console.error('❌ Supabase connection test failed:', e.message);
    if (DATABASE_URL.includes('[YOUR-DB-PASSWORD]')) {
      console.error('👉 Please update DATABASE_URL in .env with your Supabase database password.');
    }
  }
}
