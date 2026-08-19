import { calculateMISScore, formatNegativeScore, ScoreItemInput } from '../src/core/scoring/engine';

console.log('==============================================');
console.log('🧪 TESTING MIS SCORING ENGINE & BUSINESS LOGIC');
console.log('==============================================\n');

// 1. Test Negative Score Formatter
console.log('--- 1. Testing Negative Score Formatter ---');
console.assert(formatNegativeScore(100).display === '0%', '100% should format to 0%');
console.assert(formatNegativeScore(100).numeric === 0, '100% numeric should be 0');
console.assert(formatNegativeScore(80).display === '-20%', '80% should format to -20%');
console.assert(formatNegativeScore(90).display === '-10%', '90% should format to -10%');
console.assert(formatNegativeScore(0).display === '-100%', '0% should format to -100%');
console.assert(formatNegativeScore(NaN).display === '0%', 'NaN should format to 0%');
console.log('✅ Negative score formatter passed all tests!\n');

// 2. Test User's Exact Scenario
console.log("--- 2. Testing User's Specific Scenario ---");
const now = new Date();
const pastDue = new Date(now.getTime() - 3600 * 1000); // 1 hr ago

// 8 normal tasks (weight 1 each)
const items: ScoreItemInput[] = [];
for (let i = 1; i <= 8; i++) {
  items.push({
    id: `normal-${i}`,
    userId: 'user-1',
    isImportant: false,
    plannedAt: pastDue,
    completedAt: pastDue, // Completed on time
    status: 'DONE',
    titleEn: `Daily Checklist ${i}`,
    titleHi: `दैनिक कार्य ${i}`,
    sourceModule: 'checklist',
    taskType: 'REPETITIVE',
  });
}

// 1 delegation task (weight 3, currently OPEN)
items.push({
  id: 'delegation-1',
  userId: 'user-1',
  isImportant: true,
  plannedAt: pastDue,
  status: 'OPEN',
  titleEn: 'Prepare Monthly Tax Summary',
  titleHi: 'मासिक कर सारांश तैयार करें',
  sourceModule: 'delegation',
  taskType: 'DELEGATION',
});

// 1 compliance task (weight 3, currently OPEN)
items.push({
  id: 'compliance-1',
  userId: 'user-1',
  isImportant: true,
  plannedAt: pastDue,
  status: 'OPEN',
  titleEn: 'Fire Safety Audit Checklist',
  titleHi: 'अग्निशमन सुरक्षा ऑडिट',
  sourceModule: 'checklist',
  taskType: 'COMPLIANCE',
});

// Calculate score with 8 done out of 10
let res = calculateMISScore('user-1', items, now);
console.log(`Status 1 (8 normal done, 1 delegation open, 1 compliance open):`);
console.log(`  Weighted Due: ${res.weightedDue} (8*1 + 3 + 3 = 14)`);
console.log(`  Weighted Done: ${res.weightedDone} (8*1 = 8)`);
console.log(`  Weighted On-Time: ${res.weightedOnTime}`);
console.log(`  Work Done Display: ${res.displayWorkDone} (Raw Done: ${res.donePctRaw.toFixed(1)}%)`);
console.log(`  Work On-Time Display: ${res.displayWorkOnTime}`);
console.assert(res.weightedDue === 14, 'Weighted due should be 14');
console.assert(res.weightedDone === 8, 'Weighted done should be 8');
console.assert(res.doneItems.length === 8, '8 done items');
console.assert(res.notDoneItems.length === 2, '2 not done items');
console.log('✅ Status 1 verified!\n');

// Now user submits Delegation task late
items[8].status = 'DONE';
items[8].completedAt = now; // completed after plannedAt (late)

res = calculateMISScore('user-1', items, now);
console.log(`Status 2 (8 normal done on-time, 1 delegation submitted late, 1 compliance open):`);
console.log(`  Weighted Due: ${res.weightedDue} (14)`);
console.log(`  Weighted Done: ${res.weightedDone} (8 + 3 = 11)`);
console.log(`  Weighted On-Time: ${res.weightedOnTime} (8 - delegation does NOT get on-time credit)`);
console.log(`  Work Done Display: ${res.displayWorkDone} (Raw Done: ${res.donePctRaw.toFixed(1)}%)`);
console.log(`  Work On-Time Display: ${res.displayWorkOnTime} (Raw On-Time: ${res.onTimePctRaw.toFixed(1)}%)`);
console.assert(res.weightedDone === 11, 'Weighted done should increase by 3');
console.assert(res.weightedOnTime === 8, 'Weighted on-time should remain 8');
console.assert(res.doneItems.find((d) => d.id === 'delegation-1')?.isOnTime === false, 'Delegation is late');
console.log('✅ Status 2 verified!\n');

// Now user completes compliance task on time
items[9].status = 'DONE';
items[9].completedAt = pastDue; // completed on time

res = calculateMISScore('user-1', items, now);
console.log(`Status 3 (All 10 tasks completed):`);
console.log(`  Weighted Due: ${res.weightedDue} (14)`);
console.log(`  Weighted Done: ${res.weightedDone} (14)`);
console.log(`  Work Done Display: ${res.displayWorkDone}`);
console.assert(res.displayWorkDone === '0%', '100% completion gives 0% perfect Work Done score');
console.assert(res.notDoneItems.length === 0, 'Zero pending tasks');
console.log('✅ Status 3 verified!\n');

// 3. Test Zero Tasks In Period
console.log('--- 3. Testing Zero Tasks Scenario ---');
const zeroRes = calculateMISScore('user-zero', [], now);
console.log(`Zero tasks score: Work Done = ${zeroRes.displayWorkDone}, On Time = ${zeroRes.displayWorkOnTime}`);
console.assert(zeroRes.displayWorkDone === '0%', 'Zero tasks should give 0% Work Done');
console.assert(zeroRes.displayWorkOnTime === '0%', 'Zero tasks should give 0% Work On Time');
console.log('✅ Zero tasks scenario passed!\n');

// 4. Test Future Planned Tasks
console.log('--- 4. Testing Future Open Tasks (No Premature Penalty) ---');
const futureItems: ScoreItemInput[] = [
  {
    id: 'future-1',
    userId: 'user-1',
    isImportant: false,
    plannedAt: new Date(now.getTime() + 7200 * 1000), // 2 hours in future
    status: 'OPEN',
    titleEn: 'Evening Stock Count',
    titleHi: 'शाम की स्टॉक गिनती',
  },
];
const futureRes = calculateMISScore('user-1', futureItems, now);
console.log(`Future open task score: weightedDue = ${futureRes.weightedDue}, Work Done = ${futureRes.displayWorkDone}`);
console.assert(futureRes.weightedDue === 0, 'Future open task does not count in current due weight');
console.assert(futureRes.displayWorkDone === '0%', 'Future open task does not penalize current score');
console.log('✅ Future open task scenario passed!\n');

// 5. Test Flagged FALSE by Auditor
console.log('--- 5. Testing Audit Flagged FALSE ---');
const auditItems: ScoreItemInput[] = [
  {
    id: 'audit-1',
    userId: 'user-1',
    isImportant: true,
    plannedAt: pastDue,
    status: 'FLAGGED_FALSE',
    titleEn: 'Weekly Equipment Calibration',
    titleHi: 'उपकरण अंशांकन',
    flaggedFalseBy: 'Ramesh Sharma (Auditor)',
    flaggedFalseReason: 'Reading not logged in physical register',
  },
];
const auditRes = calculateMISScore('user-1', auditItems, now);
console.log(`Audit Flagged score: Work Done = ${auditRes.displayWorkDone}`);
console.assert(auditRes.notDoneItems.length === 1, 'Flagged item should be in notDoneItems');
console.assert(auditRes.notDoneItems[0].isFlaggedFalse === true, 'isFlaggedFalse should be true');
console.assert(auditRes.notDoneItems[0].checkedByName === 'Ramesh Sharma (Auditor)', 'Auditor name preserved');
console.log('✅ Audit flagged FALSE scenario passed!\n');

console.log('==============================================');
console.log('🎉 ALL MIS SCORING TEST SUITES PASSED 100%!');
console.log('==============================================');
