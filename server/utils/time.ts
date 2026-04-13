/**
 * Centralized Time Utility for Karma-Yoga
 * Provides standardized calculations for "Today", "Week Start", etc.
 */

export interface TimeInfo {
  iso: string;
  local: string;
  todayStart: string;
  todayEnd: string;
  weekStart: string;
  monthStart: string;
  dayOfWeek: number;
  timezone: string;
}

export function getCurrentTimeInfo(): TimeInfo {
  const now = new Date();
  
  // Start of Day (00:00:00)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  // End of Day (23:59:59)
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  // Start of Week (Monday)
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  
  // Start of Month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  return {
    iso: now.toISOString(),
    local: now.toLocaleString(),
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    weekStart: weekStart.toISOString(),
    monthStart: monthStart.toISOString(),
    dayOfWeek: now.getDay(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Normalizes a date string or Date object to YYYY-MM-DD
 */
export function toDateStr(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Returns a date string from N days ago
 */
export function getDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}
