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
export declare function getCurrentTimeInfo(): TimeInfo;
/**
 * Normalizes a date string or Date object to YYYY-MM-DD (local)
 */
export declare function toDateStr(date?: Date | string): string;
/**
 * Returns a date string from N days ago
 */
export declare function getDaysAgo(days: number): string;
export declare function addDays(date: Date | string, days: number): Date;
export declare function startOfDay(date: Date | string): Date;
