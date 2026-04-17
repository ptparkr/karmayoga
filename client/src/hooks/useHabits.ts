import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { today } from '../lib/dateUtils';
import type { Habit, HabitStreak, LeaderboardEntry } from '../types';

function parseTargetDays(habit: Habit): number[] {
  try {
    const parsed = JSON.parse(habit.target_days || '[0,1,2,3,4,5,6]');
    return Array.isArray(parsed) ? parsed : [0, 1, 2, 3, 4, 5, 6];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<string, Set<string>>>({}); // habitId -> Set<date>
  const [streaks, setStreaks] = useState<Record<string, HabitStreak>>({}); // habitId -> streak data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getHabits();
      setHabits(data);

      // Fetch all check-ins in parallel
      const entries = await Promise.all(
        data.map(async (h: Habit) => {
          const dates = await api.getCheckins(h.id);
          return [h.id, new Set(dates)] as const;
        })
      );
      setCheckins(Object.fromEntries(entries));

      // Fetch streaks for all habits
      const streakData: Record<string, HabitStreak> = {};
      await Promise.all(
        data.map(async (h: Habit) => {
          try {
            const streak = await api.getStreak(h.id);
            streakData[h.id] = streak;
          } catch {
            // Ignore errors for individual streak fetches
          }
        })
      );
      setStreaks(streakData);

      // Fetch leaderboard
      try {
        const board = await api.getLeaderboard();
        setLeaderboard(board);
      } catch {
        // Ignore leaderboard errors
      }
    } catch (err) {
      console.error('Failed to load habits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load habits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addHabit = useCallback(async (name: string, area: string, targetDays?: number[]) => {
    const habit = await api.createHabit(name, area, targetDays);
    setHabits(prev => [...prev, habit]);
    setCheckins(prev => ({ ...prev, [habit.id]: new Set() }));
    setStreaks(prev => ({ ...prev, [habit.id]: { habitId: habit.id, currentStreak: 0, longestStreak: 0, totalCheckins: 0, lastCheckinDate: null } }));
    // Refresh leaderboard
    const board = await api.getLeaderboard();
    setLeaderboard(board);
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    await api.deleteHabit(id);
    setHabits(prev => prev.filter(h => h.id !== id));
    setCheckins(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setStreaks(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Refresh leaderboard
    const board = await api.getLeaderboard();
    setLeaderboard(board);
  }, []);

  const toggleCheckin = useCallback(async (id: string, date?: string) => {
    const d = date || today();
    const result = await api.toggleCheckin(id, d);
    setCheckins(prev => {
      const set = new Set(prev[id] || []);
      if (result.checked) set.add(d);
      else set.delete(d);
      return { ...prev, [id]: set };
    });
    // Refresh streak for this habit
    try {
      const streak = await api.getStreak(id);
      setStreaks(prev => ({ ...prev, [id]: streak }));
      const board = await api.getLeaderboard();
      setLeaderboard(board);
    } catch {
      // Ignore streak refresh errors
    }
  }, []);

  const isCheckedToday = useCallback((id: string) => {
    return checkins[id]?.has(today()) || false;
  }, [checkins]);

  const isScheduledToday = useCallback((id: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return false;
    const days = parseTargetDays(habit);
    const todayDay = new Date().getDay();
    return days.includes(todayDay);
  }, [habits]);

  const getTargetDays = useCallback((id: string): number[] => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return [0, 1, 2, 3, 4, 5, 6];
    return parseTargetDays(habit);
  }, [habits]);

  const updateTargetDays = useCallback(async (id: string, targetDays: number[]) => {
    await api.updateTargetDays(id, targetDays);
    setHabits(prev => prev.map(h => 
      h.id === id ? { ...h, target_days: JSON.stringify(targetDays) } : h
    ));
  }, []);

  // Aggregate checkins for heatmap: date -> number of habits checked
  const aggregateCheckins = useCallback((): Record<string, number> => {
    const map: Record<string, number> = {};
    Object.values(checkins).forEach(dateSet => {
      dateSet.forEach(date => {
        map[date] = (map[date] || 0) + 1;
      });
    });
    return map;
  }, [checkins]);

  return { 
    habits, 
    checkins, 
    streaks,
    leaderboard,
    loading, 
    error, 
    addHabit, 
    deleteHabit, 
    toggleCheckin, 
    isCheckedToday,
    isScheduledToday,
    getTargetDays,
    updateTargetDays,
    aggregateCheckins, 
    refresh: load 
  };
}
