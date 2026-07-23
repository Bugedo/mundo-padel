/**
 * Timezone utilities for America/Argentina/Buenos_Aires.
 * Calendar dates (YYYY-MM-DD) are never parsed via `new Date('YYYY-MM-DD')`
 * (UTC midnight) and never formatted via `toISOString().split('T')[0]`.
 */

export const BUENOS_AIRES_TZ = 'America/Argentina/Buenos_Aires';

const baDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUENOS_AIRES_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const baPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUENOS_AIRES_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getBuenosAiresParts(date: Date = new Date()) {
  const parts = baPartsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

/**
 * Parse a calendar date string YYYY-MM-DD as a local calendar Date (noon avoids DST edge cases).
 * Never use `new Date('YYYY-MM-DD')` — that is UTC midnight.
 */
export function parseDateOnly(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid date-only string: ${ymd}`);
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Format a Date's local calendar components as YYYY-MM-DD (never toISOString).
 */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Display format for users: DD/MM/AA (e.g. 23/07/26).
 * Accepts YYYY-MM-DD strings or Date. API/DB keep YYYY-MM-DD.
 */
export function formatDateDisplay(dateOrYmd: string | Date): string {
  const date =
    typeof dateOrYmd === 'string' ? parseDateOnly(dateOrYmd.slice(0, 10)) : dateOrYmd;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * Format an instant as YYYY-MM-DD in Buenos Aires.
 */
export function formatDateInBuenosAires(date: Date = new Date()): string {
  return baDateFormatter.format(date);
}

/**
 * Add (or subtract) days to a YYYY-MM-DD string without UTC midnight.
 */
export function addDaysToDateOnly(ymd: string, days: number): string {
  const date = parseDateOnly(ymd);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

/**
 * Current calendar date+time in Buenos Aires as a local Date
 * (components match BA wall clock; use for display/comparisons of calendar days).
 */
export function getBuenosAiresDate(): Date {
  const { year, month, day, hour, minute } = getBuenosAiresParts();
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Format date as YYYY-MM-DD in Buenos Aires (for API date fields).
 */
export function formatDateForAPI(date: Date): string {
  return formatDateInBuenosAires(date);
}

/**
 * Format a calendar Date (from date pickers / week strips) as YYYY-MM-DD.
 * Prefer this for Dates built with local Y/M/D components.
 */
export function formatDateForAPIWithoutConversion(date: Date): string {
  return formatDateOnly(date);
}

/**
 * Today's date in Buenos Aires as YYYY-MM-DD.
 */
export function getTodayBuenosAires(): string {
  return formatDateInBuenosAires(new Date());
}

/**
 * Day of week (0=Sunday … 6=Saturday) for a calendar date.
 * Accepts YYYY-MM-DD strings or Date objects.
 */
export function getDayOfWeekBuenosAires(dateOrYmd: Date | string): number {
  if (typeof dateOrYmd === 'string') {
    return parseDateOnly(dateOrYmd).getDay();
  }
  // If the Date came from UTC-midnight ISO parse, re-read as BA calendar day first
  const ymd = formatDateInBuenosAires(dateOrYmd);
  return parseDateOnly(ymd).getDay();
}

/**
 * Check if a date is today in Buenos Aires.
 */
export function isTodayBuenosAires(date: Date | string): boolean {
  const today = getTodayBuenosAires();
  const target = typeof date === 'string' ? date.slice(0, 10) : formatDateOnly(date);
  return target === today;
}

/**
 * Check if a calendar date is before today in Buenos Aires.
 */
export function isPastDateBuenosAires(date: Date | string): boolean {
  const today = getTodayBuenosAires();
  const target = typeof date === 'string' ? date.slice(0, 10) : formatDateOnly(date);
  return target < today;
}

/**
 * Compare expiry timestamp to real now (UTC instants).
 */
export function isBookingExpiredBuenosAires(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}

/**
 * Today + next 6 days as local calendar Dates in Buenos Aires.
 */
export function getAvailableDatesBuenosAires(): Date[] {
  const todayYmd = getTodayBuenosAires();
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(parseDateOnly(addDaysToDateOnly(todayYmd, i)));
  }
  return dates;
}

/**
 * Alias kept for older imports — same as BA available dates.
 */
export function getAvailableDatesWithoutConversion(): Date[] {
  return getAvailableDatesBuenosAires();
}

/**
 * Format date for display in Spanish (Argentina).
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateOnly(date) : date;
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Spanish day name from 0–6.
 */
export function getDayNameBuenosAires(dayNumber: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayNumber] || '';
}

/**
 * Current wall-clock time in Buenos Aires as HH:MM.
 */
export function getCurrentTimeBuenosAires(): string {
  const { hour, minute } = getBuenosAiresParts();
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
