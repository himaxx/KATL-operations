/**
 * PostgreSQL Database Adapter for KATL-Operations
 * Supabase Project: KATL-Operations (rjcgkmsqgzugvwxkkqfh)
 *
 * Provides a synchronous-compatible better-sqlite3 API backed by PostgreSQL,
 * using the execSync worker-thread Atomics bridge for blocking queries.
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
const usePostgres = Boolean(DATABASE_URL && !DATABASE_URL.includes('YOUR-DB-PASSWORD') && DATABASE_URL.startsWith('postgres'));

let dbInstance: any;
let initDbFn: () => void;

if (!usePostgres) {
  const dbPath = path.resolve(process.cwd(), 'data', 'katl_ops.db');
  const dbDir = path.dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  dbInstance = sqliteDb;
  initDbFn = () => {
    console.log('✅ SQLite connected: data/katl_ops.db');
  };
} else {


// ─── Shared memory buffer for sync bridge ─────────────────────────────────────
// Layout: [0-3] signal int32 | [4-7] dataLen int32 | [8-...] data bytes (8MB)
const DATA_SIZE = 8 * 1024 * 1024; // 8 MB
const sab = new SharedArrayBuffer(8 + DATA_SIZE);
const signalArr = new Int32Array(sab, 0, 1);
const lenArr = new Int32Array(sab, 4, 1);
const dataArr = new Uint8Array(sab, 8, DATA_SIZE);

// ─── Worker thread (CJS eval, uses postgres package directly) ─────────────────
const WORKER_SRC = `
const { workerData, parentPort } = require('worker_threads');
const postgres = require('postgres');

const sql = postgres(workerData.url, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: 'require',
});

const sab = workerData.sab;
const signalArr = new Int32Array(sab, 0, 1);
const lenArr    = new Int32Array(sab, 4, 1);
const dataArr   = new Uint8Array(sab, 8);
const DATA_SIZE = dataArr.length;

parentPort.on('message', async ({ query, params }) => {
  let resultJson;
  try {
    const rows = await sql.unsafe(query, params ?? []);
    resultJson = JSON.stringify({ ok: true, rows: Array.from(rows), rowCount: rows.count ?? rows.length });
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

const worker = new Worker(WORKER_SRC, {
  eval: true,
  workerData: { url: DATABASE_URL, sab },
});

worker.on('error', (e) => { console.error('DB worker error:', e.message); });

// ─── Core sync execution ──────────────────────────────────────────────────────
function execSync(query: string, params: unknown[] = []): { rows: any[]; rowCount: number } {
  Atomics.store(signalArr, 0, 0);
  worker.postMessage({ query, params });

  const waitResult = Atomics.wait(signalArr, 0, 0, 30_000);
  if (waitResult === 'timed-out') throw new Error(`DB timeout: ${query.substring(0, 80)}...`);

  const len = Atomics.load(lenArr, 0);
  const buf = Buffer.from(sab, 8, len);
  const parsed = JSON.parse(buf.toString('utf8'));
  if (!parsed.ok) throw new Error(`DB error: ${parsed.error}\nQuery: ${query.substring(0, 200)}`);
  return { rows: parsed.rows, rowCount: parsed.rowCount };
}

// ─── SQLite → PostgreSQL query translation ────────────────────────────────────

/** Replace ? with $1, $2, ... (SQLite → PG positional params) */
function toPostgres(sqlite: string): string {
  let i = 0;
  // Also replace SQLite-specific syntax
  return sqlite
    .replace(/\?/g, () => `$${++i}`)
    // SQLite DATE(col) → DATE(col AT TIME ZONE 'UTC') handled by query rewrite below
    .replace(/INSERT OR IGNORE/gi, 'INSERT')
    .replace(/INSERT OR REPLACE/gi, 'INSERT')
    .replace(/\bINTEGER\b/gi, 'BIGINT')
    .replace(/\bTEXT\b/gi, 'TEXT');
}

/** Map ON CONFLICT handling for INSERT OR IGNORE → ON CONFLICT DO NOTHING */
function fixConflict(sql: string): string {
  if (/INSERT OR IGNORE/i.test(sql)) {
    return sql.replace(/INSERT OR IGNORE/i, 'INSERT') + ' ON CONFLICT DO NOTHING';
  }
  if (/INSERT OR REPLACE/i.test(sql)) {
    // Replace with UPSERT - strip " ON CONFLICT DO NOTHING" that might have been added
    const base = sql.replace(/INSERT OR REPLACE/i, 'INSERT');
    return base; // Caller handles ON CONFLICT
  }
  return sql;
}

/** Fix SQLite-specific date functions for PostgreSQL */
function fixDateFunctions(sql: string): string {
  return sql
    // SQLite: DATE(col, '+330 minutes') → PG: DATE((col::timestamptz AT TIME ZONE 'Asia/Kolkata'))
    .replace(/DATE\((\w+),\s*['"]\+330 minutes['"]\)/g, `(($1::timestamptz AT TIME ZONE 'Asia/Kolkata')::date)`)
    // SQLite: DATE('now', 'localtime') → PG: CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'
    .replace(/DATE\('now',\s*'localtime'\)/g, `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`)
    // SQLite: DATE('now') → PG: CURRENT_DATE
    .replace(/DATE\('now'\)/g, `CURRENT_DATE`)
    // SQLite: DATE(col) → PG: (col::timestamptz)::date
    .replace(/DATE\((\w+)\)/g, `($1::timestamptz)::date`)
    // SQLite: DATE(col, 'localtime') → PG: (col::timestamptz AT TIME ZONE 'Asia/Kolkata')::date
    .replace(/DATE\((\w+),\s*'localtime'\)/g, `($1::timestamptz AT TIME ZONE 'Asia/Kolkata')::date`);
}

/** Normalize params: boolean integers for PG are fine, JSON strings stay strings */
function normalizeParams(params: unknown[]): unknown[] {
  return params.map(p => {
    if (p === undefined) return null;
    return p;
  });
}

/** Map PG row to SQLite-compatible format (booleans→0/1, dates→ISO strings, jsonb→strings) */
function mapRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = null;
    } else if (typeof v === 'boolean') {
      out[k] = v ? 1 : 0;
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (typeof v === 'object') {
      // JSONB → JSON string (matches SQLite TEXT behavior)
      out[k] = JSON.stringify(v);
    } else if (typeof v === 'bigint') {
      out[k] = Number(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ─── Prepared Statement (SQLite-compatible) ───────────────────────────────────
class PgStatement {
  private pgSql: string;
  private isInsertOrIgnore: boolean;
  private isInsertOrReplace: boolean;

  constructor(private originalSql: string) {
    this.isInsertOrIgnore = /INSERT OR IGNORE/i.test(originalSql);
    this.isInsertOrReplace = /INSERT OR REPLACE/i.test(originalSql);

    let s = originalSql;
    s = fixDateFunctions(s);
    s = fixConflict(s);
    s = toPostgres(s);

    if (this.isInsertOrIgnore && !s.includes('ON CONFLICT')) {
      s += ' ON CONFLICT DO NOTHING';
    }

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
    return rows.map(r => mapRow(r as any));
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
      try { execSync('ROLLBACK'); } catch (_) {}
      throw e;
    }
  };
}

// ─── Database object (drop-in for better-sqlite3 `db`) ───────────────────────
class PgDatabase {
  prepare(sql: string) {
    return new PgStatement(sql);
  }

  exec(sql: string): void {
    // Multi-statement exec — split on semicolons
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const s of stmts) {
      try { execSync(s); } catch (e: any) {
        // Ignore "already exists" errors during schema init
        if (!e.message?.includes('already exists')) throw e;
      }
    }
  }

  pragma(_pragma: string): void {
    // PostgreSQL handles WAL/foreign keys automatically — no-op
  }

  transaction(fn: () => void): () => void {
    return pgTransaction(fn);
  }
}

  dbInstance = new PgDatabase();
  initDbFn = () => {
    try {
      const test = dbInstance.prepare('SELECT 1 AS ok').get();
      console.log('✅ PostgreSQL connected — Supabase KATL-Operations (ap-northeast-2)');
    } catch (e: any) {
      console.error('❌ PostgreSQL connection failed:', e.message);
      process.exit(1);
    }
  };
}

export const db = dbInstance;

export function initDatabase(): void {
  initDbFn();
}

