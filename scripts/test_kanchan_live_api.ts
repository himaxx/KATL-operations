import { db } from '../src/server/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'katl-ops-super-secret-jwt-key-2026';

async function testKanchanLive() {
  console.log('=== Testing Kanchan Live Score API ===');

  const user = db.prepare("SELECT * FROM users WHERE mobile = '9876543210'").get() as any;
  if (!user) {
    console.log('❌ Kanchan user not found in DB');
    return;
  }

  // Create JWT token for Kanchan
  const token = jwt.sign(
    { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log(`Kanchan ID: ${user.id}`);

  // Fetch Kanchan's open tasks for today
  const todayTasks = db.prepare(`
    SELECT * FROM work_items 
    WHERE assignee_user_id = ? AND ((planned_at::timestamptz AT TIME ZONE 'Asia/Kolkata')::date) = ((NOW() AT TIME ZONE 'Asia/Kolkata')::date)
    ORDER BY created_at ASC
  `).all(user.id) as any[];

  console.log(`Today's tasks count: ${todayTasks.length}`);
  for (const t of todayTasks) {
    console.log(`- [${t.status}] ${t.title_en} (${t.id})`);
  }

  // Check scores across all 4 periods
  for (const period of ['daily', 'weekly', 'monthly', 'quarterly']) {
    const res = await fetch(`http://localhost:3000/api/scores/my?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`\nPeriod: ${period.toUpperCase()}`);
      console.log(`  Work Done: ${data.score.displayWorkDone} (${data.score.weightedDone}/${data.score.weightedDue} wt)`);
      console.log(`  On Time:   ${data.score.displayWorkOnTime} (${data.score.weightedOnTime}/${data.score.weightedDue} wt)`);
      console.log(`  Done count: ${data.score.doneItems.length}, Pending count: ${data.score.notDoneItems.length}`);
    } else {
      console.log(`API call failed for ${period}: ${res.status}`);
    }
  }
}

testKanchanLive().then(() => process.exit(0)).catch(console.error);
