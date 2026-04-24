import type { PomodoroSession, FocusSession, HealthCheckin, Habit, HabitWithSchedule } from '../types';

type WheelAxis = { id: string; currentScore: number; targetScore: number };

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getRecommendedDuration(sessions: PomodoroSession[]): 25 | 45 | 90 {
  if (sessions.length < 3) return 25;
  
  const recent = sessions.slice(0, Math.min(sessions.length, 7));
  const validSessions = recent.filter(s => s.quality != null);
  
  if (validSessions.length < 3) return 25;
  
  const avgQuality = validSessions.reduce((sum, s) => sum + (s.quality || 0), 0) / validSessions.length;
  const avgDuration = validSessions.reduce((sum, s) => sum + s.focus_min, 0) / validSessions.length;
  
  if (avgQuality >= 4 && avgDuration >= 40) return 90;
  if (avgQuality >= 3.5 && avgDuration >= 22) return 45;
  return 25;
}

export interface HeatmapCell {
  date: string;
  totalMinutes: number;
  qualityAvg: number | null;
  sessionCount: number;
}

export function aggregateByDay(sessions: PomodoroSession[]): Map<string, HeatmapCell> {
  const map = new Map<string, HeatmapCell>();
  
  for (const s of sessions) {
    if (!s.completed) continue;
    const date = s.created_at ? toLocalDateString(new Date(s.created_at)) : '';
    if (!date) continue;
    
    const existing = map.get(date) || { date, totalMinutes: 0, qualityAvg: null, sessionCount: 0 };
    existing.totalMinutes += s.focus_min || 0;
    existing.sessionCount += 1;
    
    if (s.quality != null) {
      const prevTotal = (existing.qualityAvg || 0) * (existing.sessionCount - 1);
      existing.qualityAvg = (prevTotal + s.quality) / existing.sessionCount;
    }
    map.set(date, existing);
  }
  return map;
}

// ─── Momentum Score ─────────────────────────────────────────────────
export interface MomentumDataPoint {
  date: string;
  score: number;
  rawMinutes: number;
}

export function momentumTimeSeries(sessions: PomodoroSession[]): MomentumDataPoint[] {
  const byDay = new Map<string, number>();
  
  for (const s of sessions) {
    if (!s.completed) continue;
    const date = s.created_at ? toLocalDateString(new Date(s.created_at)) : '';
    if (!date) continue;
    
    const weight = (s.quality ?? 3) / 5;
    byDay.set(date, (byDay.get(date) || 0) + (s.focus_min || 0) * weight);
  }

  const allDates = Array.from(byDay.keys()).sort();
  if (allDates.length === 0) return [];

  const filled: MomentumDataPoint[] = [];
  const cur = new Date(allDates[0]);
  const end = new Date();
  while (cur <= end) {
    const d = toLocalDateString(cur);
    filled.push({ date: d, rawMinutes: byDay.get(d) || 0, score: 0 });
    cur.setDate(cur.getDate() + 1);
  }

  const alpha = 2 / 8;
  let ema = filled[0].rawMinutes;
  const MAX_DAILY = 200;

  return filled.map(({ date, rawMinutes }) => {
    ema = alpha * rawMinutes + (1 - alpha) * ema;
    return { 
      date, 
      rawMinutes, 
      score: Math.min(100, Math.round((ema / MAX_DAILY) * 100)) 
    };
  });
}

// ─── Peak Hours Grid ───────────────────────────────────────────────
export interface PeakHourCell {
  day: number; // 0=Sun ... 6=Sat
  hour: number; // 0-23
  avgMinutes: number;
  avgQuality: number | null;
  sessionCount: number;
}

export function peakHoursGrid(sessions: PomodoroSession[]): PeakHourCell[][] {
  const grid: PeakHourCell[][] = Array.from({ length: 7 }, () => 
    Array.from({ length: 24 }, () => ({
      day: 0, hour: 0, avgMinutes: 0, avgQuality: null, sessionCount: 0
    }))
  );

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      grid[d][h] = { day: d, hour: h, avgMinutes: 0, avgQuality: null, sessionCount: 0 };
    }
  }

  for (const s of sessions) {
    if (!s.completed || !s.created_at) continue;
    const date = new Date(s.created_at);
    const day = date.getDay();
    const hour = date.getHours();
    const cell = grid[day][hour];
    
    const newCount = cell.sessionCount + 1;
    const newAvg = ((cell.avgMinutes || 0) * cell.sessionCount + (s.focus_min || 0)) / newCount;
    const newQuality = cell.avgQuality !== null
      ? ((cell.avgQuality || 3) * cell.sessionCount + (s.quality || 3)) / newCount
      : (s.quality ?? 3);
    
    grid[day][hour] = {
      day,
      hour,
      avgMinutes: Math.round(newAvg),
      avgQuality: Math.round(newQuality * 10) / 10,
      sessionCount: newCount
    };
  }

  return grid;
}

// ─── Area Balance (Weekly) - Dynamic ─────────────────────────────────────────
export interface AreaBalanceData {
  weekStart: string;
  data: Record<string, number>;
}

export function areaBalanceByAreas(sessions: PomodoroSession[], areas: string[], weeks = 8): AreaBalanceData[] {
  const result: AreaBalanceData[] = [];
  const now = new Date();
  
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekSessions = sessions.filter(s => {
      if (!s.completed || !s.created_at) return false;
      const sessDate = new Date(s.created_at);
      return sessDate >= weekStart && sessDate < weekEnd;
    });
    
    const totals: Record<string, number> = {};
    for (const area of areas) {
      totals[area] = 0;
    }
    
    for (const s of weekSessions) {
      const area = s.area || 'other';
      totals[area] = (totals[area] || 0) + (s.focus_min || 0);
    }
    
    result.push({
      weekStart: toLocalDateString(weekStart),
      data: totals
    });
  }
  
  return result;
}

// Legacy interface for backwards compatibility
export interface AreaBalanceWeek {
  weekStart: string;
  health: number;
  learning: number;
  social: number;
  finance: number;
  recovery: number;
}

const AREA_GROUPS: Record<string, string> = {
  body: 'health', mind: 'health', soul: 'health',
  health: 'health',
  growth: 'learning', learning: 'learning',
  money: 'finance', finance: 'finance',
  mission: 'social', social: 'social', romance: 'social', family: 'social', friends: 'social',
  recovery: 'recovery', joy: 'recovery'
};

export function areaBalanceByWeek(sessions: PomodoroSession[], weeks = 8): AreaBalanceWeek[] {
  const result: AreaBalanceWeek[] = [];
  const now = new Date();
  
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekSessions = sessions.filter(s => {
      if (!s.completed || !s.created_at) return false;
      const sessDate = new Date(s.created_at);
      return sessDate >= weekStart && sessDate < weekEnd;
    });
    
    const totals: Record<string, number> = { health: 0, learning: 0, social: 0, finance: 0, recovery: 0 };
    
    for (const s of weekSessions) {
      const area = s.area || 'other';
      const group = AREA_GROUPS[area] || 'other';
      totals[group] = (totals[group] || 0) + (s.focus_min || 0);
    }
    
    result.push({
      weekStart: toLocalDateString(weekStart),
      health: totals.health || 0,
      learning: totals.learning || 0,
      social: totals.social || 0,
      finance: totals.finance || 0,
      recovery: totals.recovery || 0
    });
  }
  
  return result;
}

// ─── Sleep × Focus Correlation ─────────────────────────────────────
export interface CorrelationPoint {
  date: string;
  sleepHours: number;
  avgFocusMinutes: number;
  avgQuality: number;
}

export function sleepFocusCorrelation(
  sessions: PomodoroSession[],
  checkins: HealthCheckin[]
): CorrelationPoint[] {
  const sleepByDate = new Map<string, number>();
  for (const c of checkins) {
    if (c.sleepHours != null) sleepByDate.set(c.date, c.sleepHours);
  }
  
  const focusByDate = new Map<string, { total: number; quality: number; count: number }>();
  for (const s of sessions) {
    if (!s.completed || !s.created_at) continue;
    const date = toLocalDateString(new Date(s.created_at));
    const existing = focusByDate.get(date) || { total: 0, quality: 0, count: 0 };
    focusByDate.set(date, {
      total: existing.total + (s.focus_min || 0),
      quality: existing.quality + (s.quality || 3),
      count: existing.count + 1
    });
  }
  
  const points: CorrelationPoint[] = [];
  const allDates = new Set([...sleepByDate.keys(), ...focusByDate.keys()]);
  
  for (const date of allDates) {
    const sleep = sleepByDate.get(date);
    const focus = focusByDate.get(date);
    if (sleep != null && focus && focus.count > 0) {
      points.push({
        date,
        sleepHours: sleep,
        avgFocusMinutes: Math.round(focus.total / focus.count),
        avgQuality: Math.round((focus.quality / focus.count) * 10) / 10
      });
    }
  }
  
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  if (points.length < 2) return { slope: 0, intercept: 0 };
  
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope: Math.round(slope * 1000) / 1000, intercept: Math.round(intercept * 1000) / 1000 };
}

// ─── Energy × Mood Correlation ─────────────────────────────────────────────
export interface EnergyMoodPoint {
  date: string;
  energy: number;
  mood: number;
}

export function energyMoodCorrelation(checkins: HealthCheckin[]): EnergyMoodPoint[] {
  return checkins
    .filter(c => c.energyLevel != null && c.moodScore != null)
    .map(c => ({
      date: c.date,
      energy: c.energyLevel!,
      mood: c.moodScore!
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Habit Area Completion (Weekly) ───────────────────────────────────────────
export interface HabitAreaCompletion {
  weekStart: string;
  areaId: string;
  rate: number;
}

export function habitAreaCompletionByWeek(
  habits: HabitWithSchedule[],
  areaId: string,
  entries: { habitId: string; date: string; completed: boolean }[],
  weeks = 8
): HabitAreaCompletion[] {
  const result: HabitAreaCompletion[] = [];
  const now = new Date();
  
  const areaHabits = habits.filter(h => h.area === areaId);
  
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    
    let scheduled = 0;
    let completed = 0;
    
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dayOfWeek = day.getDay();
      const dateStr = toLocalDateString(day);
      
      for (const h of areaHabits) {
        const targetDays = h.targetDays || [];
        if (!targetDays.includes(dayOfWeek)) continue;
        scheduled++;
        const entry = entries.find(e => e.habitId === h.id && e.date === dateStr && e.completed);
        if (entry) completed++;
      }
    }
    
    result.push({
      weekStart: toLocalDateString(weekStart),
      areaId,
      rate: scheduled > 0 ? Math.round((completed / scheduled) * 100) / 100 : 0
    });
  }
  
  return result;
}

// ─── Wheel Analytics ──────────────────────────────────────────────────────
export function wheelTrendByAxis(
  snapshots: { date: string; scores: Record<string, number> }[],
  axisId: string
): { date: string; score: number }[] {
  return snapshots
    .map(s => ({ date: s.date, score: s.scores[axisId] || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function wheelBalanceScore(axes: { currentScore: number }[]): number {
  const scores = axes.map(a => a.currentScore);
  if (scores.length === 0) return 50;
  
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.max(0, Math.round(100 - stdDev * 10));
}

// ─── Weekly Report Builder ─────────────────��─────────────────────────
export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  totalFocusMinutes: number;
  focusByArea: Record<string, number>;
  completedSessions: number;
  completionRate: number;
  avgQuality: number | null;
  topFocusArea: string | null;
  habitCompletionRate: number;
  habitAreaRates: Record<string, number>;
  longestCurrentStreak: { name: string; days: number } | null;
  sleepAvg: number | null;
  hrvAvg: number | null;
  energyAvg: number | null;
  moodAvg: number | null;
  wheelBalanceScore: number;
  lowestWheelAxis: { id: string; label: string; score: number } | null;
  momentumScore: number;
  recommendations: string[];
}

const WHEEL_LABELS: Record<string, string> = {
  body: 'Body', mind: 'Mind', soul: 'Soul',
  growth: 'Growth', money: 'Money', mission: 'Mission',
  romance: 'Romance', family: 'Family', friends: 'Friends', joy: 'Joy'
};

export function buildWeeklyReport(
  sessions: PomodoroSession[],
  checkins: HealthCheckin[],
  habits: HabitWithSchedule[],
  habitEntries: { habitId: string; date: string; completed: boolean }[],
  wheelAxes: { id: string; currentScore: number }[]
): WeeklyReportData {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = toLocalDateString(weekStart);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const weekEndStr = toLocalDateString(weekEnd);

  // Focus stats
  const weekSessions = sessions.filter(s => {
    if (!s.created_at) return false;
    const dateStr = toLocalDateString(new Date(s.created_at));
    return dateStr >= weekStartStr && dateStr <= weekEndStr;
  });
  const completed = weekSessions.filter(s => s.completed);
  const totalFocusMinutes = weekSessions.reduce((sum, s) => sum + (s.focus_min || 0), 0);
  const completionRate = weekSessions.length > 0 ? completed.length / weekSessions.length : 0;
  
  const qualitySessions = completed.filter(s => s.quality != null);
  const avgQuality = qualitySessions.length > 0
    ? qualitySessions.reduce((sum, s) => sum + (s.quality || 0), 0) / qualitySessions.length
    : null;
  
  const focusByArea: Record<string, number> = {};
  for (const s of weekSessions) {
    const area = s.area || 'other';
    focusByArea[area] = (focusByArea[area] || 0) + (s.focus_min || 0);
  }
  
  const focusAreas = ['health', 'learning', 'social', 'finance', 'recovery'];
  const sortedAreas = Object.entries(focusByArea).sort((a, b) => b[1] - a[1]);
  const topFocusArea = sortedAreas[0]?.[0] || null;
  
  // Habit stats
  let totalScheduled = 0;
  let totalCompleted = 0;
  const habitAreaRates: Record<string, number> = {};
  
  const areaIds = [...new Set(habits.map(h => h.area))];
  const completionLookup = new Set(habitEntries.map(e => `${e.habitId}:${e.date}`));
  const underperformingHabits: string[] = [];
  
  for (const areaId of areaIds) {
    let aScheduled = 0;
    let aCompleted = 0;
    
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dayOfWeek = day.getDay();
      const dateStr = toLocalDateString(day);
      
      const dayHabits = habits.filter(h => h.area === areaId);
      for (const h of dayHabits) {
        const targetDays = h.targetDays || [];
        if (!targetDays.includes(dayOfWeek)) continue;
        aScheduled++;
        totalScheduled++;
        if (completionLookup.has(`${h.id}:${dateStr}`)) {
          aCompleted++;
          totalCompleted++;
        }
      }
    }
    
    habitAreaRates[areaId] = aScheduled > 0 ? Math.round((aCompleted / aScheduled) * 100) / 100 : 0;
  }
  
  const habitCompletionRate = totalScheduled > 0 ? totalCompleted / totalScheduled : 0;
  
  // Longest streak
  const streakByHabit = new Map<string, { name: string; days: number }>();
  for (const h of habits) {
    const entries = habitEntries.filter(e => e.habitId === h.id && e.completed);
    if (entries.length === 0) continue;
    
    const dates = entries.map(e => e.date).sort();
    let streak = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        current++;
        streak = Math.max(streak, current);
      } else {
        current = 1;
      }
    }
    streakByHabit.set(h.id, { name: h.name, days: streak });
  }
  
  const longestCurrentStreak = [...streakByHabit.values()].sort((a, b) => b.days - a.days)[0] || null;
  
  // Health averages
  const weekCheckins = checkins.filter(c => c.date >= weekStartStr);
  const avg = (arr: (number | null)[]) => {
    const vals = arr.filter((x): x is number => x !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const sleepAvg = avg(weekCheckins.map(c => c.sleepHours));
  const hrvAvg = avg(weekCheckins.map(c => c.hrv));
  const energyAvg = avg(weekCheckins.map(c => c.energyLevel));
  const moodAvg = avg(weekCheckins.map(c => c.moodScore));
  
  // Wheel
  const wheelScore = wheelBalanceScore(wheelAxes);
  const sortedAxes = [...wheelAxes].sort((a, b) => a.currentScore - b.currentScore);
  const lowestWheelAxis = sortedAxes[0] ? { id: sortedAxes[0].id, label: WHEEL_LABELS[sortedAxes[0].id] || sortedAxes[0].id, score: sortedAxes[0].currentScore } : null;
  
  // Momentum
  const momentum = momentumTimeSeries(sessions);
  const weekMomentum = momentum.filter(m => m.date >= weekStartStr);
  const momentumScore = weekMomentum.length > 0
    ? Math.round(weekMomentum.reduce((s, m) => s + m.score, 0) / weekMomentum.length)
    : 0;
  
  // Recommendations
  const recommendations: string[] = [];
  if (completionRate < 0.7) {
    recommendations.push(`Session completion was ${Math.round(completionRate * 100)}%. Switch to 25-min blocks to rebuild consistency.`);
  }
  if (topFocusArea && focusAreas.every(a => a !== topFocusArea)) {
    recommendations.push(`Focus on "${topFocusArea}" — consider adding more variety.`);
  }
  if (sleepAvg !== null && sleepAvg < 7) {
    recommendations.push(`Average sleep was ${sleepAvg.toFixed(1)} hrs — below the 7-hr threshold for optimal focus.`);
  }
  if (habitCompletionRate < 0.6) {
    recommendations.push(`Overall habit completion was ${Math.round(habitCompletionRate * 100)}%. Consider dropping 1-2 low-impact habits.`);
  }
  
  // Detect specific underperforming habits
  for (const h of habits) {
    const relevantEntries = habitEntries.filter(e => e.habitId === h.id && e.date >= weekStartStr);
    const scheduledCount = Array.from({length: 7}).filter((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return h.targetDays?.includes(d.getDay());
    }).length;
    
    if (scheduledCount > 0 && relevantEntries.length / scheduledCount < 0.4) {
      underperformingHabits.push(h.name);
    }
  }

  if (underperformingHabits.length > 0) {
    recommendations.push(`Habit friction detected: "${underperformingHabits.slice(0, 2).join(', ')}" were often missed. Try a smaller version of these.`);
  }
  if (lowestWheelAxis && lowestWheelAxis.score < 4) {
    recommendations.push(`"${lowestWheelAxis.label}" is your lowest wheel axis (${lowestWheelAxis.score}/10). One intentional action this week can move it.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Excellent week. Raise your lowest wheel axis by 1 point next week.');
  }
  while (recommendations.length < 3) {
    recommendations.push('Log HRV and mood daily to unlock deeper correlations.');
  }
  
  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalFocusMinutes,
    focusByArea,
    completedSessions: completed.length,
    completionRate: Math.round(completionRate * 100) / 100,
    avgQuality: avgQuality ? Math.round(avgQuality * 10) / 10 : null,
    topFocusArea,
    habitCompletionRate: Math.round(habitCompletionRate * 100) / 100,
    habitAreaRates,
    longestCurrentStreak,
    sleepAvg: sleepAvg ? Math.round(sleepAvg * 10) / 10 : null,
    hrvAvg: hrvAvg ? Math.round(hrvAvg) : null,
    energyAvg: energyAvg ? Math.round(energyAvg * 10) / 10 : null,
    moodAvg: moodAvg ? Math.round(moodAvg * 10) / 10 : null,
    wheelBalanceScore: wheelScore,
    lowestWheelAxis,
    momentumScore,
    recommendations: recommendations.slice(0, 5)
  };
}