import type {
  AreaColor,
  AreaSummary,
  ConsistencyData,
  DeleteResponse,
  FocusAnalytics,
  FocusQuality,
  Habit,
  HabitStreak,
  LeaderboardEntry,
  PomodoroSession,
  StreakData,
  ToggleCheckinResponse,
  WeeklyData,
  HealthCheckin,
  LongevityScore,
  HealthTrend,
  BiologicalMarker,
  TodayCheckinStatus,
  WheelData,
  WheelAxis,
  WheelSnapshot,
  WheelAxisId,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `API ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as T) : (undefined as T);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${err}`);
  }
}

export const api = {
  // Habits
  getHabits: () => request<Habit[]>('/habits'),
  createHabit: (name: string, area: string, targetDays?: number[]) =>
    request<Habit>('/habits', { method: 'POST', body: JSON.stringify({ name, area, targetDays }) }),
  deleteHabit: (id: string) =>
    request<DeleteResponse>(`/habits/${id}`, { method: 'DELETE' }),
  toggleCheckin: (id: string, date?: string) =>
    request<ToggleCheckinResponse>(`/habits/${id}/checkin`, { method: 'POST', body: JSON.stringify({ date }) }),
  getCheckins: (id: string) => request<string[]>(`/habits/${id}/checkins`),
  getStreak: (id: string) => request<HabitStreak>(`/habits/${id}/streak`),
  getLeaderboard: () => request<LeaderboardEntry[]>('/habits/leaderboard'),
  updateTargetDays: (id: string, targetDays: number[]) =>
    request<{ success: boolean; targetDays: number[] }>(`/habits/${id}/target-days`, { method: 'PUT', body: JSON.stringify({ targetDays }) }),
  getCheckinsInRange: (id: string, start: string, end: string) =>
    request<string[]>(`/habits/${id}/checkins/range?start=${start}&end=${end}`),
  // Batch fetch ALL habits with checkins (avoids N+1)
  getAllHabitsWithCheckins: () => request<{ id: string; name: string; area: string; target_days: string; checkins: string[] }[]>('/habits/all/checkins'),

  // Dashboard
  getStreaks: () => request<StreakData[]>('/dashboard/streaks'),
  getWeekly: () => request<WeeklyData>('/dashboard/weekly'),
  getAreas: () => request<AreaSummary[]>('/dashboard/areas'),
  getConsistency: () => request<ConsistencyData>('/dashboard/consistency'),

  // Pomodoro
  logSession: (focus_min: number, break_min: number, completed: boolean, area?: string, intention?: string, quality?: FocusQuality) =>
    request<{ success: true }>('/pomodoro', { method: 'POST', body: JSON.stringify({ focus_min, break_min, completed, area, intention, quality }) }),
  getTodaySessions: () => request<PomodoroSession[]>('/pomodoro/today'),
  getRecentSessions: (days = 7) => request<PomodoroSession[]>(`/pomodoro/recent?days=${days}`),
  getFocusAnalytics: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<FocusAnalytics>(`/pomodoro/analytics${query}`);
  },
  runRustAnalytics: (payload: unknown) =>
    request<unknown>('/utils/rust-analytics', { method: 'POST', body: JSON.stringify(payload) }),

  // Areas
  getAreaColors: () => request<AreaColor[]>('/areas'),
  updateAreaColor: (name: string, color: string) =>
    request<AreaColor>(`/areas/${name}`, { method: 'PUT', body: JSON.stringify({ color }) }),
  deleteArea: (name: string) =>
    request<DeleteResponse>(`/areas/${name}`, { method: 'DELETE' }),

  // Health
  getTodayCheckin: () => request<TodayCheckinStatus>('/health/today'),
  getHealthCheckins: (days = 30) => request<HealthCheckin[]>(`/health/checkins?days=${days}`),
  createCheckin: (checkin: Partial<HealthCheckin>) =>
    request<HealthCheckin>('/health/checkin', { method: 'POST', body: JSON.stringify(checkin) }),
  getHealthTrends: (metric: string, days = 30) =>
    request<HealthTrend[]>(`/health/trends/${metric}?days=${days}`),
  getLongevity: (age?: number) => request<LongevityScore>(`/health/longevity${age ? `?age=${age}` : ''}`),
  createMarker: (marker: Partial<BiologicalMarker>) =>
    request<BiologicalMarker>('/health/markers', { method: 'POST', body: JSON.stringify(marker) }),
  getMarkers: () => request<BiologicalMarker[]>('/health/markers'),

  // Wheel
  getWheel: () => request<WheelData>('/wheel'),
  updateWheelAxis: (id: WheelAxisId, score: number, type: 'current' | 'target') =>
    request<WheelAxis>(`/wheel/axis/${id}`, { method: 'PUT', body: JSON.stringify({ score, type }) }),
  createWheelSnapshot: () => request<WheelSnapshot>('/wheel/snapshot', { method: 'POST' }),
  getWheelSnapshots: (weeks = 12) => request<WheelSnapshot[]>(`/wheel/snapshots?weeks=${weeks}`),
};
