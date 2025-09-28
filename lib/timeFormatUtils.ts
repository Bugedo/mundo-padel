/**
 * Utility functions for formatting time values
 */

/**
 * Formats a time string to HH:MM format (removes seconds)
 * @param timeString - Time string in HH:MM:SS or HH:MM format
 * @returns Formatted time string in HH:MM format
 */
export function formatTime(timeString: string): string {
  if (!timeString) return timeString;

  // If already in HH:MM format, return as is
  if (timeString.length === 5) return timeString;

  // If in HH:MM:SS format, extract first 5 characters
  if (timeString.length >= 5) return timeString.substring(0, 5);

  return timeString;
}

/**
 * Formats a time range for display (start - end)
 * @param startTime - Start time string
 * @param endTime - End time string
 * @returns Formatted time range string
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const formattedStart = formatTime(startTime);
  const formattedEnd = formatTime(endTime);
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Formats time for display in tables and forms
 * @param timeString - Time string in HH:MM:SS or HH:MM format
 * @returns Formatted time string for display
 */
export function formatTimeForDisplay(timeString: string): string {
  return formatTime(timeString);
}
