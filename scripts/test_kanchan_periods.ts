import { db } from '../src/server/db';
import { calculateMISScore, formatNegativeScore, ScoreItemInput } from '../src/core/scoring/engine';

async function testPeriodsForKanchan() {
  const user = db.prepare("SELECT * FROM users WHERE mobile = '9876543210'").get() as any;
  console.log('Testing for user:', user.name, user.id);

  // Daily items (for 2026-08-19)
  const dailyItems = db.prepare(`
    SELECT id, assignee_user_id as userId, is_important as isImportant,
           planned_at as plannedAt, completed_at as completedAt,
           status, title_en as titleEn, title_hi as titleHi,
           source_module as sourceModule, task_type as taskType
    FROM work_items
    WHERE assignee_user_id = ? AND DATE(planned_at, '+330 minutes') = '2026-08-19'
  `).all(user.id) as any[];

  console.log(`Daily items count: ${dailyItems.length}`);
  for (const item of dailyItems) {
    console.log(`  - [${item.status}] ${item.titleEn} (${item.id})`);
  }

  // Calculate score for Daily
  const formattedDaily: ScoreItemInput[] = dailyItems.map((i) => ({
    ...i,
    isImportant: Boolean(i.isImportant),
    plannedAt: new Date(i.plannedAt),
    completedAt: i.completedAt ? new Date(i.completedAt) : null,
  }));

  const initialDailyScore = calculateMISScore(user.id, formattedDaily);
  console.log('\n--- Initial Daily Score ---');
  console.log({
    displayWorkDone: initialDailyScore.displayWorkDone,
    displayWorkOnTime: initialDailyScore.displayWorkOnTime,
    weightedDone: initialDailyScore.weightedDone,
    weightedDue: initialDailyScore.weightedDue,
    doneCount: initialDailyScore.doneItems.length,
    notDoneCount: initialDailyScore.notDoneItems.length,
  });

  // Simulate marking 1 item done
  const firstItem = formattedDaily[0];
  firstItem.status = 'DONE';
  firstItem.completedAt = new Date(); // completed now

  const updatedDailyScore = calculateMISScore(user.id, formattedDaily);
  console.log('\n--- After 1 Task Submitted ---');
  console.log({
    displayWorkDone: updatedDailyScore.displayWorkDone,
    displayWorkOnTime: updatedDailyScore.displayWorkOnTime,
    weightedDone: updatedDailyScore.weightedDone,
    weightedDue: updatedDailyScore.weightedDue,
    doneCount: updatedDailyScore.doneItems.length,
    notDoneCount: updatedDailyScore.notDoneItems.length,
  });
}

testPeriodsForKanchan().then(() => process.exit(0)).catch(console.error);
