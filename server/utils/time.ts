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
  weekEnd: string;
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

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  // Start of Month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  return {
    iso: now.toISOString(),
    local: now.toLocaleString(),
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    monthStart: monthStart.toISOString(),
    dayOfWeek: now.getDay(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Normalizes a date string or Date object to YYYY-MM-DD (local)
 */
export function toDateStr(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a date string from N days ago
 */
export function getDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
