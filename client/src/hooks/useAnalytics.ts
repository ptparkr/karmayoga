import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { PomodoroSession, HabitWithSchedule, AreaSummary, ConsistencyData, StreakData, WheelAxisId, HealthCheckin } from '../types';
import type { 
  MomentumDataPoint, 
  PeakHourCell, 
  AreaBalanceData, 
  CorrelationPoint,
  WeeklyReportData 
} from '../lib/analytics';
import { 
  momentumTimeSeries, 
  peakHoursGrid, 
  areaBalanceByAreas, 
  buildWeeklyReport,
  sleepFocusCorrelation,
  linearRegression
} from '../lib/analytics';
import { useAreaColors } from './useAreaColors';

type WheelAxis = { id: WheelAxisId; currentScore: number; targetScore: number };

export function useAnalytics() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [habits, setHabits] = useState<HabitWithSchedule[]>([]);
  const [habitAreas, setHabitAreas] = useState<string[]>([]);
  const [areaSummaries, setAreaSummaries] = useState<AreaSummary[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [wheelAxes, setWheelAxes] = useState<WheelAxis[]>([]);
  const [wheelSnapshots, setWheelSnapshots] = useState<{ date: string; scores: Record<WheelAxisId, number> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { areas: areaColorsList, getColor } = useAreaColors();

  // Computed analytics
  const [momentum, setMomentum] = useState<MomentumDataPoint[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourCell[][]>([]);
  const [areaBalance, setAreaBalance] = useState<AreaBalanceData[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [healthCheckins, setHealthCheckins] = useState<HealthCheckin[]>([]);
  const [habitEntries, setHabitEntries] = useState<{ habitId: string; date: string; completed: boolean }[]>([]);
  const [sleepFocusData, setSleepFocusData] = useState<CorrelationPoint[]>([]);
  const [sleepFocusRegression, setSleepFocusRegression] = useState<{ slope: number; intercept: number }>({ slope: 0, intercept: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch data with individual try/catch for each to avoid one failure breaking all
      let sessionsData: PomodoroSession[] = [];
      let habitsData: any[] = [];
      let areasData: AreaSummary[] = [];
      let consistencyData: ConsistencyData | null = null;
      let streaksData: StreakData[] = [];

      try {
        sessionsData = await api.getRecentSessions(30);
      } catch (e) {
        console.warn('Failed to fetch sessions:', e);
      }

      try {
        habitsData = await api.getHabits();
      } catch (e) {
        console.warn('Failed to fetch habits:', e);
      }

      try {
        areasData = await api.getAreas();
      } catch (e) {
        console.warn('Failed to fetch areas:', e);
      }

      try {
        consistencyData = await api.getConsistency();
      } catch (e) {
        console.warn('Failed to fetch consistency:', e);
      }

      try {
        streaksData = await api.getStreaks();
      } catch (e) {
        console.warn('Failed to fetch streaks:', e);
      }

      // Fetch health checkins for weekly report
      let healthData: HealthCheckin[] = [];
      try {
        healthData = await api.getHealthCheckins(30);
        setHealthCheckins(healthData);
      } catch (e) {
        console.warn('Failed to fetch health checkins:', e);
      }

      // Build habit entries from checkins data
      const entries: { habitId: string; date: string; completed: boolean }[] = [];
      for (const h of habitsData) {
        try {
          const dates = await api.getCheckins(h.id);
          for (const date of dates) {
            entries.push({ habitId: h.id, date, completed: true });
          }
        } catch {
          // Ignore individual habit checkin errors
        }
      }
      setHabitEntries(entries);

      setSessions(sessionsData);
      setHabits(habitsData.map(h => ({
        ...h,
        targetDays: JSON.parse(h.target_days || '[]') as number[],
      })));
      
      // Extract unique areas from habits
      const uniqueAreas = [...new Set(habitsData.map((h: any) => h.area))].filter(Boolean);
      setHabitAreas(uniqueAreas.length > 0 ? uniqueAreas : areaColorsList.slice(0, 3));
      
      setAreaSummaries(areasData);
      setConsistency(consistencyData);
      setStreaks(streaksData);

      // Compute momentum with actual sessions data
      const mom = momentumTimeSeries(sessionsData);
      setMomentum(mom);

      const peak = peakHoursGrid(sessionsData);
      setPeakHours(peak);

      // Compute area balance with dynamic areas
      const dynamicAreas = uniqueAreas.length > 0 ? uniqueAreas : (areaColorsList.slice(0, 3) as string[]);
      const balance = areaBalanceByAreas(sessionsData, dynamicAreas, 8);
      setAreaBalance(balance);

      // Compute sleep × focus correlation
      const corrPoints = sleepFocusCorrelation(sessionsData, healthData);
      setSleepFocusData(corrPoints);
      const regPoints = corrPoints.map(p => ({ x: p.sleepHours, y: p.avgFocusMinutes }));
      setSleepFocusRegression(linearRegression(regPoints));

      // Load wheel data — try server first, fall back to localStorage
      let loadedWheelAxes: WheelAxis[] = [];
      try {
        const defaultAxes: WheelAxisId[] = ['body', 'mind', 'soul', 'growth', 'money', 'mission', 'romance', 'family', 'friends', 'joy'];
        // Try API first
        const wheelData = await api.getWheel().catch(() => null);
        if (wheelData && wheelData.axes && wheelData.axes.length > 0) {
          loadedWheelAxes = defaultAxes.map(id => {
            const existing = wheelData.axes.find((a: any) => a.id === id);
            return { id, currentScore: existing?.currentScore ?? 5, targetScore: existing?.targetScore ?? 8 };
          });
          setWheelSnapshots(wheelData.snapshots || []);
        } else {
          // Fall back to localStorage
          const stored = localStorage.getItem('wheel_data');
          if (stored) {
            const wheelLocalData = JSON.parse(stored);
            loadedWheelAxes = defaultAxes.map(id => ({
              id,
              currentScore: wheelLocalData.axes?.[id]?.currentScore ?? 5,
              targetScore: wheelLocalData.axes?.[id]?.targetScore ?? 8,
            }));
            setWheelSnapshots(wheelLocalData.snapshots || []);
          } else {
            loadedWheelAxes = defaultAxes.map(id => ({ id, currentScore: 5, targetScore: 8 }));
          }
        }
        setWheelAxes(loadedWheelAxes);
      } catch (err) {
        console.warn('Failed to load wheel data:', err);
      }

      // Build weekly report — use local variables (not stale state) so data is always current
      const report = buildWeeklyReport(
        sessionsData,
        healthData,
        habitsData.map(h => ({ ...h, targetDays: JSON.parse(h.target_days || '[]') })),
        entries,           // local var, not stale habitEntries state
        loadedWheelAxes    // local var, not stale wheelAxes state
      );
      setWeeklyReport(report);
    } catch (err) {
      console.error('Analytics load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [areaColorsList]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    sessions,
    habits,
    habitAreas,
    areaSummaries,
    consistency,
    streaks,
    wheelAxes,
    wheelSnapshots,
    momentum,
    peakHours,
    areaBalance,
    weeklyReport,
    healthCheckins,
    sleepFocusData,
    sleepFocusRegression,
    loading,
    error,
    getColor,
    refresh: loadData,
  };
}