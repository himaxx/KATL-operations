import { calculateMISScore, formatNegativeScore, ScoreItemInput } from '../src/core/scoring/engine';

console.log('=== Verifying MIS Scoring for Kanchan 4 Tasks Daily / Weekly / Monthly / Quarterly ===');

// Kanchan has 4 daily repetitive tasks for today (2026-08-19)
const baseTasks: ScoreItemInput[] = [
  {
    id: 'k-1',
    userId: 'user-kanchan',
    isImportant: false, // wt 1
    plannedAt: new Date('2026-08-19T20:00:00+05:30'),
    status: 'OPEN',
    titleEn: 'Checklist for the Office team with reminder',
    titleHi: 'कार्यालय टीम के लिए चेकलिस्ट',
    taskType: 'REPETITIVE',
  },
  {
    id: 'k-2',
    userId: 'user-kanchan',
    isImportant: false, // wt 1
    plannedAt: new Date('2026-08-19T20:00:00+05:30'),
    status: 'OPEN',
    titleEn: 'Check O2D & Purchase FMS delay follow up',
    titleHi: 'FMS फॉलोअप',
    taskType: 'REPETITIVE',
  },
  {
    id: 'k-3',
    userId: 'user-kanchan',
    isImportant: false, // wt 1
    plannedAt: new Date('2026-08-19T20:00:00+05:30'),
    status: 'OPEN',
    titleEn: 'Dispatch Entry & Status Verification',
    titleHi: 'डिस्पैच एंट्री',
    taskType: 'REPETITIVE',
  },
  {
    id: 'k-4',
    userId: 'user-kanchan',
    isImportant: false, // wt 1
    plannedAt: new Date('2026-08-19T20:00:00+05:30'),
    status: 'OPEN',
    titleEn: 'LR Receiving Entry, Photo Upload',
    titleHi: 'LR प्रविष्टि',
    taskType: 'REPETITIVE',
  },
];

console.log('\n1. Morning state (0 out of 4 tasks done):');
let s0 = calculateMISScore('user-kanchan', JSON.parse(JSON.stringify(baseTasks)));
console.log(`- Work Done: ${s0.displayWorkDone} (${s0.weightedDone}/${s0.weightedDue} wt) | Done: ${s0.doneItems.length}, Pending: ${s0.notDoneItems.length}`);
console.log(`- On Time: ${s0.displayWorkOnTime} (${s0.weightedOnTime}/${s0.weightedDue} wt)`);
console.assert(s0.displayWorkDone === '-100%', '0/4 should be -100%');
console.assert(s0.displayWorkOnTime === '-100%', '0/4 on time should be -100%');

console.log('\n2. After completing Task 1 (1 out of 4 tasks done on time):');
const tasks1 = JSON.parse(JSON.stringify(baseTasks));
tasks1[0].status = 'DONE';
tasks1[0].completedAt = new Date('2026-08-19T14:00:00+05:30'); // on time

let s1 = calculateMISScore('user-kanchan', tasks1);
console.log(`- Work Done: ${s1.displayWorkDone} (${s1.weightedDone}/${s1.weightedDue} wt) | Done: ${s1.doneItems.length}, Pending: ${s1.notDoneItems.length}`);
console.log(`- On Time: ${s1.displayWorkOnTime} (${s1.weightedOnTime}/${s1.weightedDue} wt)`);
console.assert(s1.displayWorkDone === '-75%', '1/4 (25% done) should display -75%');
console.assert(s1.displayWorkOnTime === '-75%', '1/4 (25% on-time) should display -75%');

console.log('\n3. After completing Task 2 (2 out of 4 tasks done on time):');
tasks1[1].status = 'DONE';
tasks1[1].completedAt = new Date('2026-08-19T15:00:00+05:30'); // on time

let s2 = calculateMISScore('user-kanchan', tasks1);
console.log(`- Work Done: ${s2.displayWorkDone} (${s2.weightedDone}/${s2.weightedDue} wt) | Done: ${s2.doneItems.length}, Pending: ${s2.notDoneItems.length}`);
console.log(`- On Time: ${s2.displayWorkOnTime} (${s2.weightedOnTime}/${s2.weightedDue} wt)`);
console.assert(s2.displayWorkDone === '-50%', '2/4 (50% done) should display -50%');
console.assert(s2.displayWorkOnTime === '-50%', '2/4 (50% on-time) should display -50%');

console.log('\n4. After completing Task 3 (3 out of 4 tasks done on time):');
tasks1[2].status = 'DONE';
tasks1[2].completedAt = new Date('2026-08-19T16:00:00+05:30'); // on time

let s3 = calculateMISScore('user-kanchan', tasks1);
console.log(`- Work Done: ${s3.displayWorkDone} (${s3.weightedDone}/${s3.weightedDue} wt) | Done: ${s3.doneItems.length}, Pending: ${s3.notDoneItems.length}`);
console.log(`- On Time: ${s3.displayWorkOnTime} (${s3.weightedOnTime}/${s3.weightedDue} wt)`);
console.assert(s3.displayWorkDone === '-25%', '3/4 (75% done) should display -25%');
console.assert(s3.displayWorkOnTime === '-25%', '3/4 (75% on-time) should display -25%');

console.log('\n5. After completing Task 4 (4 out of 4 tasks done on time):');
tasks1[3].status = 'DONE';
tasks1[3].completedAt = new Date('2026-08-19T17:00:00+05:30'); // on time

let s4 = calculateMISScore('user-kanchan', tasks1);
console.log(`- Work Done: ${s4.displayWorkDone} (${s4.weightedDone}/${s4.weightedDue} wt) | Done: ${s4.doneItems.length}, Pending: ${s4.notDoneItems.length}`);
console.log(`- On Time: ${s4.displayWorkOnTime} (${s4.weightedOnTime}/${s4.weightedDue} wt)`);
console.assert(s4.displayWorkDone === '0%', '4/4 (100% done) should display 0% perfect');
console.assert(s4.displayWorkOnTime === '0%', '4/4 (100% on-time) should display 0% perfect');

console.log('\n6. What if Task 4 was completed late (after 20:00 IST)?');
tasks1[3].completedAt = new Date('2026-08-19T21:00:00+05:30'); // 9:00 PM (1 hr late)
let s4Late = calculateMISScore('user-kanchan', tasks1);
console.log(`- Work Done: ${s4Late.displayWorkDone} (${s4Late.weightedDone}/${s4Late.weightedDue} wt)`);
console.log(`- On Time: ${s4Late.displayWorkOnTime} (${s4Late.weightedOnTime}/${s4Late.weightedDue} wt)`);
console.assert(s4Late.displayWorkDone === '0%', '4/4 done still gives 0% for Work Done');
console.assert(s4Late.displayWorkOnTime === '-25%', '3/4 on time gives -25% for Work On Time');

console.log('\n✅ All score step-by-step transitions verified perfectly!');
