import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { HealthCheckin, LongevityScore, HealthTrend, BiologicalMarker, TodayCheckinStatus } from '../types';

interface HealthTrends {
  hrv: HealthTrend[];
  sleep: HealthTrend[];
  restingHR: HealthTrend[];
  energy: HealthTrend[];
  mood: HealthTrend[];
}

export function useHealth() {
  const [todayStatus, setTodayStatus] = useState<TodayCheckinStatus>({
    hasCheckedIn: false,
    checkin: null
  });
  const [longevity, setLongevity] = useState<LongevityScore | null>(null);
  const [trends, setTrends] = useState<HealthTrends>({ 
    hrv: [], sleep: [], restingHR: [], energy: [], mood: [] 
  });
  const [markers, setMarkers] = useState<BiologicalMarker[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [status, lon, tr, mk] = await Promise.all([
        api.getTodayCheckin(),
        api.getLongevity(),
        Promise.all([
          api.getHealthTrends('hrv', 30),
          api.getHealthTrends('sleep', 30),
          api.getHealthTrends('restingHR', 30),
          api.getHealthTrends('energy', 30),
          api.getHealthTrends('mood', 30),
        ]),
        api.getMarkers(),
      ]);
      setTodayStatus(status);
      setLongevity(lon);
      setTrends({ hrv: tr[0], sleep: tr[1], restingHR: tr[2], energy: tr[3], mood: tr[4] });
      setMarkers(mk);
    } catch (err) {
      console.error('Failed to load health data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitCheckin = useCallback(async (data: Omit<HealthCheckin, 'id' | 'date'>) => {
    const checkin = await api.createCheckin({ ...data, date: new Date().toISOString().slice(0, 10) });
    setTodayStatus({ hasCheckedIn: true, checkin });
    await load();
    return checkin;
  }, [load]);

  const addMarker = useCallback(async (data: Omit<BiologicalMarker, 'id'>) => {
    const marker = await api.createMarker({ ...data, date: new Date().toISOString().slice(0, 10) });
    setMarkers(prev => [...prev, marker]);
    return marker;
  }, []);

  return {
    todayStatus,
    longevity,
    trends,
    markers,
    loading,
    submitCheckin,
    addMarker,
    refresh: load,
  };
}