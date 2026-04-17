import type {
  AreaColor,
  AreaSummary,
  ConsistencyData,
  DeleteResponse,
  FocusAnalytics,
  Habit,
  PomodoroSession,
  StreakData,
  ToggleCheckinResponse,
  WeeklyData,
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
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  // Habits
  getHabits: () => request<Habit[]>('/habits'),
  createHabit: (name: string, area: string) =>
    request<Habit>('/habits', { method: 'POST', body: JSON.stringify({ name, area }) }),
  deleteHabit: (id: string) =>
    request<DeleteResponse>(`/habits/${id}`, { method: 'DELETE' }),
  toggleCheckin: (id: string, date?: string) =>
    request<ToggleCheckinResponse>(`/habits/${id}/checkin`, { method: 'POST', body: JSON.stringify({ date }) }),
  getCheckins: (id: string) => request<string[]>(`/habits/${id}/checkins`),

  // Dashboard
  getStreaks: () => request<StreakData[]>('/dashboard/streaks'),
  getWeekly: () => request<WeeklyData>('/dashboard/weekly'),
  getAreas: () => request<AreaSummary[]>('/dashboard/areas'),
  getConsistency: () => request<ConsistencyData>('/dashboard/consistency'),

  // Pomodoro
  logSession: (focus_min: number, break_min: number, completed: boolean, area?: string) =>
    request<{ success: true }>('/pomodoro', { method: 'POST', body: JSON.stringify({ focus_min, break_min, completed, area }) }),
  getTodaySessions: () => request<PomodoroSession[]>('/pomodoro/today'),
  getFocusAnalytics: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<FocusAnalytics>(`/pomodoro/analytics${query}`);
  },

  // Areas
  getAreaColors: () => request<AreaColor[]>('/areas'),
  updateAreaColor: (name: string, color: string) =>
    request<AreaColor>(`/areas/${name}`, { method: 'PUT', body: JSON.stringify({ color }) }),
  deleteArea: (name: string) =>
    request<DeleteResponse>(`/areas/${name}`, { method: 'DELETE' }),
};
