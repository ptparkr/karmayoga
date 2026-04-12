import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface StreakData {
  habitId: string;
  name: string;
  area: string;
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
}

interface WeeklyData {
  weekDates: string[];
  matrix: {
    habitId: string;
    name: string;
    area: string;
    days: { date: string; checked: boolean }[];
  }[];
}

interface AreaData {
  area: string;
  habitCount: number;
  checkins: number;
  possible: number;
  percentage: number;
}

interface ConsistencyData {
  totalHabits: number;
  totalCheckins: number;
  possible: number;
  percentage: number;
  missed: number;
}

export function useDashboard() {
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [weekly, setWeekly] = useState<WeeklyData | null>(null);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, w, a, c] = await Promise.all([
        api.getStreaks(),
        api.getWeekly(),
        api.getAreas(),
        api.getConsistency(),
      ]);
      setStreaks(s);
      setWeekly(w);
      setAreas(a);
      setConsistency(c);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregated stats
  const totalCurrentStreak = streaks.reduce((max, s) => Math.max(max, s.currentStreak), 0);
  const totalLongestStreak = streaks.reduce((max, s) => Math.max(max, s.longestStreak), 0);

  return {
    streaks,
    weekly,
    areas,
    consistency,
    loading,
    totalCurrentStreak,
    totalLongestStreak,
    refresh: load,
  };
}
