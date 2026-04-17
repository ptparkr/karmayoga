import type { PomodoroSession } from '../types';

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
    const date = s.created_at?.split('T')[0] || '';
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