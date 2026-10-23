/**
 * Clock for the competitive calendar. Times are UTC so every region shares
 * one server schedule.
 *
 * Weekly: Monday 18:00. Registration opens three days earlier.
 * Monthly: the first Saturday of the month at 18:00.
 *
 * A round of a weekly bracket is intended to resolve about once a day after
 * the start, so an eight-player bracket finishes in about three days.
 */

const HOUR = 18;
const OPEN_MS = 3 * 24 * 60 * 60 * 1000;

export function nextWeeklyStart(now: Date): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), HOUR, 0, 0, 0));
  const delta = (1 - start.getUTCDay() + 7) % 7;
  start.setUTCDate(start.getUTCDate() + delta);
  if (start.getTime() <= now.getTime()) start.setUTCDate(start.getUTCDate() + 7);
  return start;
}

export function nextMonthlyStart(now: Date): Date {
  const thisMonth = firstSaturday(now.getUTCFullYear(), now.getUTCMonth());
  if (thisMonth.getTime() > now.getTime()) return thisMonth;
  return firstSaturday(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

export function registrationOpens(start: Date): Date {
  return new Date(start.getTime() - OPEN_MS);
}

function firstSaturday(year: number, month: number): Date {
  const start = new Date(Date.UTC(year, month, 1, HOUR, 0, 0, 0));
  while (start.getUTCDay() !== 6) start.setUTCDate(start.getUTCDate() + 1);
  return start;
}
