/**
 * Fix Issue 1: Remove 'Purchase' system from Akash Soni's user_systems
 * Akash Soni (mobile: 7771002882) should only have CL and O2D, NOT Purchase.
 */
import { db } from '../src/server/db/index.ts';

// Find Akash Soni's user ID
const akash = db.prepare("SELECT id, name, mobile FROM users WHERE mobile = '7771002882'").get() as any;
if (!akash) {
  console.error('❌ Akash Soni (7771002882) not found in users table');
  process.exit(1);
}

console.log(`Found user: ${akash.name} (ID: ${akash.id})`);

// Check current systems
const currentSystems = db.prepare('SELECT * FROM user_systems WHERE user_id = ?').all(akash.id) as any[];
console.log('Current systems:', currentSystems.map((s: any) => s.system_code));

// Remove Purchase system
const result = db.prepare("DELETE FROM user_systems WHERE user_id = ? AND system_code = 'Purchase'").run(akash.id);
console.log(`Deleted ${result.changes} row(s) with system_code='Purchase'`);

// Verify
const afterSystems = db.prepare('SELECT * FROM user_systems WHERE user_id = ?').all(akash.id) as any[];
console.log('Systems after fix:', afterSystems.map((s: any) => s.system_code));
console.log('✅ Issue 1 fixed: Akash Soni no longer has Purchase FMS access');
