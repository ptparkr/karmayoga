import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { AreaSummary, ConsistencyData, StreakData, WeeklyData } from '../types';

export function useDashboard() {
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [weekly, setWeekly] = useState<WeeklyData | null>(null);
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

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
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregated stats
  const totalCurrentStreak = streaks.reduce((max, s) => Math.max(max, s.currentStreak), 0);
  const totalLongestStreak = streaks.reduce((max, s) => Math.max(max, s.longestStreak), 0);

  const toggleCheckin = useCallback(async (habitId: string, date: string) => {
    try {
      await api.toggleCheckin(habitId, date);
      load();
    } catch (err) {
      console.error('Failed to toggle checkin:', err);
    }
  }, [load]);

  return {
    streaks,
    weekly,
    areas,
    consistency,
    loading,
    error,
    totalCurrentStreak,
    totalLongestStreak,
    toggleCheckin,
    refresh: load,
  };
}
