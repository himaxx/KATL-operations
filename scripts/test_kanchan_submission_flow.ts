import { db } from '../src/server/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'katl-ops-super-secret-jwt-key-2026';

async function testKanchanSubmissionFlow() {
  console.log('=====================================================');
  console.log('🧪 TESTING LIVE TASK SUBMISSION & SCORE UPDATES FOR KANCHAN');
  console.log('=====================================================\n');

  const user = db.prepare("SELECT * FROM users WHERE mobile = '9876543210'").get() as any;
  if (!user) {
    console.error('❌ User Kanchan not found');
    return;
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Helper to fetch scores
  async function fetchScores(label: string) {
    console.log(`\n📊 [${label}] Fetching scores for all 4 periods:`);
    for (const period of ['daily', 'weekly', 'monthly', 'quarterly']) {
      const res = await fetch(`http://localhost:3000/api/scores/my?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log(`  • ${period.toUpperCase().padEnd(10)}: Work Done = ${data.score.displayWorkDone.padEnd(6)} (${data.score.weightedDone}/${data.score.weightedDue} wt) | On Time = ${data.score.displayWorkOnTime.padEnd(6)} | Done: ${data.score.doneItems.length}, Pending: ${data.score.notDoneItems.length}`);
    }
  }

  // 1. Initial scores before submission
  await fetchScores('BEFORE SUBMISSION');

  // 2. Find an open task for today to submit
  const openItem = db.prepare(`
    SELECT * FROM work_items 
    WHERE assignee_user_id = ? 
      AND status = 'OPEN' 
      AND ((planned_at::timestamptz AT TIME ZONE 'Asia/Kolkata')::date) = ((NOW() AT TIME ZONE 'Asia/Kolkata')::date)
    ORDER BY created_at ASC 
    LIMIT 1
  `).get(user.id) as any;

  if (!openItem) {
    console.log('No open task found for today, looking for any open task...');
    const anyOpen = db.prepare("SELECT * FROM work_items WHERE assignee_user_id = ? AND status = 'OPEN' LIMIT 1").get(user.id) as any;
    if (!anyOpen) {
      console.log('All tasks already completed for Kanchan!');
      return;
    }
  }

  const taskToSubmit = openItem || db.prepare("SELECT * FROM work_items WHERE assignee_user_id = ? AND status = 'OPEN' LIMIT 1").get(user.id) as any;

  console.log(`\n👉 Submitting Task: "${taskToSubmit.title_en}" (ID: ${taskToSubmit.id})...`);

  // Submit via API endpoint
  const submitRes = await fetch(`http://localhost:3000/api/work-items/${taskToSubmit.id}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      notes: 'Completed on schedule during operations check',
    }),
  });

  const submitData = await submitRes.json();
  console.log('Submission Response:', submitData);

  // 3. Check updated scores after submission
  await fetchScores('AFTER SUBMITTING 1 TASK');

  console.log('\n=====================================================');
  console.log('🎉 LIVE TASK SUBMISSION TEST COMPLETE!');
  console.log('=====================================================');
}

testKanchanSubmissionFlow().then(() => process.exit(0)).catch(console.error);
