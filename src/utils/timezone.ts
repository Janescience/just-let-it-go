/**
 * Timezone utility functions for handling Thailand time consistently
 *
 * This utility helps manage timezone issues between local development (Thailand)
 * and server deployment (UTC) environments.
 */

export const THAILAND_TIMEZONE = 'Asia/Bangkok';
export const THAILAND_OFFSET_HOURS = 7;

/**
 * Get current Thailand time
 * @returns Date object in Thailand timezone
 */
export function getCurrentThailandTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE }));
}

/**
 * Convert any date to Thailand timezone
 * @param date - Date to convert (defaults to current time)
 * @returns Date object adjusted to Thailand timezone
 */
export function toThailandTime(date: Date = new Date()): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE }));
}

/**
 * Create a new Date that represents Thailand time
 * This is the recommended function to use for all new timestamps
 * @returns Date object in Thailand timezone
 */
export function createThailandDate(): Date {
  return getCurrentThailandTime();
}

/**
 * Convert UTC date to Thailand time (for fixing old data)
 * @param utcDate - UTC date to convert
 * @returns Date object adjusted to Thailand timezone
 */
export function utcToThailandTime(utcDate: Date): Date {
  const utcTime = utcDate.getTime();
  const thailandTime = utcTime + (THAILAND_OFFSET_HOURS * 60 * 60 * 1000);
  return new Date(thailandTime);
}

/**
 * Format date for Thailand locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in Thai
 */
export function formatThaiDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  return date.toLocaleDateString('th-TH', {
    ...options,
    timeZone: THAILAND_TIMEZONE
  });
}

/**
 * Get date key for grouping (YYYY-MM-DD format in Thailand timezone)
 * @param date - Date to convert
 * @returns Date string in YYYY-MM-DD format
 */
export function getThaiDateKey(date: Date): string {
  const thailandDate = toThailandTime(date);
  return thailandDate.toISOString().split('T')[0];
}

/**
 * Check if the current server environment is in Thailand timezone
 * @returns true if server is already in Thailand timezone
 */
export function isServerInThailandTimezone(): boolean {
  const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return serverTimezone === THAILAND_TIMEZONE;
}

/**
 * Legacy function: Convert UTC to Thailand time (for migration)
 * Use this only for fixing old data that was stored in UTC
 * @param utcDate - UTC date
 * @returns Thailand time
 */
export function migrateUtcToThailand(utcDate: Date): Date {
  return utcToThailandTime(utcDate);
}