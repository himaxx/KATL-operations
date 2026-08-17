import { describe, it, expect } from 'vitest';
import { calculateMISScore, formatNegativeScore, ScoreItemInput } from './engine';

describe('Universal Scoring Engine', () => {
  it('formats percentages to strictly non-positive display strings', () => {
    expect(formatNegativeScore(100)).toEqual({ display: '0%', numeric: 0 });
    expect(formatNegativeScore(99.9)).toEqual({ display: '0%', numeric: 0 });
    expect(formatNegativeScore(74)).toEqual({ display: '-26%', numeric: -26 });
    expect(formatNegativeScore(50)).toEqual({ display: '-50%', numeric: -50 });
    expect(formatNegativeScore(0)).toEqual({ display: '-100%', numeric: -100 });
  });

  it('scores 0% on both measures if no work was assigned or due', () => {
    const res = calculateMISScore('user-1', []);
    expect(res.displayWorkDone).toBe('0%');
    expect(res.displayWorkOnTime).toBe('0%');
    expect(res.numericWorkDone).toBe(0);
    expect(res.numericWorkOnTime).toBe(0);
    expect(res.notDoneItems).toHaveLength(0);
  });

  it('correctly calculates 100% done but 50% on-time with standard weights', () => {
    const planned = new Date('2026-08-17T12:00:00Z');
    const onTimeCompletion = new Date('2026-08-17T11:30:00Z');
    const lateCompletion = new Date('2026-08-17T14:00:00Z');

    const items: ScoreItemInput[] = [
      {
        id: '1',
        userId: 'u1',
        isImportant: false, // weight 1
        plannedAt: planned,
        completedAt: onTimeCompletion,
        status: 'DONE',
        titleEn: 'Task 1',
        titleHi: 'कार्य 1',
      },
      {
        id: '2',
        userId: 'u1',
        isImportant: false, // weight 1
        plannedAt: planned,
        completedAt: lateCompletion,
        status: 'DONE',
        titleEn: 'Task 2',
        titleHi: 'कार्य 2',
      },
    ];

    const res = calculateMISScore('u1', items, new Date('2026-08-17T18:00:00Z'));
    expect(res.displayWorkDone).toBe('0%'); // All done -> 0% missed
    expect(res.displayWorkOnTime).toBe('-50%'); // Half on time -> -50%
    expect(res.notDoneItems).toHaveLength(0);
  });

  it('applies 3x weight to is_important tasks', () => {
    const planned = new Date('2026-08-17T12:00:00Z');
    const onTime = new Date('2026-08-17T11:00:00Z');

    const items: ScoreItemInput[] = [
      {
        id: '1',
        userId: 'u1',
        isImportant: true, // weight 3 - NOT done
        plannedAt: planned,
        completedAt: null,
        status: 'OPEN',
        titleEn: 'Important Task',
        titleHi: 'महत्वपूर्ण कार्य',
      },
      {
        id: '2',
        userId: 'u1',
        isImportant: false, // weight 1 - DONE on time
        plannedAt: planned,
        completedAt: onTime,
        status: 'DONE',
        titleEn: 'Regular Task',
        titleHi: 'सामान्य कार्य',
      },
    ];

    // Total weighted due = 3 + 1 = 4.
    // Done = 1/4 = 25% -> -75%
    const res = calculateMISScore('u1', items, new Date('2026-08-17T18:00:00Z'));
    expect(res.displayWorkDone).toBe('-75%');
    expect(res.displayWorkOnTime).toBe('-75%');
    expect(res.notDoneItems).toHaveLength(1);
    expect(res.notDoneItems[0].id).toBe('1');
    expect(res.notDoneItems[0].isImportant).toBe(true);
  });

  it('correctly handles audit FLAGGED_FALSE items', () => {
    const planned = new Date('2026-08-17T12:00:00Z');
    const items: ScoreItemInput[] = [
      {
        id: '1',
        userId: 'u1',
        isImportant: false,
        plannedAt: planned,
        completedAt: null,
        status: 'FLAGGED_FALSE',
        titleEn: 'Falsely claimed task',
        titleHi: 'गलत मार्क किया कार्य',
        flaggedFalseBy: 'Kanchan Kori (PC)',
      },
    ];

    const res = calculateMISScore('u1', items, new Date('2026-08-17T18:00:00Z'));
    expect(res.displayWorkDone).toBe('-100%');
    expect(res.notDoneItems).toHaveLength(1);
    expect(res.notDoneItems[0].isFlaggedFalse).toBe(true);
    expect(res.notDoneItems[0].checkedByName).toBe('Kanchan Kori (PC)');
  });
});
