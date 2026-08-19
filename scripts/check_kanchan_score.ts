import { db } from '../src/server/db';
import { calculateMISScore, ScoreItemInput } from '../src/core/scoring/engine';
import { toISTDateStr, getISTComponents } from '../src/core/working-time/engine';

async function checkKanchan() {
  console.log('=== Checking Kanchan Kori Profile & Scores ===');
  const user = db.prepare("SELECT * FROM users WHERE mobile = '9876543210'").get() as any;
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  console.log('User found:', { id: user.id, name: user.name, role: user.role, mobile: user.mobile });

  const allItems = db.prepare('SELECT * FROM work_items WHERE assignee_user_id = ? ORDER BY planned_at ASC').all(user.id) as any[];
  console.log(`Total work items for Kanchan in DB: ${allItems.length}`);

  for (const item of allItems) {
    console.log(`- [${item.status}] id: ${item.id}, title: ${item.title_en}, planned_at: ${item.planned_at}, completed_at: ${item.completed_at}`);
  }

  // Check today's date in IST
  const now = new Date();
  const istComp = getISTComponents(now);
  console.log('\nCurrent Server Time:', now.toISOString());
  console.log('Current IST Time:', istComp.dateStr, `${istComp.hours}:${istComp.minutes}`);

  // Test calculateMISScore with all items
  const formattedItems: ScoreItemInput[] = allItems.map((i) => ({
    ...i,
    userId: i.assignee_user_id,
    titleEn: i.title_en,
    titleHi: i.title_hi,
    isImportant: Boolean(i.is_important),
    plannedAt: new Date(i.planned_at),
    completedAt: i.completed_at ? new Date(i.completed_at) : null,
  }));

  const scoreResult = calculateMISScore(user.id, formattedItems, now);
  console.log('\nCalculated Score across all items:', {
    weightedDue: scoreResult.weightedDue,
    weightedDone: scoreResult.weightedDone,
    weightedOnTime: scoreResult.weightedOnTime,
    displayWorkDone: scoreResult.displayWorkDone,
    displayWorkOnTime: scoreResult.displayWorkOnTime,
    doneCount: scoreResult.doneItems.length,
    notDoneCount: scoreResult.notDoneItems.length,
  });
}

checkKanchan().then(() => process.exit(0)).catch(console.error);
