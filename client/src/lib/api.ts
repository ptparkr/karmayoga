const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  // Habits
  getHabits: () => request<any[]>('/habits'),
  createHabit: (name: string, area: string) =>
    request<any>('/habits', { method: 'POST', body: JSON.stringify({ name, area }) }),
  deleteHabit: (id: string) =>
    request<any>(`/habits/${id}`, { method: 'DELETE' }),
  toggleCheckin: (id: string, date?: string) =>
    request<any>(`/habits/${id}/checkin`, { method: 'POST', body: JSON.stringify({ date }) }),
  getCheckins: (id: string) => request<string[]>(`/habits/${id}/checkins`),

  // Dashboard
  getStreaks: () => request<any[]>('/dashboard/streaks'),
  getWeekly: () => request<any>('/dashboard/weekly'),
  getAreas: () => request<any[]>('/dashboard/areas'),
  getConsistency: () => request<any>('/dashboard/consistency'),

  // Pomodoro
  logSession: (focus_min: number, break_min: number, completed: boolean, area?: string) =>
    request<any>('/pomodoro', { method: 'POST', body: JSON.stringify({ focus_min, break_min, completed, area }) }),
  getTodaySessions: () => request<any[]>('/pomodoro/today'),
  getFocusAnalytics: () => request<any>('/pomodoro/analytics'),

  // Areas
  getAreaColors: () => request<{ name: string; color: string }[]>('/areas'),
  updateAreaColor: (name: string, color: string) =>
    request<any>(`/areas/${name}`, { method: 'PUT', body: JSON.stringify({ color }) }),
  deleteArea: (name: string) =>
    request<any>(`/areas/${name}`, { method: 'DELETE' }),
};
