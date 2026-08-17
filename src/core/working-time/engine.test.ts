import { describe, it, expect } from 'vitest';
import {
  createDateFromIST,
  getISTComponents,
  isWorkingDay,
  isWorkingTime,
  addWorkingTime,
  workingHoursBetween,
  nextWorkingDay,
  DEFAULT_CONFIG,
} from './engine';

describe('Working-Time Engine', () => {
  it('converts to and from IST correctly', () => {
    // 2026-08-17 (Monday) 10:00 IST
    const date = createDateFromIST(2026, 7, 17, 10, 0, 0);
    const ist = getISTComponents(date);
    expect(ist.year).toBe(2026);
    expect(ist.month).toBe(7);
    expect(ist.date).toBe(17);
    expect(ist.day).toBe(1); // Monday
    expect(ist.hours).toBe(10);
    expect(ist.minutes).toBe(0);
  });

  it('correctly identifies working days (excludes Sundays and Holidays)', () => {
    // 2026-08-16 is a Sunday
    const sunday = createDateFromIST(2026, 7, 16, 12, 0);
    expect(isWorkingDay(sunday)).toBe(false);

    // 2026-08-15 is Independence Day (Holiday in DEFAULT_CONFIG)
    const holiday = createDateFromIST(2026, 7, 15, 12, 0);
    expect(isWorkingDay(holiday)).toBe(false);

    // 2026-08-17 is Monday (Working day)
    const monday = createDateFromIST(2026, 7, 17, 12, 0);
    expect(isWorkingDay(monday)).toBe(true);
  });

  it('correctly tests isWorkingTime', () => {
    const workingHour = createDateFromIST(2026, 7, 17, 14, 30);
    expect(isWorkingTime(workingHour)).toBe(true);

    const earlyHour = createDateFromIST(2026, 7, 17, 9, 30);
    expect(isWorkingTime(earlyHour)).toBe(false);

    const lateHour = createDateFromIST(2026, 7, 17, 19, 0);
    expect(isWorkingTime(lateHour)).toBe(false);

    const sundayHour = createDateFromIST(2026, 7, 16, 14, 0);
    expect(isWorkingTime(sundayHour)).toBe(false);
  });

  it('adds working hours within the same day', () => {
    // Mon 10:00 IST + 4 hours -> Mon 14:00 IST
    const start = createDateFromIST(2026, 7, 17, 10, 0);
    const end = addWorkingTime(start, 4);
    const endIst = getISTComponents(end);
    expect(endIst.date).toBe(17);
    expect(endIst.hours).toBe(14);
    expect(endIst.minutes).toBe(0);
  });

  it('adds working hours spanning across multiple working days', () => {
    // Mon 15:00 IST + 6 hours -> (4 hrs left on Mon until 19:00, then 2 hrs on Tue from 10:00) -> Tue 12:00 IST
    const start = createDateFromIST(2026, 7, 17, 15, 0);
    const end = addWorkingTime(start, 6);
    const endIst = getISTComponents(end);
    expect(endIst.date).toBe(18);
    expect(endIst.hours).toBe(12);
    expect(endIst.minutes).toBe(0);
  });

  it('skips Sunday when calculating TAT over a weekend', () => {
    // Saturday 18:00 IST (1 hr left today) + 3 hrs TAT -> Resumes Monday 10:00 + 2 hrs -> Monday 12:00 IST
    const start = createDateFromIST(2026, 7, 22, 18, 0); // 2026-08-22 is Saturday
    const end = addWorkingTime(start, 3);
    const endIst = getISTComponents(end);
    expect(endIst.day).toBe(1); // Monday
    expect(endIst.date).toBe(24);
    expect(endIst.hours).toBe(12);
  });

  it('starts after closing hour skips to next working morning 10:00', () => {
    // Saturday 20:00 IST (after closing) + 3 hrs -> Starts Monday 10:00 + 3 hrs -> Monday 13:00 IST
    const start = createDateFromIST(2026, 7, 22, 20, 0);
    const end = addWorkingTime(start, 3);
    const endIst = getISTComponents(end);
    expect(endIst.day).toBe(1); // Monday
    expect(endIst.date).toBe(24);
    expect(endIst.hours).toBe(13);
  });

  it('calculates workingHoursBetween accurately', () => {
    // Mon 10:00 to Mon 15:00 -> 5 hours
    const d1 = createDateFromIST(2026, 7, 17, 10, 0);
    const d2 = createDateFromIST(2026, 7, 17, 15, 0);
    expect(workingHoursBetween(d1, d2)).toBe(5);

    // Mon 17:00 to Tue 11:00 -> 2 hrs on Mon (17-19) + 1 hr on Tue (10-11) = 3 hrs
    const d3 = createDateFromIST(2026, 7, 17, 17, 0);
    const d4 = createDateFromIST(2026, 7, 18, 11, 0);
    expect(workingHoursBetween(d3, d4)).toBe(3);

    // Across Sunday: Sat 18:00 to Mon 11:00 -> 1 hr Sat + 1 hr Mon = 2 hrs
    const sat = createDateFromIST(2026, 7, 22, 18, 0);
    const mon = createDateFromIST(2026, 7, 24, 11, 0);
    expect(workingHoursBetween(sat, mon)).toBe(2);
  });
});
