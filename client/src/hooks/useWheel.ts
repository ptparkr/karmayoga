import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { useAreaColors } from './useAreaColors';
import type { WheelAxisId } from '../types';

const DEFAULT_AXES: WheelAxisId[] = ['body', 'mind', 'soul', 'growth', 'money', 'mission', 'romance', 'family', 'friends', 'joy'];
const STORAGE_KEY = 'wheel_data';

interface StoredWheelData {
  axes: Record<WheelAxisId, { currentScore: number; targetScore: number }>;
  snapshots: { date: string; scores: Record<WheelAxisId, number> }[];
  lastSaved: string;
}

function loadFromStorage(): StoredWheelData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(data: StoredWheelData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save wheel to storage:', err);
  }
}

export function useWheel() {
  const [rawAxes, setRawAxes] = useState<{ id: WheelAxisId; currentScore: number; targetScore: number }[]>([]);
  const [snapshots, setSnapshots] = useState<{ date: string; scores: Record<WheelAxisId, number> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const axes = useMemo(() => {
    if (rawAxes.length > 0) return rawAxes;
    const stored = loadFromStorage();
    if (stored?.axes) {
      return DEFAULT_AXES.map(id => ({
        id,
        currentScore: stored.axes[id]?.currentScore ?? 5,
        targetScore: stored.axes[id]?.targetScore ?? 8,
      }));
    }
    return DEFAULT_AXES.map(id => ({ id, currentScore: 5, targetScore: 8 }));
  }, [rawAxes]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    let loadedFromServer = false;
    try {
      const data = await api.getWheel();
      loadedFromServer = true;
      const loadedAxes = DEFAULT_AXES.map(id => {
        const existing = data.axes.find(a => a.id === id);
        return {
          id,
          currentScore: existing?.currentScore ?? 5,
          targetScore: existing?.targetScore ?? 8,
        };
      });
      setRawAxes(loadedAxes);
      setSnapshots(data.snapshots || []);
      
      saveToStorage({
        axes: loadedAxes.reduce((acc, a) => ({ ...acc, [a.id]: { currentScore: a.currentScore, targetScore: a.targetScore } }), {} as Record<WheelAxisId, { currentScore: number; targetScore: number }>),
        snapshots: data.snapshots || [],
        lastSaved: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Server unavailable, loading from localStorage:', err);
      const stored = loadFromStorage();
      if (stored) {
        setRawAxes(DEFAULT_AXES.map(id => ({
          id,
          currentScore: stored.axes[id]?.currentScore ?? 5,
          targetScore: stored.axes[id]?.targetScore ?? 8,
        })));
        setSnapshots(stored.snapshots || []);
      } else {
        setRawAxes([]);
        setSnapshots([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateAxis = useCallback(async (id: WheelAxisId, score: number, type: 'current' | 'target') => {
    setRawAxes(prev => {
      const updated = prev.map(a => 
        a.id === id 
          ? { ...a, [type === 'current' ? 'currentScore' : 'targetScore']: score }
          : a
      );
      
      const currentSnapshots = snapshots.length > 0 
        ? snapshots.map(s => ({ date: s.date, scores: s.scores }))
        : [];
      
      saveToStorage({
        axes: updated.reduce((acc, a) => ({ ...acc, [a.id]: { currentScore: a.currentScore, targetScore: a.targetScore } }), {} as Record<WheelAxisId, { currentScore: number; targetScore: number }>),
        snapshots: currentSnapshots as { date: string; scores: Record<WheelAxisId, number> }[],
        lastSaved: new Date().toISOString(),
      });
      
      return updated;
    });
    
    try {
      await api.updateWheelAxis(id, score, type);
    } catch (err) {
      console.error('Failed to sync to server:', err);
    }
  }, [snapshots]);

  const takeSnapshot = useCallback(async () => {
    const newSnapshot = {
      date: new Date().toISOString(),
      scores: axes.reduce((acc, a) => ({ ...acc, [a.id]: a.currentScore }), {} as Record<WheelAxisId, number>),
    };
    
    setSnapshots(prev => {
      const updated = [...prev, newSnapshot];
      const currentAxes = rawAxes.length > 0 ? rawAxes : axes;
      saveToStorage({
        axes: currentAxes.reduce((acc, a) => ({ ...acc, [a.id]: { currentScore: a.currentScore, targetScore: a.targetScore } }), {} as Record<WheelAxisId, { currentScore: number; targetScore: number }>),
        snapshots: updated,
        lastSaved: new Date().toISOString(),
      });
      return updated;
    });
    
    try {
      await api.createWheelSnapshot();
    } catch (err) {
      console.error('Failed to sync snapshot to server:', err);
    }
  }, [axes, rawAxes]);

  const getBalanceScore = useCallback(() => {
    const currentAxes = axes;
    if (currentAxes.length === 0) return 0;
    const scores = currentAxes.map(a => a.currentScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, Math.round(100 - stdDev * 10));
  }, [axes]);

  const getGroupScores = useCallback(() => {
    const currentAxes = axes;
    const groups = {
      health: ['body', 'mind', 'soul'] as WheelAxisId[],
      work: ['growth', 'money', 'mission'] as WheelAxisId[],
      relationships: ['romance', 'family', 'friends'] as WheelAxisId[],
      joy: ['joy'] as WheelAxisId[],
    };
    
    const result: Record<string, number> = {};
    for (const [group, axisIds] of Object.entries(groups)) {
      const groupScores = currentAxes.filter(a => axisIds.includes(a.id)).map(a => a.currentScore);
      result[group] = groupScores.length 
        ? Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length)
        : 0;
    }
    return result;
  }, [axes]);

  return {
    axes,
    snapshots,
    loading,
    error,
    updateAxis,
    takeSnapshot,
    getBalanceScore,
    getGroupScores,
    refresh: load,
  };
}