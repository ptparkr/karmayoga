import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { PomodoroSession, HabitWithSchedule, AreaSummary, ConsistencyData, StreakData } from '../types';
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
  sleepFocusCorrelation,
  linearRegression,
  energyMoodCorrelation,
  buildWeeklyReport 
} from '../lib/analytics';
import { useAreaColors } from './useAreaColors';
import type { WheelAxisId } from '../types';

type WheelAxis = { id: WheelAxisId; currentScore: number; targetScore: number };

export function useAnalytics() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [healthCheckins, setHealthCheckins] = useState<any[]>([]);
  const [habits, setHabits] = useState<HabitWithSchedule[]>([]);
  const [habitAreas, setHabitAreas] = useState<string[]>([]);
  const [areaSummaries, setAreaSummaries] = useState<AreaSummary[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [wheelAxes, setWheelAxes] = useState<WheelAxis[]>([]);
  const [wheelSnapshots, setWheelSnapshots] = useState<{ date: string; scores: Record<WheelAxisId, number> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { areas: areaColorsList } = useAreaColors();

  // Computed analytics
  const [momentum, setMomentum] = useState<MomentumDataPoint[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourCell[][]>([]);
  const [areaBalance, setAreaBalance] = useState<AreaBalanceData[]>([]);
  const [sleepFocusCorr, setSleepFocusCorr] = useState<CorrelationPoint[]>([]);
  const [energyMoodCorr, setEnergyMoodCorr] = useState<EnergyMoodPoint[]>([]);
  const [regression, setRegression] = useState<{ slope: number; intercept: number }>({ slope: 0, intercept: 0 });
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [sessionsData, habitsData, areasData, consistencyData, streaksData] = await Promise.all([
        api.getRecentSessions(30),
        api.getHabits(),
        api.getAreas(),
        api.getConsistency(),
        api.getStreaks(),
      ]);

      setSessions(sessionsData);
      setHabits(habitsData.map((h: any) => ({
        ...h,
        targetDays: JSON.parse(h.target_days || '[]') as number[],
      })));
      
      // Extract unique areas from habits
      const uniqueAreas = [...new Set(habitsData.map((h: any) => h.area))].filter(Boolean);
      setHabitAreas(uniqueAreas.length > 0 ? uniqueAreas : areaColorsList.slice(0, 3));
      
      setAreaSummaries(areasData);
      setConsistency(consistencyData);
      setStreaks(streaksData);
      setHealthCheckins([]);

      // Compute momentum & peak hours
      const mom = momentumTimeSeries(sessionsData);
      setMomentum(mom);

      const peak = peakHoursGrid(sessionsData);
      setPeakHours(peak);

      // Compute area balance with dynamic areas
      const dynamicAreas = uniqueAreas.length > 0 ? uniqueAreas : (areaColorsList.slice(0, 3) as string[]);
      const balance = areaBalanceByAreas(sessionsData, dynamicAreas, 8);
      setAreaBalance(balance);

      // Load wheel data from localStorage (matching useWheel hook pattern)
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
        }
      } catch (err) {
        console.error('Failed to load wheel data:', err);
      }

      // Empty health correlations for now
      setSleepFocusCorr([]);
      setEnergyMoodCorr([]);

      // Build weekly report
      const report = buildWeeklyReport(
        sessionsData,
        [],
        habitsData.map(h => ({ ...h, targetDays: JSON.parse(h.target_days || '[]') })),
        [],
        wheelAxes
      );
      setWeeklyReport(report);
    } catch (err) {
      console.error('Analytics load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [areaColorsList, wheelAxes]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    // Raw data
    sessions,
    healthCheckins,
    habits,
    habitAreas,
    areaSummaries,
    consistency,
    streaks,
    wheelAxes,
    wheelSnapshots,
    // Computed
    momentum,
    peakHours,
    areaBalance,
    sleepFocusCorr,
    energyMoodCorr,
    regression,
    weeklyReport,
    // State
    loading,
    error,
    refresh: loadData,
  };
}