/**
 * Date utility functions designed for local calendar dates.
 * All functions operate on 'YYYY-MM-DD' formatted strings to avoid UTC offset
 * and Daylight Saving Time (DST) shift bugs.
 */

/**
 * Creates a local Date object set to noon (12:00:00) on the specified YYYY-MM-DD.
 * Using 12:00:00 PM prevents any DST transition (which happens at 00:00 or 02:00)
 * from shifting the calendar date forward or backward.
 */
export function parseLocalDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);
  return new Date(year, month, day, 12, 0, 0, 0);
}

/**
 * Formats a Date object as 'YYYY-MM-DD' in local time.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date formatted as 'YYYY-MM-DD' in local time.
 */
export function getTodayLocalDate(): string {
  return formatLocalDate(new Date());
}

/**
 * Adds or subtracts N calendar days to a 'YYYY-MM-DD' string safely.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/**
 * Adds or subtracts N calendar months to a 'YYYY-MM-DD' string safely.
 */
export function addCalendarMonths(dateStr: string, months: number): string {
  const d = parseLocalDate(dateStr);
  const targetDay = d.getDate();
  d.setDate(1); // Set to 1st to prevent month overflow
  d.setMonth(d.getMonth() + months);
  const maxDays = getDaysInMonth(d.getFullYear(), d.getMonth() + 1);
  d.setDate(Math.min(targetDay, maxDays));
  return formatLocalDate(d);
}

/**
 * Returns the day of the week for a given 'YYYY-MM-DD':
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, ..., 6 = Saturday
 */
export function getDayOfWeek(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

/**
 * Returns the day of the month for a given 'YYYY-MM-DD' (1 - 31).
 */
export function getDayOfMonth(dateStr: string): number {
  return parseLocalDate(dateStr).getDate();
}

/**
 * Returns the number of days in a given year and month (1-12).
 */
export function getDaysInMonth(year: number, month: number): number {
  // Day 0 of next month is the last day of this month
  return new Date(year, month, 0).getDate();
}

/**
 * Compares two 'YYYY-MM-DD' dates.
 * Returns negative if a < b, 0 if a == b, positive if a > b.
 */
export function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isDateBefore(a: string, b: string): boolean {
  return a < b;
}

export function isDateAfter(a: string, b: string): boolean {
  return a > b;
}

export function isDateSameOrBefore(a: string, b: string): boolean {
  return a <= b;
}

export function isDateSameOrAfter(a: string, b: string): boolean {
  return a >= b;
}

export function isDateBetween(target: string, start: string, end: string): boolean {
  return target >= start && target <= end;
}

/**
 * Calculates the exact difference in calendar days between two dates.
 * Result is positive if targetDate is after baseDate.
 */
export function differenceInCalendarDays(targetDate: string, baseDate: string): number {
  const a = parseLocalDate(targetDate);
  const b = parseLocalDate(baseDate);
  // Difference in milliseconds divided by approximate day, rounded to nearest whole day
  const diffMs = a.getTime() - b.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Finds the day of month for the nth weekday (e.g. 2nd Tuesday = week 2, weekday 2).
 * If week is -1, returns the last occurrence of that weekday in the month.
 * Returns null if the month doesn't have that nth weekday.
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number, // 1 - 12
  weekday: number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  week: number // 1, 2, 3, 4, 5, or -1 (last)
): number | null {
  const totalDays = getDaysInMonth(year, month);

  if (week === -1) {
    // Find last weekday of the month
    const lastDayWeekday = new Date(year, month - 1, totalDays, 12, 0, 0).getDay();
    const diff = (lastDayWeekday - weekday + 7) % 7;
    const day = totalDays - diff;
    return day >= 1 ? day : null;
  }

  // Find 1st occurrence of weekday
  const firstDayWeekday = new Date(year, month - 1, 1, 12, 0, 0).getDay();
  const diff = (weekday - firstDayWeekday + 7) % 7;
  const firstOccurrence = 1 + diff;
  const targetDay = firstOccurrence + (week - 1) * 7;

  return targetDay <= totalDays ? targetDay : null;
}

/**
 * Returns an array of 'YYYY-MM-DD' dates between startDate and endDate inclusive.
 */
export function getDatesInRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [];
  const result: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    result.push(current);
    current = addCalendarDays(current, 1);
  }
  return result;
}

