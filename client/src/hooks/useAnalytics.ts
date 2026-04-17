import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { PomodoroSession, HabitWithSchedule, AreaSummary, ConsistencyData, StreakData, WheelAxisId } from '../types';
import type { 
  MomentumDataPoint, 
  PeakHourCell, 
  AreaBalanceData, 
  CorrelationPoint, 
  EnergyMoodPoint,
  WeeklyReportData 
} from '../lib/analytics';
import { 
  momentumTimeSeries, 
  peakHoursGrid, 
  areaBalanceByAreas, 
  buildWeeklyReport 
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
      console.log('Analytics: computed momentum:', mom.length, 'data points');

      const peak = peakHoursGrid(sessionsData);
      setPeakHours(peak);

      // Compute area balance with dynamic areas
      const dynamicAreas = uniqueAreas.length > 0 ? uniqueAreas : (areaColorsList.slice(0, 3) as string[]);
      const balance = areaBalanceByAreas(sessionsData, dynamicAreas, 8);
      setAreaBalance(balance);
      console.log('Analytics: computed areaBalance:', balance.length, 'weeks, areas:', dynamicAreas);

      // Load wheel data from localStorage
      try {
        const stored = localStorage.getItem('wheel_data');
        if (stored) {
          const wheelData = JSON.parse(stored);
          const defaultAxes: WheelAxisId[] = ['body', 'mind', 'soul', 'growth', 'money', 'mission', 'romance', 'family', 'friends', 'joy'];
          const loadedAxes = defaultAxes.map(id => ({
            id,
            currentScore: wheelData.axes?.[id]?.currentScore ?? 5,
            targetScore: wheelData.axes?.[id]?.targetScore ?? 8,
          }));
          setWheelAxes(loadedAxes);
          setWheelSnapshots(wheelData.snapshots || []);
          console.log('Analytics: loaded wheel axes:', loadedAxes.length);
        }
      } catch (err) {
        console.warn('Failed to load wheel data:', err);
      }

      // Build weekly report
      const report = buildWeeklyReport(
        sessionsData,
        [],
        habitsData.map(h => ({ ...h, targetDays: JSON.parse(h.target_days || '[]') })),
        [],
        wheelAxes
      );
      setWeeklyReport(report);
      console.log('Analytics: built weekly report');
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
    loading,
    error,
    getColor,
    refresh: loadData,
  };
}