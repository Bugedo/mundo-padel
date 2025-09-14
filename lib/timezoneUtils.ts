/**
 * Timezone utilities for Buenos Aires, Argentina (UTC-3)
 * Handles all date and time operations in the local timezone
 */

// Buenos Aires timezone offset (UTC-3)
const BUENOS_AIRES_OFFSET = -3 * 60; // -3 hours in minutes

/**
 * Get current date and time in Buenos Aires timezone
 */
export function getBuenosAiresDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (BUENOS_AIRES_OFFSET * 60000));
}

/**
 * Convert a UTC date to Buenos Aires timezone
 */
export function toBuenosAiresDate(date: Date): Date {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (BUENOS_AIRES_OFFSET * 60000));
}

/**
 * Convert a Buenos Aires date to UTC for database storage
 */
export function toUTC(date: Date): Date {
  const buenosAires = date.getTime() - (BUENOS_AIRES_OFFSET * 60000);
  return new Date(buenosAires - (date.getTimezoneOffset() * 60000));
}

/**
 * Format date as YYYY-MM-DD in Buenos Aires timezone
 */
export function formatDateForAPI(date: Date): string {
  const buenosAiresDate = toBuenosAiresDate(date);
  return buenosAiresDate.toISOString().split('T')[0];
}

/**
 * Get today's date in Buenos Aires timezone as YYYY-MM-DD
 */
export function getTodayBuenosAires(): string {
  return formatDateForAPI(new Date());
}

/**
 * Get day of week (0-6) in Buenos Aires timezone
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function getDayOfWeekBuenosAires(date: Date): number {
  return toBuenosAiresDate(date).getDay();
}

/**
 * Check if a date is today in Buenos Aires timezone
 */
export function isTodayBuenosAires(date: Date): boolean {
  const today = getBuenosAiresDate();
  const targetDate = toBuenosAiresDate(date);
  
  return today.getFullYear() === targetDate.getFullYear() &&
         today.getMonth() === targetDate.getMonth() &&
         today.getDate() === targetDate.getDate();
}

/**
 * Check if a date is in the past in Buenos Aires timezone
 */
export function isPastDateBuenosAires(date: Date): boolean {
  const today = getBuenosAiresDate();
  const targetDate = toBuenosAiresDate(date);
  
  // Set time to start of day for comparison
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate < today;
}

/**
 * Check if a booking has expired in Buenos Aires timezone
 */
export function isBookingExpiredBuenosAires(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  
  const now = getBuenosAiresDate();
  const expiryDate = new Date(expiresAt);
  
  return now > expiryDate;
}

/**
 * Get available dates (today + next 6 days) in Buenos Aires timezone
 */
export function getAvailableDatesBuenosAires(): Date[] {
  const dates: Date[] = [];
  const today = getBuenosAiresDate();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  
  return dates;
}

/**
 * Format date for display in Buenos Aires timezone
 */
export function formatDateForDisplay(date: Date): string {
  const buenosAiresDate = toBuenosAiresDate(date);
  return buenosAiresDate.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get day name in Spanish for Buenos Aires timezone
 */
export function getDayNameBuenosAires(dayNumber: number): string {
  const days = [
    'Domingo',
    'Lunes', 
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
  ];
  return days[dayNumber] || '';
}

/**
 * Get current time in Buenos Aires timezone as HH:MM
 */
export function getCurrentTimeBuenosAires(): string {
  const now = getBuenosAiresDate();
  return now.toTimeString().slice(0, 5);
}
