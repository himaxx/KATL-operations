/**
 * Working-Time Engine for Ketan Aditya Operations
 * Operating Timezone: Asia/Kolkata (IST, UTC+5:30)
 * Working Hours: Monday - Saturday, 10:00 to 19:00 IST (9 hours/day)
 * Non-working: Sunday & Admin-defined Holidays
 */

export interface WorkingTimeConfig {
  startHour: number; // 10
  endHour: number; // 19
  holidays: string[]; // ISO 'YYYY-MM-DD'
}

export const DEFAULT_CONFIG: WorkingTimeConfig = {
  startHour: 10,
  endHour: 19,
  holidays: [
    '2026-01-26', // Republic Day
    '2026-03-04', // Holi
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-10-20', // Dussehra
    '2026-11-08', // Diwali
    '2026-12-25', // Christmas
  ],
};

const IST_OFFSET_MINUTES = 330; // +5:30

/**
 * Converts any Date to IST date components
 */
export function getISTComponents(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const ist = new Date(utc + IST_OFFSET_MINUTES * 60000);
  return {
    year: ist.getFullYear(),
    month: ist.getMonth(), // 0-indexed
    date: ist.getDate(),
    day: ist.getDay(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    hours: ist.getHours(),
    minutes: ist.getMinutes(),
    seconds: ist.getSeconds(),
    milliseconds: ist.getMilliseconds(),
    dateStr: `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`,
    istDateObj: ist,
  };
}

/**
 * Creates a UTC Date representing a specific IST timestamp
 */
export function createDateFromIST(
  year: number,
  month: number, // 0-indexed
  date: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): Date {
  const istTime = Date.UTC(year, month, date, hours, minutes, seconds, ms);
  return new Date(istTime - IST_OFFSET_MINUTES * 60000);
}

/**
 * Checks if a given date is a working day (Mon-Sat and not a holiday)
 */
export function isWorkingDay(date: Date, config: WorkingTimeConfig = DEFAULT_CONFIG): boolean {
  const ist = getISTComponents(date);
  if (ist.day === 0) return false; // Sunday
  if (config.holidays.includes(ist.dateStr)) return false;
  return true;
}

/**
 * Checks if the exact timestamp falls within working hours
 */
export function isWorkingTime(date: Date, config: WorkingTimeConfig = DEFAULT_CONFIG): boolean {
  if (!isWorkingDay(date, config)) return false;
  const ist = getISTComponents(date);
  const timeInHours = ist.hours + ist.minutes / 60 + ist.seconds / 3600;
  return timeInHours >= config.startHour && timeInHours < config.endHour;
}

/**
 * Moves forward to the next working day start (10:00 IST)
 */
export function nextWorkingDay(date: Date, config: WorkingTimeConfig = DEFAULT_CONFIG): Date {
  let curr = new Date(date);
  while (true) {
    const ist = getISTComponents(curr);
    // Move to next calendar day at startHour:00
    const nextDay = createDateFromIST(ist.year, ist.month, ist.date + 1, config.startHour, 0, 0, 0);
    curr = nextDay;
    if (isWorkingDay(curr, config)) {
      return curr;
    }
  }
}

/**
 * Normalizes a start time:
 * If it's outside working hours or non-working day, aligns to the beginning of the next available working window.
 */
export function normalizeToWorkingWindow(date: Date, config: WorkingTimeConfig = DEFAULT_CONFIG): Date {
  let curr = new Date(date);
  
  while (true) {
    if (!isWorkingDay(curr, config)) {
      const ist = getISTComponents(curr);
      curr = createDateFromIST(ist.year, ist.month, ist.date + 1, config.startHour, 0, 0, 0);
      continue;
    }

    const ist = getISTComponents(curr);
    const timeInHours = ist.hours + ist.minutes / 60 + ist.seconds / 3600;

    if (timeInHours < config.startHour) {
      return createDateFromIST(ist.year, ist.month, ist.date, config.startHour, 0, 0, 0);
    } else if (timeInHours >= config.endHour) {
      curr = createDateFromIST(ist.year, ist.month, ist.date + 1, config.startHour, 0, 0, 0);
      continue;
    } else {
      return curr;
    }
  }
}

/**
 * Adds working hours to a start date, skipping non-working times, Sundays, and holidays.
 */
export function addWorkingTime(
  start: Date,
  hours: number,
  config: WorkingTimeConfig = DEFAULT_CONFIG
): Date {
  if (hours <= 0) return new Date(start);

  let current = normalizeToWorkingWindow(start, config);
  let remainingHours = hours;
  const dayCapacity = config.endHour - config.startHour; // 9 hours

  while (remainingHours > 0) {
    const ist = getISTComponents(current);
    const currentHourFloat = ist.hours + ist.minutes / 60 + ist.seconds / 3600;
    const hoursLeftToday = config.endHour - currentHourFloat;

    if (remainingHours <= hoursLeftToday) {
      // Finishes today
      const totalHours = currentHourFloat + remainingHours;
      const targetHour = Math.floor(totalHours);
      const targetMinFloat = (totalHours - targetHour) * 60;
      const targetMin = Math.floor(targetMinFloat);
      const targetSec = Math.round((targetMinFloat - targetMin) * 60);

      return createDateFromIST(
        ist.year,
        ist.month,
        ist.date,
        targetHour,
        targetMin,
        targetSec,
        0
      );
    } else {
      // Consume the rest of today and move to the next working day
      remainingHours -= hoursLeftToday;
      const nextDay = createDateFromIST(ist.year, ist.month, ist.date + 1, config.startHour, 0, 0, 0);
      current = normalizeToWorkingWindow(nextDay, config);
    }
  }

  return current;
}

/**
 * Computes the exact working hours elapsed between two moments.
 * Returns negative if b < a.
 */
export function workingHoursBetween(
  a: Date,
  b: Date,
  config: WorkingTimeConfig = DEFAULT_CONFIG
): number {
  if (a.getTime() === b.getTime()) return 0;
  if (b.getTime() < a.getTime()) {
    return -workingHoursBetween(b, a, config);
  }

  let totalWorkingHours = 0;
  let curr = new Date(a);

  // If start is after end, loop won't run
  while (curr < b) {
    if (!isWorkingDay(curr, config)) {
      const ist = getISTComponents(curr);
      curr = createDateFromIST(ist.year, ist.month, ist.date + 1, config.startHour, 0, 0, 0);
      continue;
    }

    const ist = getISTComponents(curr);
    const currTime = ist.hours + ist.minutes / 60 + ist.seconds / 3600;
    
    // Day end time object for current day
    const dayEnd = createDateFromIST(ist.year, ist.month, ist.date, config.endHour, 0, 0, 0);
    const dayStart = createDateFromIST(ist.year, ist.month, ist.date, config.startHour, 0, 0, 0);

    if (curr < dayStart) {
      curr = dayStart;
    }

    if (curr >= dayEnd) {
      curr = createDateFromIST(ist.year, ist.month, ist.date + 1, config.startHour, 0, 0, 0);
      continue;
    }

    // Effective start for this day
    const effectiveStart = curr;
    // Effective end is min(b, dayEnd)
    const effectiveEnd = b < dayEnd ? b : dayEnd;

    if (effectiveEnd > effectiveStart && isWorkingDay(effectiveStart, config)) {
      const startIst = getISTComponents(effectiveStart);
      const endIst = getISTComponents(effectiveEnd);
      
      const startTimeH = Math.max(config.startHour, startIst.hours + startIst.minutes / 60 + startIst.seconds / 3600);
      const endTimeH = Math.min(config.endHour, endIst.hours + endIst.minutes / 60 + endIst.seconds / 3600);
      
      if (endTimeH > startTimeH) {
        totalWorkingHours += (endTimeH - startTimeH);
      }
    }

    // Move to next day start
    curr = createDateFromIST(ist.year, ist.month, ist.date + 1, config.startHour, 0, 0, 0);
  }

  return Number(totalWorkingHours.toFixed(2));
}
