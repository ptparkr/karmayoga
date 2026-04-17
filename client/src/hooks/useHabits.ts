import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { today } from '../lib/dateUtils';
import type { Habit } from '../types';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<string, Set<string>>>({}); // habitId -> Set<date>
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
    } catch (err) {
      console.error('Failed to load habits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load habits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addHabit = useCallback(async (name: string, area: string) => {
    const habit = await api.createHabit(name, area);
    setHabits(prev => [...prev, habit]);
    setCheckins(prev => ({ ...prev, [habit.id]: new Set() }));
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    await api.deleteHabit(id);
    setHabits(prev => prev.filter(h => h.id !== id));
    setCheckins(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
  }, []);

  const isCheckedToday = useCallback((id: string) => {
    return checkins[id]?.has(today()) || false;
  }, [checkins]);

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

  return { habits, checkins, loading, error, addHabit, deleteHabit, toggleCheckin, isCheckedToday, aggregateCheckins, refresh: load };
}
