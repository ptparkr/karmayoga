import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PomodoroSession, HabitWithSchedule, AreaSummary, ConsistencyData, StreakData, WheelAxisId, HealthCheckin } from '../types';
import type {
  MomentumDataPoint,
  PeakHourCell,
  AreaBalanceData,
  CorrelationPoint,
  WeeklyReportData,
} from '../lib/analytics';
import {
  areaBalanceByAreas,
  buildWeeklyReport,
  linearRegression,
  momentumTimeSeries,
  peakHoursGrid,
  sleepFocusCorrelation,
} from '../lib/analytics';
import { useAreaColors } from './useAreaColors';

type WheelAxis = { id: WheelAxisId; currentScore: number; targetScore: number };
type BatchHabitRecord = { id: string; name: string; area: string; target_days: string; checkins: string[] };

interface FetchResult<T> {
  data: T;
  errors: string[];
}

interface RustAnalyticsResult {
  momentum: MomentumDataPoint[];
  peakHours: PeakHourCell[][];
  areaBalance: AreaBalanceData[];
  sleepFocusData: CorrelationPoint[];
  sleepFocusRegression: { slope: number; intercept: number };
  weeklyReport: WeeklyReportData;
}

function isRustAnalyticsResult(value: unknown): value is RustAnalyticsResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RustAnalyticsResult>;
  return (
    Array.isArray(candidate.momentum) &&
    Array.isArray(candidate.peakHours) &&
    Array.isArray(candidate.areaBalance) &&
    Array.isArray(candidate.sleepFocusData) &&
    typeof candidate.sleepFocusRegression === 'object' &&
    candidate.sleepFocusRegression !== null &&
    typeof candidate.weeklyReport === 'object' &&
    candidate.weeklyReport !== null
  );
}

async function settleValue<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<FetchResult<T>> {
  try {
    return { data: await loader(), errors: [] };
  } catch (err) {
    console.warn(`Failed to fetch ${label}:`, err);
    return { data: fallback, errors: [`${label}: ${err instanceof Error ? err.message : 'unavailable'}`] };
  }
}

function parseTargetDays(targetDays: string | undefined): number[] {
  try {
    const parsed = JSON.parse(targetDays || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalWheelFallback(): { axes: WheelAxis[]; snapshots: { date: string; scores: Record<WheelAxisId, number> }[] } {
  const defaultAxes: WheelAxisId[] = ['body', 'mind', 'soul', 'growth', 'money', 'mission', 'romance', 'family', 'friends', 'joy'];

  try {
    const stored = localStorage.getItem('wheel_data');
    if (!stored) {
      return {
        axes: defaultAxes.map(id => ({ id, currentScore: 5, targetScore: 8 })),
        snapshots: [],
      };
    }

    const parsed = JSON.parse(stored);
    return {
      axes: defaultAxes.map(id => ({
        id,
        currentScore: parsed.axes?.[id]?.currentScore ?? 5,
        targetScore: parsed.axes?.[id]?.targetScore ?? 8,
      })),
      snapshots: parsed.snapshots || [],
    };
  } catch {
    return {
      axes: defaultAxes.map(id => ({ id, currentScore: 5, targetScore: 8 })),
      snapshots: [],
    };
  }
}

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

  const [momentum, setMomentum] = useState<MomentumDataPoint[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourCell[][]>([]);
  const [areaBalance, setAreaBalance] = useState<AreaBalanceData[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [healthCheckins, setHealthCheckins] = useState<HealthCheckin[]>([]);
  const [sleepFocusData, setSleepFocusData] = useState<CorrelationPoint[]>([]);
  const [sleepFocusRegression, setSleepFocusRegression] = useState<{ slope: number; intercept: number }>({ slope: 0, intercept: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [sessionsResult, habitsResult, areasResult, consistencyResult, streaksResult, healthResult, wheelResult] = await Promise.all([
      settleValue('sessions', () => api.getRecentSessions(30), [] as PomodoroSession[]),
      settleValue('habits', () => api.getAllHabitsWithCheckins(), [] as BatchHabitRecord[]),
      settleValue('areas', () => api.getAreas(), [] as AreaSummary[]),
      settleValue('consistency', () => api.getConsistency(), null as ConsistencyData | null),
      settleValue('streaks', () => api.getStreaks(), [] as StreakData[]),
      settleValue('health checkins', () => api.getHealthCheckins(30), [] as HealthCheckin[]),
      settleValue('wheel data', () => api.getWheel(), null as Awaited<ReturnType<typeof api.getWheel>> | null),
    ]);

    const errors = [
      ...sessionsResult.errors,
      ...habitsResult.errors,
      ...areasResult.errors,
      ...consistencyResult.errors,
      ...streaksResult.errors,
      ...healthResult.errors,
      ...wheelResult.errors,
    ];

    const sessionsData = sessionsResult.data;
    const habitsBatch = habitsResult.data;
    const habitsData: HabitWithSchedule[] = habitsBatch.map(habit => ({
      id: habit.id,
      name: habit.name,
      area: habit.area,
      target_days: habit.target_days,
      created_at: '',
      targetDays: parseTargetDays(habit.target_days),
    }));
    const uniqueAreas = [...new Set(habitsBatch.map(habit => habit.area))].filter(Boolean);
    const derivedAreas = uniqueAreas.length > 0 ? uniqueAreas : areaColorsList.slice(0, 3);
    const habitEntries = habitsBatch.flatMap(habit =>
      habit.checkins.map(date => ({ habitId: habit.id, date, completed: true }))
    );

    const wheelFallback = wheelResult.data
      ? {
          axes: wheelResult.data.axes,
          snapshots: wheelResult.data.snapshots,
        }
      : loadLocalWheelFallback();

    const correlationData = sleepFocusCorrelation(sessionsData, healthResult.data);
    const regressionData = correlationData.map(point => ({ x: point.sleepHours, y: point.avgFocusMinutes }));

    setSessions(sessionsData);
    setHabits(habitsData);
    setHabitAreas(derivedAreas);
    setAreaSummaries(areasResult.data);
    setConsistency(consistencyResult.data);
    setStreaks(streaksResult.data);
    setHealthCheckins(healthResult.data);
    setWheelAxes(wheelFallback.axes);
    setWheelSnapshots(wheelFallback.snapshots || []);

    let usedRustCore = false;
    try {
      const rustPayload = {
        sessions: sessionsData,
        checkins: healthResult.data,
        habits: habitsData,
        habitEntries,
        wheelAxes: wheelFallback.axes,
        areas: derivedAreas,
        weeks: 8,
      };
      const rustResult = await api.runRustAnalytics(rustPayload);
      if (isRustAnalyticsResult(rustResult)) {
        setMomentum(rustResult.momentum);
        setPeakHours(rustResult.peakHours);
        setAreaBalance(rustResult.areaBalance);
        setSleepFocusData(rustResult.sleepFocusData);
        setSleepFocusRegression(rustResult.sleepFocusRegression);
        setWeeklyReport(rustResult.weeklyReport);
        usedRustCore = true;
      } else {
        console.warn('Rust analytics returned an unexpected payload shape.');
      }
    } catch (err) {
      console.warn('Rust analytics unavailable, falling back to TypeScript analytics.', err);
    }

    if (!usedRustCore) {
      setMomentum(momentumTimeSeries(sessionsData));
      setPeakHours(peakHoursGrid(sessionsData));
      setAreaBalance(areaBalanceByAreas(sessionsData, derivedAreas, 8));
      setSleepFocusData(correlationData);
      setSleepFocusRegression(linearRegression(regressionData));
      setWeeklyReport(
        buildWeeklyReport(
          sessionsData,
          healthResult.data,
          habitsData,
          habitEntries,
          wheelFallback.axes
        )
      );
    }

    setError(errors.length > 0 ? `Some analytics data could not be loaded (${errors.join(' | ')})` : null);
    setLoading(false);
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
