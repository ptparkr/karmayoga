"use strict";
/**
 * Centralized Time Utility for Karma-Yoga
 * Provides standardized calculations for "Today", "Week Start", etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentTimeInfo = getCurrentTimeInfo;
exports.toDateStr = toDateStr;
exports.getDaysAgo = getDaysAgo;
exports.addDays = addDays;
exports.startOfDay = startOfDay;
function getCurrentTimeInfo() {
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
function toDateStr(date = new Date()) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/**
 * Returns a date string from N days ago
 */
function getDaysAgo(days) {
    const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
}
function addDays(date, days) {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function startOfDay(date) {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
