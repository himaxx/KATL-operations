import { db } from '../src/server/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'katl-ops-super-secret-jwt-key-2026';

async function testLateSubmit() {
  console.log('=== Testing Score Tab Late Submission for Kanchan ===');

  const user = db.prepare("SELECT * FROM users WHERE mobile = '9876543210'").get() as any;
  const token = jwt.sign(
    { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Find a past open task from yesterday (e.g. 2026-08-17 or 2026-08-18)
  const pastTask = db.prepare(`
    SELECT * FROM work_items 
    WHERE assignee_user_id = ? 
      AND status = 'OPEN' 
      AND ((planned_at::timestamptz AT TIME ZONE 'Asia/Kolkata')::date) < ((NOW() AT TIME ZONE 'Asia/Kolkata')::date)
    LIMIT 1
  `).get(user.id) as any;

  if (!pastTask) {
    console.log('No past task found');
    return;
  }

  console.log(`Found past task: "${pastTask.title_en}" (Planned: ${pastTask.planned_at}, ID: ${pastTask.id})`);

  // Call /api/work-items/:id/late-submit
  const res = await fetch(`http://localhost:3000/api/work-items/${pastTask.id}/late-submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  const data = await res.json();
  console.log('Late Submit response:', data);

  // Check weekly score
  const weekRes = await fetch('http://localhost:3000/api/scores/my?period=weekly', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const weekData = await weekRes.json();
  console.log('\nUpdated Weekly Score:');
  console.log(`  Work Done: ${weekData.score.displayWorkDone} (${weekData.score.weightedDone}/${weekData.score.weightedDue} wt)`);
  console.log(`  On Time:   ${weekData.score.displayWorkOnTime} (${weekData.score.weightedOnTime}/${weekData.score.weightedDue} wt)`);
  console.log(`  Done Items Count: ${weekData.score.doneItems.length}`);
  const submittedItemInScore = weekData.score.doneItems.find((d: any) => d.id === pastTask.id);
  console.log('  Submitted Item in Done list:', {
    title: submittedItemInScore?.titleEn,
    isOnTime: submittedItemInScore?.isOnTime,
  });
}

testLateSubmit().then(() => process.exit(0)).catch(console.error);
