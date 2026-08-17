/**
 * Universal Scoring Engine for Ketan Aditya Operations ("MIS Scoring")
 * Strictly adheres to Law 3: Zero references to specific modules or FMS codes.
 * Implements the universal negative score display rule (always <= 0%).
 */

export interface ScoreItemInput {
  id: string;
  userId: string;
  isImportant: boolean; // weight 3 if true, 1 if false
  plannedAt: Date;
  completedAt?: Date | null;
  status: 'OPEN' | 'DONE' | 'MISSED' | 'FLAGGED_FALSE';
  titleEn: string;
  titleHi: string;
  flaggedFalseBy?: string | null;
  flaggedFalseReason?: string | null;
}

export interface DoneItem {
  id: string;
  titleEn: string;
  titleHi: string;
  plannedAt: Date;
  completedAt: Date;
  isOnTime: boolean;
  isImportant: boolean;
}

export interface NotDoneItem {
  id: string;
  titleEn: string;
  titleHi: string;
  plannedAt: Date;
  status: 'OPEN' | 'MISSED' | 'FLAGGED_FALSE';
  isImportant: boolean;
  isFlaggedFalse: boolean;
  checkedByName?: string | null;
}

export interface PeriodScoreResult {
  userId: string;
  weightedDue: number;
  weightedDone: number;
  weightedOnTime: number;
  donePctRaw: number;
  onTimePctRaw: number;
  displayWorkDone: string; // e.g. "0%" or "-26%"
  displayWorkOnTime: string; // e.g. "-50%"
  numericWorkDone: number; // e.g. 0, -26
  numericWorkOnTime: number; // e.g. 0, -50
  doneItems: DoneItem[];
  notDoneItems: NotDoneItem[];
}

/**
 * Formats any percentage (0-100) to the mandatory negative display string.
 * Example: 100% -> "0%", 74% -> "-26%", 0% -> "-100%"
 */
export function formatNegativeScore(pct: number): { display: string; numeric: number } {
  if (isNaN(pct) || pct >= 100) {
    return { display: '0%', numeric: 0 };
  }
  const missed = Math.round(100 - pct);
  if (missed <= 0) {
    return { display: '0%', numeric: 0 };
  }
  return {
    display: `-${missed}%`,
    numeric: -missed,
  };
}

/**
 * Calculates MIS score for a given set of work items in a target time period.
 * 
 * @param items List of work items whose planned_at falls into the period
 * @param asOfDate Current evaluation moment (defaults to now). Work due in future is not counted against due weight.
 */
export function calculateMISScore(
  userId: string,
  items: ScoreItemInput[],
  asOfDate: Date = new Date()
): PeriodScoreResult {
  let weightedDue = 0;
  let weightedDone = 0;
  let weightedOnTime = 0;
  const doneItems: DoneItem[] = [];
  const notDoneItems: NotDoneItem[] = [];

  for (const item of items) {
    const plannedTime = new Date(item.plannedAt).getTime();
    const asOfTime = asOfDate.getTime();

    // If item is not completed and its planned time is still in the future,
    // it does NOT count towards current period's due weight yet.
    const isCompleted = item.status === 'DONE' && !!item.completedAt;
    if (!isCompleted && plannedTime > asOfTime) {
      continue;
    }

    const weight = item.isImportant ? 3 : 1;
    weightedDue += weight;

    // Check completion & on-time status
    if (item.status === 'DONE' && item.completedAt) {
      weightedDone += weight;
      const completedTime = new Date(item.completedAt).getTime();
      const isOnTime = completedTime <= plannedTime;
      if (isOnTime) {
        weightedOnTime += weight;
      }

      doneItems.push({
        id: item.id,
        titleEn: item.titleEn,
        titleHi: item.titleHi,
        plannedAt: item.plannedAt,
        completedAt: item.completedAt,
        isOnTime,
        isImportant: item.isImportant,
      });
    } else {
      // Item is not done or flagged false
      notDoneItems.push({
        id: item.id,
        titleEn: item.titleEn,
        titleHi: item.titleHi,
        plannedAt: item.plannedAt,
        status: item.status === 'FLAGGED_FALSE' ? 'FLAGGED_FALSE' : (item.status === 'MISSED' ? 'MISSED' : 'OPEN'),
        isImportant: item.isImportant,
        isFlaggedFalse: item.status === 'FLAGGED_FALSE',
        checkedByName: item.flaggedFalseBy,
      });
    }
  }

  // Sort Done items newest completion first
  doneItems.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  // Sort Not Done items newest planned first
  notDoneItems.sort((a, b) => new Date(b.plannedAt).getTime() - new Date(a.plannedAt).getTime());

  if (weightedDue === 0) {
    return {
      userId,
      weightedDue: 0,
      weightedDone: 0,
      weightedOnTime: 0,
      donePctRaw: 100,
      onTimePctRaw: 100,
      displayWorkDone: '0%',
      displayWorkOnTime: '0%',
      numericWorkDone: 0,
      numericWorkOnTime: 0,
      doneItems: [],
      notDoneItems: [],
    };
  }

  const donePctRaw = (weightedDone / weightedDue) * 100;
  const onTimePctRaw = (weightedOnTime / weightedDue) * 100;

  const doneFormatted = formatNegativeScore(donePctRaw);
  const onTimeFormatted = formatNegativeScore(onTimePctRaw);

  return {
    userId,
    weightedDue,
    weightedDone,
    weightedOnTime,
    donePctRaw,
    onTimePctRaw,
    displayWorkDone: doneFormatted.display,
    displayWorkOnTime: onTimeFormatted.display,
    numericWorkDone: doneFormatted.numeric,
    numericWorkOnTime: onTimeFormatted.numeric,
    doneItems,
    notDoneItems,
  };
}
