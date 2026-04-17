export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type FocusArea =
  | 'body'
  | 'mind'
  | 'soul'
  | 'growth'
  | 'money'
  | 'mission'
  | 'romance'
  | 'family'
  | 'friends'
  | 'joy'
  | 'health'
  | 'learning'
  | 'social'
  | 'finance'
  | 'recovery'
  | 'other'
  | string;

export interface Habit {
  id: string;
  name: string;
  area: string;
  created_at: string;
}

export interface ToggleCheckinResponse {
  checked: boolean;
  date: string;
}

export interface DeleteResponse {
  deleted?: boolean;
}

export interface AreaColor {
  name: string;
  color: string;
}

export interface StreakData {
  habitId: string;
  name: string;
  area: string;
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
}

export interface WeeklyMatrixDay {
  date: string;
  checked: boolean;
}

export interface WeeklyMatrixRow {
  habitId: string;
  name: string;
  area: string;
  days: WeeklyMatrixDay[];
}

export interface WeeklyData {
  weekDates: string[];
  matrix: WeeklyMatrixRow[];
}

export interface AreaSummary {
  area: string;
  habitCount: number;
  checkins: number;
  possible: number;
  percentage: number;
}

export interface ConsistencyData {
  totalHabits: number;
  totalCheckins: number;
  possible: number;
  percentage: number;
  missed: number;
}

export interface FocusAreaSummary {
  area: string;
  total_min: number;
}

export interface FocusDay {
  date: string;
  minutes: number;
}

export interface FocusAnalytics {
  byArea: FocusAreaSummary[];
  weekDays: FocusDay[];
}

export interface PomodoroSession {
  id?: number;
  focus_min: number;
  break_min: number;
  completed: number | boolean;
  area: string;
  created_at: string;
}

export interface Target {
  id: string;
  title: string;
  deadline: string;
  description?: string;
  color: string;
  isPrimary: boolean;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
}

export interface TargetDraft {
  title: string;
  deadline: string;
  description?: string;
  color: string;
  isPrimary: boolean;
}

export interface WeeklyReportPreview {
  totalFocusMinutes: number;
  topFocusArea: string | null;
  strongestHabit: string | null;
  currentBestStreak: number;
  consistencyPercentage: number;
  weakestArea: string | null;
  recommendations: string[];
}
