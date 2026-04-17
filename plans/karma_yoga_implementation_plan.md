# Karma Yoga — Implementation Plan v2
> Personal self-analysis dashboard. Pomodoro focus engine + habit tracker + health layer + analytics + wheel of life + countdown targets.
> Build phases in order. Each phase's data model is consumed by the next.

---

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [Data Schema and Storage](#2-data-schema-and-storage)
3. [Phase 1 — Foundation: Zero-error pass and UX polish](#3-phase-1--foundation)
4. [Phase 2 — Main Dashboard](#4-phase-2--main-dashboard)
5. [Phase 3 — Focus Engine](#5-phase-3--focus-engine)
6. [Phase 4 — Habit Tracker](#6-phase-4--habit-tracker)
7. [Phase 5 — Health Layer](#7-phase-5--health-layer)
8. [Phase 6 — Wheel of Life](#8-phase-6--wheel-of-life)
9. [Phase 7 — Analytics Engine](#9-phase-7--analytics-engine)
10. [Phase 8 — Weekly Karma Report (auto-generated)](#10-phase-8--weekly-karma-report)
11. [Phase 9 — Countdown Targets](#11-phase-9--countdown-targets)
12. [Component Reference](#12-component-reference)

---

## 1. Project Structure

```
karma-yoga/
├── src/
│   ├── components/
│   │   ├── focus/
│   │   │   ├── PomodoroTimer.tsx
│   │   │   ├── FocusHeatmap.tsx
│   │   │   ├── SessionLog.tsx
│   │   │   ├── FocusSettings.tsx
│   │   │   └── QualityRating.tsx
│   │   ├── habits/
│   │   │   ├── HabitTracker.tsx         ← main tracker UI
│   │   │   ├── HabitAreaGroup.tsx       ← collapsible area with habits
│   │   │   ├── HabitCheckin.tsx         ← single habit check row
│   │   │   ├── StreakCalendar.tsx
│   │   │   └── ContributionGraph.tsx    ← GitHub-style heatmap
│   │   ├── health/
│   │   │   ├── HealthCheckin.tsx
│   │   │   ├── LongevityScore.tsx
│   │   │   └── HealthTrends.tsx
│   │   ├── analytics/
│   │   │   ├── PeakHoursChart.tsx
│   │   │   ├── AreaBalance.tsx
│   │   │   ├── MomentumScore.tsx
│   │   │   ├── SleepFocusCorrelation.tsx
│   │   │   └── WeeklyReport.tsx
│   │   ├── wheel/
│   │   │   ├── WheelOfLife.tsx
│   │   │   └── WheelAxisEditor.tsx
│   │   ├── targets/
│   │   │   ├── TargetCard.tsx           ← countdown timer card
│   │   │   ├── TargetGrid.tsx           ← 1-big + 2-small layout
│   │   │   └── TargetForm.tsx           ← create/edit form
│   │   ├── dashboard/
│   │   │   ├── StreakWidget.tsx
│   │   │   ├── HabitQuickCheck.tsx      ← habit checkboxes inline on dashboard
│   │   │   ├── FocusAreaRing.tsx        ← area breakdown donut
│   │   │   └── WeeklyHabitGrid.tsx      ← 7-day × habits mini grid
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── TopBar.tsx
│   ├── store/
│   │   ├── focusStore.ts
│   │   ├── habitStore.ts
│   │   ├── healthStore.ts
│   │   ├── targetStore.ts               ← countdown targets
│   │   └── settingsStore.ts
│   ├── lib/
│   │   ├── aggregations.ts              ← heatmap math, daily/weekly/monthly views
│   │   ├── analytics.ts                 ← correlation, momentum, peak hours, weekly report
│   │   ├── longevity.ts                 ← biological age calculator
│   │   ├── habitAnalytics.ts            ← streak math, contribution graph data
│   │   └── storage.ts                   ← localStorage wrapper with versioning
│   ├── types/
│   │   └── index.ts                     ← all shared TypeScript types
│   └── pages/
│       ├── Dashboard.tsx                ← tab 1: main overview
│       ├── Focus.tsx                    ← tab 2: pomodoro + weekly focus
│       ├── Habits.tsx                   ← tab 3: habit tracker
│       ├── Health.tsx                   ← tab 4: health dashboard
│       ├── Wheel.tsx                    ← tab 5: wheel of life
│       ├── Analytics.tsx                ← tab 6: analytics powerhouse
│       └── Settings.tsx
```

---

## 2. Data Schema and Storage

Define all types in `src/types/index.ts` before writing any component.

### 2.1 Core Types

```typescript
// src/types/index.ts

// ─── Life Areas ────────────────────────────────────────────────────────────
// Used for focus sessions AND as habit area categories
export type FocusArea = 'health' | 'learning' | 'social' | 'finance' | 'recovery';

export type HabitAreaId =
  | 'body'
  | 'mind'
  | 'soul'
  | 'growth'
  | 'money'
  | 'mission'
  | 'romance'
  | 'family'
  | 'friends'
  | 'joy';

// The 10 wheel of life axes (matches Wheel page)
export const WHEEL_AXES: { id: WheelAxisId; label: string; color: string; group: string }[] = [
  { id: 'body',    label: 'Body',    color: '#1D9E75', group: 'Health' },
  { id: 'mind',    label: 'Mind',    color: '#3B8BD4', group: 'Health' },
  { id: 'soul',    label: 'Soul',    color: '#7F77DD', group: 'Health' },
  { id: 'growth',  label: 'Growth',  color: '#EF9F27', group: 'Work' },
  { id: 'money',   label: 'Money',   color: '#639922', group: 'Work' },
  { id: 'mission', label: 'Mission', color: '#D85A30', group: 'Work' },
  { id: 'romance', label: 'Romance', color: '#D4537E', group: 'Relationships' },
  { id: 'family',  label: 'Family',  color: '#1D9E75', group: 'Relationships' },
  { id: 'friends', label: 'Friends', color: '#185fa5', group: 'Relationships' },
  { id: 'joy',     label: 'Joy',     color: '#EF9F27', group: 'Bonus' },
];

export type WheelAxisId = 'body' | 'mind' | 'soul' | 'growth' | 'money' | 'mission' | 'romance' | 'family' | 'friends' | 'joy';

export type FocusQuality = 1 | 2 | 3 | 4 | 5;

// ─── Focus ─────────────────────────────────────────────────────────────────
export interface FocusSession {
  id: string;
  startTime: string;               // ISO 8601
  endTime: string;
  durationMinutes: number;
  plannedDurationMinutes: number;
  area: FocusArea;
  intention: string;
  quality: FocusQuality | null;
  completed: boolean;
  tags: string[];
}

// ─── Habits ────────────────────────────────────────────────────────────────
export interface HabitArea {
  id: HabitAreaId;
  name: string;
  color: string;
  icon: string;                    // emoji
  isCustom?: boolean;              // user-created areas
}

export interface Habit {
  id: string;
  name: string;
  areaId: HabitAreaId;
  targetDays: number[];            // 0=Sun…6=Sat
  createdAt: string;               // ISO
  archivedAt: string | null;
  color?: string;                  // override area color
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string;                    // "YYYY-MM-DD"
  completed: boolean;
  notes: string;
}

// ─── Health ────────────────────────────────────────────────────────────────
export interface HealthCheckin {
  id: string;
  date: string;
  hrv: number | null;
  sleepHours: number | null;
  sleepQuality: 1 | 2 | 3 | 4 | 5 | null;
  restingHR: number | null;
  steps: number | null;
  energyLevel: 1 | 2 | 3 | 4 | 5 | null;
  moodScore: 1 | 2 | 3 | 4 | 5 | null;
  notes: string;
}

export interface BiologicalMarker {
  id: string;
  date: string;
  vo2MaxEstimate: number | null;
  gripStrengthKg: number | null;
  waistCm: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  restingHRAvg: number | null;
}

// ─── Wheel of Life ─────────────────────────────────────────────────────────
export interface WheelAxis {
  id: WheelAxisId;
  label: string;
  color: string;
  currentScore: number;            // 0–10
  targetScore: number;             // 0–10
  group: string;
}

export interface WheelSnapshot {
  date: string;                    // "YYYY-MM-DD", taken each Sunday
  scores: Record<WheelAxisId, number>;
}

// ─── Targets (Countdown Timers) ────────────────────────────────────────────
export interface Target {
  id: string;
  title: string;
  description?: string;
  deadline: string;                // ISO 8601 datetime e.g. "2025-12-31T23:59:00"
  createdAt: string;
  isPrimary: boolean;              // true = the big card on left; false = small cards on right
  color: string;                   // hex, user-chosen accent
  completed: boolean;
  completedAt: string | null;
}

// ─── Settings ──────────────────────────────────────────────────────────────
export interface Settings {
  name: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  defaultPomoDuration: 25 | 45 | 90;
  shortBreak: number;
  longBreak: number;
  pomosBeforeLongBreak: number;
  adaptiveTimerEnabled: boolean;
  wheelAxes: WheelAxis[];
}
```

### 2.2 Storage Layer

```typescript
// src/lib/storage.ts

const VERSION = 1;
const prefix = (key: string) => `karma_yoga_v${VERSION}_${key}`;

export function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(prefix(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function storageSet<T>(key: string, value: T): void {
  localStorage.setItem(prefix(key), JSON.stringify(value));
}

export function storageDelete(key: string): void {
  localStorage.removeItem(prefix(key));
}

export function storageAppend<T extends { id: string }>(key: string, item: T): T[] {
  const existing = storageGet<T[]>(key) ?? [];
  const updated = [...existing, item];
  storageSet(key, updated);
  return updated;
}

export function storageUpdate<T extends { id: string }>(
  key: string,
  id: string,
  updater: (item: T) => T
): T[] {
  const existing = storageGet<T[]>(key) ?? [];
  const updated = existing.map((i) => (i.id === id ? updater(i) : i));
  storageSet(key, updated);
  return updated;
}

export function storageRemove<T extends { id: string }>(key: string, id: string): T[] {
  const existing = storageGet<T[]>(key) ?? [];
  const updated = existing.filter((i) => i.id !== id);
  storageSet(key, updated);
  return updated;
}
```

### 2.3 Focus Store

```typescript
// src/store/focusStore.ts
import { create } from 'zustand';
import { FocusSession } from '../types';
import { storageGet, storageAppend } from '../lib/storage';

interface FocusState {
  sessions: FocusSession[];
  activeSession: Partial<FocusSession> | null;
  loadSessions: () => void;
  startSession: (area: FocusSession['area'], intention: string, duration: number) => void;
  completeSession: (quality: FocusSession['quality']) => void;
  abandonSession: () => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  sessions: [],
  activeSession: null,

  loadSessions: () => {
    set({ sessions: storageGet<FocusSession[]>('sessions') ?? [] });
  },

  startSession: (area, intention, duration) => {
    set({
      activeSession: {
        id: crypto.randomUUID(),
        startTime: new Date().toISOString(),
        area, intention,
        plannedDurationMinutes: duration,
        completed: false, quality: null, tags: [],
      },
    });
  },

  completeSession: (quality) => {
    const { activeSession } = get();
    if (!activeSession?.id) return;
    const endTime = new Date().toISOString();
    const durationMinutes = Math.round(
      (new Date(endTime).getTime() - new Date(activeSession.startTime!).getTime()) / 60000
    );
    const session: FocusSession = {
      ...(activeSession as FocusSession),
      endTime, durationMinutes, completed: true, quality,
    };
    set({ sessions: storageAppend('sessions', session), activeSession: null });
  },

  abandonSession: () => {
    const { activeSession } = get();
    if (!activeSession?.id) return;
    const endTime = new Date().toISOString();
    const durationMinutes = Math.round(
      (new Date(endTime).getTime() - new Date(activeSession.startTime!).getTime()) / 60000
    );
    const session: FocusSession = {
      ...(activeSession as FocusSession),
      endTime, durationMinutes, completed: false, quality: null,
    };
    set({ sessions: storageAppend('sessions', session), activeSession: null });
  },
}));
```

### 2.4 Habit Store

```typescript
// src/store/habitStore.ts
import { create } from 'zustand';
import { Habit, HabitEntry, HabitArea, HabitAreaId } from '../types';
import { storageGet, storageSet, storageAppend, storageUpdate, storageRemove } from '../lib/storage';

// Default built-in areas matching the 10 wheel axes
export const DEFAULT_HABIT_AREAS: HabitArea[] = [
  { id: 'body',    name: 'Body',    color: '#1D9E75', icon: '⚡' },
  { id: 'mind',    name: 'Mind',    color: '#3B8BD4', icon: '🧠' },
  { id: 'soul',    name: 'Soul',    color: '#7F77DD', icon: '✦' },
  { id: 'growth',  name: 'Growth',  color: '#EF9F27', icon: '📈' },
  { id: 'money',   name: 'Money',   color: '#639922', icon: '◈' },
  { id: 'mission', name: 'Mission', color: '#D85A30', icon: '◎' },
  { id: 'romance', name: 'Romance', color: '#D4537E', icon: '♡' },
  { id: 'family',  name: 'Family',  color: '#1D9E75', icon: '⌂' },
  { id: 'friends', name: 'Friends', color: '#185fa5', icon: '◷' },
  { id: 'joy',     name: 'Joy',     color: '#EF9F27', icon: '★' },
];

interface HabitState {
  areas: HabitArea[];
  habits: Habit[];
  entries: HabitEntry[];
  loadHabits: () => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'archivedAt'>) => void;
  archiveHabit: (id: string) => void;
  toggleHabit: (habitId: string, date: string) => void;
  getEntriesForDate: (date: string) => HabitEntry[];
  getStreak: (habitId: string) => number;
  addArea: (area: Omit<HabitArea, 'isCustom'>) => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  areas: storageGet<HabitArea[]>('habitAreas') ?? DEFAULT_HABIT_AREAS,
  habits: [],
  entries: [],

  loadHabits: () => {
    set({
      areas: storageGet<HabitArea[]>('habitAreas') ?? DEFAULT_HABIT_AREAS,
      habits: storageGet<Habit[]>('habits') ?? [],
      entries: storageGet<HabitEntry[]>('habitEntries') ?? [],
    });
  },

  addHabit: (habitData) => {
    const habit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    set({ habits: storageAppend('habits', habit) });
  },

  archiveHabit: (id) => {
    const habits = storageUpdate<Habit>('habits', id, (h) => ({
      ...h, archivedAt: new Date().toISOString(),
    }));
    set({ habits });
  },

  toggleHabit: (habitId, date) => {
    const { entries } = get();
    const existing = entries.find((e) => e.habitId === habitId && e.date === date);

    if (existing) {
      // Toggle completed state
      const updated = storageUpdate<HabitEntry>(
        'habitEntries', existing.id,
        (e) => ({ ...e, completed: !e.completed })
      );
      set({ entries: updated });
    } else {
      // Create new entry
      const entry: HabitEntry = {
        id: crypto.randomUUID(),
        habitId, date, completed: true, notes: '',
      };
      set({ entries: storageAppend('habitEntries', entry) });
    }
  },

  getEntriesForDate: (date) => {
    return get().entries.filter((e) => e.date === date);
  },

  getStreak: (habitId) => {
    const { entries } = get();
    const completed = entries
      .filter((e) => e.habitId === habitId && e.completed)
      .map((e) => e.date)
      .sort()
      .reverse();

    if (completed.length === 0) return 0;

    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const dateStr of completed) {
      const d = new Date(dateStr);
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
      if (diff > 1) break;
      streak++;
      cursor = d;
    }
    return streak;
  },

  addArea: (area) => {
    const newArea: HabitArea = { ...area, isCustom: true };
    const areas = [...(storageGet<HabitArea[]>('habitAreas') ?? DEFAULT_HABIT_AREAS), newArea];
    storageSet('habitAreas', areas);
    set({ areas });
  },
}));
```

### 2.5 Target Store (Countdown Timers)

```typescript
// src/store/targetStore.ts
import { create } from 'zustand';
import { Target } from '../types';
import { storageGet, storageAppend, storageUpdate, storageRemove } from '../lib/storage';

interface TargetState {
  targets: Target[];
  loadTargets: () => void;
  addTarget: (target: Omit<Target, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => void;
  updateTarget: (id: string, updates: Partial<Target>) => void;
  deleteTarget: (id: string) => void;
  markComplete: (id: string) => void;
  setPrimary: (id: string) => void;       // only one can be primary at a time
}

export const useTargetStore = create<TargetState>((set, get) => ({
  targets: [],

  loadTargets: () => {
    set({ targets: storageGet<Target[]>('targets') ?? [] });
  },

  addTarget: (targetData) => {
    const target: Target = {
      ...targetData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: null,
    };
    set({ targets: storageAppend('targets', target) });
  },

  updateTarget: (id, updates) => {
    const targets = storageUpdate<Target>('targets', id, (t) => ({ ...t, ...updates }));
    set({ targets });
  },

  deleteTarget: (id) => {
    set({ targets: storageRemove<Target>('targets', id) });
  },

  markComplete: (id) => {
    const targets = storageUpdate<Target>('targets', id, (t) => ({
      ...t, completed: true, completedAt: new Date().toISOString(),
    }));
    set({ targets });
  },

  setPrimary: (id) => {
    // Demote all others, elevate this one
    const { targets } = get();
    const updated = targets.map((t) => ({ ...t, isPrimary: t.id === id }));
    storageSet('targets', updated); // Use storageSet directly
    set({ targets: updated });
  },
}));
```

### 2.6 Settings Store (with Wheel)

```typescript
// src/store/settingsStore.ts
import { create } from 'zustand';
import { Settings, WheelAxis, WheelAxisId, WheelSnapshot } from '../types';
import { storageGet, storageSet, storageAppend } from '../lib/storage';
import { WHEEL_AXES } from '../types';

const DEFAULT_WHEEL_AXES: WheelAxis[] = WHEEL_AXES.map((ax) => ({
  ...ax,
  currentScore: 5,
  targetScore: 8,
}));

const DEFAULT_SETTINGS: Settings = {
  name: '',
  dateOfBirth: '2000-01-01',
  sex: 'male',
  defaultPomoDuration: 25,
  shortBreak: 5,
  longBreak: 20,
  pomosBeforeLongBreak: 4,
  adaptiveTimerEnabled: false,
  wheelAxes: DEFAULT_WHEEL_AXES,
};

interface SettingsState {
  settings: Settings;
  loadSettings: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateWheelAxis: (axisId: WheelAxisId, score: number, type: 'current' | 'target') => void;
  maybeSaveWeeklySnapshot: () => void;
  getWheelSnapshots: () => WheelSnapshot[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: storageGet<Settings>('settings') ?? DEFAULT_SETTINGS,

  loadSettings: () => {
    set({ settings: storageGet<Settings>('settings') ?? DEFAULT_SETTINGS });
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    storageSet('settings', settings);
    set({ settings });
  },

  updateWheelAxis: (axisId, score, type) => {
    const { settings } = get();
    const wheelAxes = settings.wheelAxes.map((ax) =>
      ax.id === axisId
        ? { ...ax, [type === 'current' ? 'currentScore' : 'targetScore']: score }
        : ax
    );
    const updated = { ...settings, wheelAxes };
    storageSet('settings', updated);
    set({ settings: updated });
  },

  maybeSaveWeeklySnapshot: () => {
    const today = new Date();
    if (today.getDay() !== 0) return; // Sundays only
    const todayStr = today.toISOString().slice(0, 10);
    const snapshots = storageGet<WheelSnapshot[]>('wheelSnapshots') ?? [];
    if (snapshots.some((s) => s.date === todayStr)) return;

    const { settings } = get();
    const scores = Object.fromEntries(
      settings.wheelAxes.map((ax) => [ax.id, ax.currentScore])
    ) as Record<WheelAxisId, number>;

    storageAppend('wheelSnapshots', { date: todayStr, scores });
  },

  getWheelSnapshots: () => {
    return storageGet<WheelSnapshot[]>('wheelSnapshots') ?? [];
  },
}));
```

### 2.7 Health Store

```typescript
// src/store/healthStore.ts
import { create } from 'zustand';
import { HealthCheckin, BiologicalMarker } from '../types';
import { storageGet, storageAppend } from '../lib/storage';

interface HealthState {
  checkins: HealthCheckin[];
  markers: BiologicalMarker[];
  loadHealth: () => void;
  addCheckin: (checkin: HealthCheckin) => void;
  addMarker: (marker: BiologicalMarker) => void;
  getTodayCheckin: () => HealthCheckin | null;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  checkins: [],
  markers: [],

  loadHealth: () => {
    set({
      checkins: storageGet<HealthCheckin[]>('healthCheckins') ?? [],
      markers: storageGet<BiologicalMarker[]>('bioMarkers') ?? [],
    });
  },

  addCheckin: (checkin) => {
    set({ checkins: storageAppend('healthCheckins', checkin) });
  },

  addMarker: (marker) => {
    set({ markers: storageAppend('bioMarkers', marker) });
  },

  getTodayCheckin: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().checkins.find((c) => c.date === today) ?? null;
  },
}));
```

---

## 3. Phase 1 — Foundation

### 3.1 Heatmap Aggregations

```typescript
// src/lib/aggregations.ts
import { FocusSession } from '../types';

export interface HeatmapCell {
  date: string;
  totalMinutes: number;
  qualityAvg: number | null;
  sessionCount: number;
}

export function aggregateByDay(sessions: FocusSession[]): Map<string, HeatmapCell> {
  const map = new Map<string, HeatmapCell>();
  for (const s of sessions) {
    const date = s.startTime.slice(0, 10);
    const existing = map.get(date) ?? { date, totalMinutes: 0, qualityAvg: null, sessionCount: 0 };
    existing.totalMinutes += s.durationMinutes;
    existing.sessionCount += 1;
    if (s.quality !== null) {
      const prevTotal = (existing.qualityAvg ?? 0) * (existing.sessionCount - 1);
      existing.qualityAvg = (prevTotal + s.quality) / existing.sessionCount;
    }
    map.set(date, existing);
  }
  return map;
}

export function buildAnnualGrid(sessions: FocusSession[], year: number) {
  const byDay = aggregateByDay(sessions);
  const result: { weekIndex: number; dayIndex: number; cell: HeatmapCell }[] = [];
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const firstSunday = new Date(start);
  firstSunday.setDate(start.getDate() - start.getDay());
  let current = new Date(firstSunday);
  let weekIndex = 0;
  while (current <= end) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dateStr = current.toISOString().slice(0, 10);
      const cell = byDay.get(dateStr) ?? { date: dateStr, totalMinutes: 0, qualityAvg: null, sessionCount: 0 };
      result.push({ weekIndex, dayIndex, cell });
      current.setDate(current.getDate() + 1);
    }
    weekIndex++;
  }
  return result;
}

export function getMonthLabels(year: number): { label: string; weekIndex: number }[] {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months.map((label, m) => {
    const firstOfMonth = new Date(year, m, 1);
    const yearStart = new Date(year, 0, 1);
    const startDay = yearStart.getDay();
    const dayOfYear = Math.floor((firstOfMonth.getTime() - yearStart.getTime()) / 86400000);
    const weekIndex = Math.floor((dayOfYear + startDay) / 7);
    return { label, weekIndex };
  });
}

export function minutesToColor(minutes: number): string {
  if (minutes === 0) return 'var(--heatmap-empty)';
  if (minutes < 30) return 'var(--heatmap-1)';
  if (minutes < 90) return 'var(--heatmap-2)';
  if (minutes < 180) return 'var(--heatmap-3)';
  return 'var(--heatmap-4)';
}

// ─── Habit Contribution Heatmap ─────────────────────────────────────────────
// (based on habit completions rather than focus minutes)
import { HabitEntry } from '../types';

export interface HabitHeatmapCell {
  date: string;
  completed: number;   // how many habits completed that day
  total: number;       // how many habits were scheduled that day
  ratio: number;       // 0–1
}

export function buildHabitAnnualGrid(
  entries: HabitEntry[],
  habits: import('../types').Habit[],
  year: number
): { weekIndex: number; dayIndex: number; cell: HabitHeatmapCell }[] {
  // Group entries by date
  const byDate = new Map<string, HabitEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const result: { weekIndex: number; dayIndex: number; cell: HabitHeatmapCell }[] = [];
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const firstSunday = new Date(start);
  firstSunday.setDate(start.getDate() - start.getDay());
  let current = new Date(firstSunday);
  let weekIndex = 0;

  while (current <= end) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dateStr = current.toISOString().slice(0, 10);
      const dayOfWeek = current.getDay();

      // Which habits were scheduled for this day?
      const scheduledHabits = habits.filter(
        (h) => h.archivedAt === null && h.targetDays.includes(dayOfWeek)
      );
      const dayEntries = byDate.get(dateStr) ?? [];
      const completedCount = dayEntries.filter((e) => e.completed).length;
      const total = scheduledHabits.length;

      result.push({
        weekIndex, dayIndex,
        cell: {
          date: dateStr,
          completed: completedCount,
          total,
          ratio: total > 0 ? completedCount / total : 0,
        },
      });
      current.setDate(current.getDate() + 1);
    }
    weekIndex++;
  }
  return result;
}

// Color scale for habit heatmap — green, like GitHub
export function habitRatioToColor(ratio: number, total: number): string {
  if (total === 0) return 'var(--heatmap-empty)';
  if (ratio === 0) return 'var(--heatmap-empty)';
  if (ratio < 0.25) return 'var(--heatmap-habit-1)';
  if (ratio < 0.5)  return 'var(--heatmap-habit-2)';
  if (ratio < 0.75) return 'var(--heatmap-habit-3)';
  return 'var(--heatmap-habit-4)';
}

// Add to CSS vars:
// --heatmap-habit-1: #c6e48b
// --heatmap-habit-2: #7bc96f
// --heatmap-habit-3: #239a3b
// --heatmap-habit-4: #196127
```

### 3.2 Sidebar Spec

```tsx
// src/components/layout/Sidebar.tsx

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/' },
  { id: 'focus',     label: 'Focus',     icon: '◉', path: '/focus' },
  { id: 'habits',    label: 'Habits',    icon: '✦', path: '/habits' },
  { id: 'health',    label: 'Health',    icon: '♡', path: '/health' },
  { id: 'wheel',     label: 'Wheel',     icon: '◎', path: '/wheel' },
  { id: 'analytics', label: 'Analytics', icon: '∿', path: '/analytics' },
  { id: 'settings',  label: 'Settings',  icon: '⚙', path: '/settings' },
];

// Zone 1 (top): name, today's overall streak, focus minutes today
// Zone 2 (middle, scrollable): nav links with active left-border accent
// Zone 3 (bottom): momentum score, longevity badge, longest streak text
// CSS vars: --sidebar-width: 220px (expanded), 64px (collapsed)
// Toggle button at bottom of zone 2
```

---

## 4. Phase 2 — Main Dashboard (Tab 1)

The dashboard is the first page and the daily command center. It should be scannable in 30 seconds and allow habit checking without navigating away.

### 4.1 Layout

```
┌────────────────────────────────────────────────────────┐
│  Today's header row: date, overall streak, quick stats │
├──────────────────────┬─────────────────────────────────┤
│  TARGETS PANEL       │  HABIT QUICK-CHECK              │
│  (1 big + 2 small)   │  (scrollable, check inline)     │
├──────────────────────┴─────────────────────────────────┤
│  WEEKLY HABIT GRID (7-day × all habits, color cells)   │
├────────────────┬───────────────────────────────────────┤
│  FOCUS AREA    │  WEEKLY KARMA REPORT PREVIEW          │
│  BREAKDOWN     │  (compact version, link to full)      │
│  (donut chart) │                                       │
└────────────────┴───────────────────────────────────────┘
```

### 4.2 HabitQuickCheck Component

Renders all active habits, grouped by area, with a checkbox. Updates `habitStore.toggleHabit()` in real time. Shows today's area completion ratio as a small pill next to area header.

```tsx
// src/components/dashboard/HabitQuickCheck.tsx
// Props: date = today's "YYYY-MM-DD"
// For each area with active habits:
//   - Area header (icon + name + "X/Y" pill in area color)
//   - List of habits for that area with toggleable checkboxes
//   - Checkbox is pre-filled if habitStore has a completed entry for that habitId + date
// Use useHabitStore().toggleHabit(habitId, date) on change
```

### 4.3 WeeklyHabitGrid Component

A 7-column × N-habit-row grid showing last 7 days. Each cell is a small colored square: full color if completed, light if missed, gray if not scheduled.

```tsx
// src/components/dashboard/WeeklyHabitGrid.tsx
// Columns: last 7 dates (Sun–Sat of current week)
// Rows: each active habit, grouped by area with area label
// Cell colors:
//   completed + scheduled → habit area color at full opacity
//   missed + scheduled    → habit area color at 0.15 opacity
//   not scheduled         → transparent / placeholder
// Clicking a past cell opens a note/edit modal
// Today's column has a subtle background highlight
```

### 4.4 FocusAreaRing Component

Donut chart showing today's focus minutes split by area. Center text shows total minutes today. Uses Recharts `PieChart`.

```tsx
// src/components/dashboard/FocusAreaRing.tsx
const AREA_COLORS = {
  health: '#1D9E75', learning: '#3B8BD4', social: '#D4537E',
  finance: '#7F77DD', recovery: '#888780',
};
// Filter sessions where startTime starts with today's date
// Group by area, sum durationMinutes
// Render as Recharts PieChart (innerRadius=50, outerRadius=80)
// If no data yet: show placeholder ring with "Log a session →" prompt
```

---

## 5. Phase 3 — Focus Engine (Tab 2)

### 5.1 Pomodoro Timer

Full-width layout with timer in center, weekly focus intensity heatmap below.

```tsx
// src/components/focus/PomodoroTimer.tsx
// States: idle → intention → running → rating → done
// idle: show start button + adaptive recommendation (if enabled)
// intention: one-line text input "What will you build?" + area selector + duration picker
// running: circular countdown, area color ring, session metadata, abandon button
// rating: QualityRating component with countdown dismiss (30s default = 3)
// done: brief summary card before returning to idle

// Timer display: large MM:SS, with SVG arc showing progress
// Area selector: pill buttons for each FocusArea with color dot
```

### 5.2 Quality Rating

```tsx
// src/components/focus/QualityRating.tsx
const QUALITY_LABELS = {
  1: 'Scattered — many interruptions',
  2: 'Distracted — some focus',
  3: 'Moderate — mostly on task',
  4: 'Deep — clear, sustained focus',
  5: 'Flow — completely absorbed',
};
// 5 star buttons (1–5)
// Description label below stars updates on hover/selection
// Countdown bar: 30s → auto-submit with quality=3
// On select: completeSession(rating)
```

### 5.3 Adaptive Timer Logic

```typescript
// src/lib/analytics.ts

export function getRecommendedDuration(sessions: FocusSession[]): 25 | 45 | 90 {
  const recent = sessions.filter((s) => s.completed && s.quality !== null).slice(-7);
  if (recent.length < 3) return 25;
  const avgQuality = recent.reduce((s, r) => s + (r.quality ?? 0), 0) / recent.length;
  const avgDuration = recent.reduce((s, r) => s + r.durationMinutes, 0) / recent.length;
  if (avgQuality >= 4 && avgDuration >= 40) return 90;
  if (avgQuality >= 3.5 && avgDuration >= 22) return 45;
  return 25;
}
```

### 5.4 Weekly Focus Intensity (Focus Tab)

Show an annual or 12-week heatmap below the timer using `buildAnnualGrid()`. Below that, show today's session log as a timeline (SessionLog.tsx).

---

## 6. Phase 4 — Habit Tracker (Tab 3)

### 6.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Habits" + date picker + "Add habit" button        │
├─────────────────────────────────────────────────────────────┤
│  GitHub Contribution Heatmap (full year, habit ratio color) │
├─────────────────────────────────────────────────────────────┤
│  Area groups (accordion / expandable)                       │
│  ├─ [Body ⚡]  ■■■  3/4 today               [+ Add habit]  │
│  │   Workout ✓  |  Cold shower ✓  |  No sugar ✗           │
│  ├─ [Mind 🧠]  ■■   2/2 today               [+ Add habit]  │
│  │   Meditate ✓  |  Journaling ✓                           │
│  └─ [Soul ✦]   □    0/1 today               [+ Add habit]  │
│      Gratitude ✗                                           │
├─────────────────────────────────────────────────────────────┤
│  Streak leaderboard (sorted by current streak)              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 HabitAreaGroup Component

```tsx
// src/components/habits/HabitAreaGroup.tsx
// Props: area: HabitArea, habits: Habit[], entries: HabitEntry[], date: string
// Expandable accordion (default expanded)
// Header: area icon + name + colored progress bar (X/Y today) + "Add habit" button
// Each habit row (HabitCheckin.tsx):
//   - Checkbox (togglable)
//   - Habit name
//   - Streak badge "🔥 12d"
//   - 7-day mini trail (7 small squares, colored if done)
//   - "..." menu → edit, archive
```

### 6.3 ContributionGraph Component

GitHub-style contribution graph but colored by habit completion ratio.

```tsx
// src/components/habits/ContributionGraph.tsx
// Data: buildHabitAnnualGrid(entries, habits, currentYear)
// Render: SVG grid of squares (11px × 11px, 2px gap)
//   53 weeks × 7 days = 371 cells
//   Color: habitRatioToColor(cell.ratio, cell.total)
// Month labels above
// Legend: "Less ■■■■■ More" at bottom right
// Tooltip on hover: "Apr 16: 3/4 habits (75%)"
// Controls: year selector (prev/next)
```

### 6.4 Habit Analytics (in lib)

```typescript
// src/lib/habitAnalytics.ts
import { Habit, HabitEntry } from '../types';

// Longest-ever streak for a habit
export function longestStreak(habitId: string, entries: HabitEntry[]): number {
  const completed = entries
    .filter((e) => e.habitId === habitId && e.completed)
    .map((e) => e.date)
    .sort();

  if (completed.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < completed.length; i++) {
    const prev = new Date(completed[i - 1]);
    const curr = new Date(completed[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

// Weekly completion rate for a habit (last 4 weeks)
export function weeklyCompletionRates(
  habitId: string,
  habit: Habit,
  entries: HabitEntry[],
  weeks = 4
): { weekStart: string; rate: number }[] {
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (weeks - 1 - i) * 7);
    weekStart.setHours(0, 0, 0, 0);

    let scheduled = 0;
    let completed = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const dayOfWeek = day.getDay();
      if (!habit.targetDays.includes(dayOfWeek)) continue;
      scheduled++;
      const dateStr = day.toISOString().slice(0, 10);
      const entry = entries.find((e) => e.habitId === habitId && e.date === dateStr);
      if (entry?.completed) completed++;
    }

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      rate: scheduled > 0 ? completed / scheduled : 0,
    };
  });
}

// Area-level stats: completion rate and total streak across all habits in area
export function areaStats(
  areaId: string,
  habits: Habit[],
  entries: HabitEntry[],
  date: string
): { totalScheduled: number; totalCompleted: number; rate: number } {
  const areaHabits = habits.filter((h) => h.areaId === areaId && !h.archivedAt);
  const dayOfWeek = new Date(date).getDay();
  const scheduled = areaHabits.filter((h) => h.targetDays.includes(dayOfWeek));
  const completed = scheduled.filter((h) =>
    entries.some((e) => e.habitId === h.id && e.date === date && e.completed)
  );
  return {
    totalScheduled: scheduled.length,
    totalCompleted: completed.length,
    rate: scheduled.length > 0 ? completed.length / scheduled.length : 0,
  };
}
```

---

## 7. Phase 5 — Health Layer (Tab 4)

### 7.1 Health Dashboard Layout

```
┌───────────────────────────────────────────────────────────┐
│  Morning Check-in card (if not done today)                │
├────────────────────────┬──────────────────────────────────┤
│  LONGEVITY SCORE       │  30-DAY TRENDS                   │
│  Bio age: 19.4 yrs     │  HRV / Sleep / Resting HR        │
│  ↓ 2.1 yrs younger     │  sparkline charts                │
│  Score: 78/100         │                                  │
├────────────────────────┴──────────────────────────────────┤
│  SLEEP CALENDAR: 30-day sleep quality heatmap             │
├───────────────────────────────────────────────────────────┤
│  MONTHLY MARKERS: Log BiologicalMarker form               │
└───────────────────────────────────────────────────────────┘
```

### 7.2 Morning Check-in

```tsx
// src/components/health/HealthCheckin.tsx
// If getTodayCheckin() returns null: render as a prominent card
// Fields: sleepHours (number 0–12 step 0.25), sleepQuality (5 stars),
//         hrv (20–120), restingHR (40–120), steps, energyLevel (slider 1–5),
//         moodScore (slider 1–5), notes (textarea)
// On submit → addCheckin(checkin)
// Card dismisses after submission
```

### 7.3 Longevity Score

```typescript
// src/lib/longevity.ts
// Full implementation as per original plan (unchanged — it's solid)
// Scoring: HRV, restingHR, sleepHours, sleepQuality, steps → 0–100
// Bio age delta: (50 - totalScore) × 0.3
```

---

## 8. Phase 6 — Wheel of Life (Tab 5)

### 8.1 The 10 Axes

```
Health Group:
  Body    — physical health, fitness, energy
  Mind    — mental health, focus, emotional regulation
  Soul    — spirituality, meaning, sense of purpose

Work Group:
  Growth  — learning, skills, development
  Money   — finances, income, security
  Mission — alignment with values, sense of purpose at work

Relationships Group:
  Romance — partner / romantic relationship quality
  Family  — parents, siblings, close relatives
  Friends — friends, social support, community

Bonus:
  Joy     — productivity, play, enjoyment of life
```

### 8.2 WheelOfLife SVG Rendering

```tsx
// src/components/wheel/WheelOfLife.tsx
// Props: axes: WheelAxis[], editable?: boolean, size?: number

// Rendering algorithm:
// 1. cx = cy = size/2, maxRadius = size/2 - 40
// 2. Grid rings: 4 concentric polygons at 25%, 50%, 75%, 100% of maxRadius
//    - Stroke: var(--heatmap-empty), no fill on rings (or very subtle 2% opacity)
// 3. Spoke lines: center → axis tips at 100% radius
// 4. For each of 10 axes:
//    angle = (2π × i / 10) - π/2   ← 12 o'clock start
//    targetRadius = (axis.targetScore / 10) × maxRadius
//    currentRadius = (axis.currentScore / 10) × maxRadius
// 5. TARGET polygon:
//    - Points at targetRadius for each axis
//    - fill="none", stroke = axis.color at 40% opacity, strokeDasharray="6 3"
// 6. CURRENT polygon:
//    - Points at currentRadius for each axis
//    - fill = axis.color at 15% opacity, stroke = axis.color, strokeWidth=2
// 7. Score dots: small circle (r=5) at each current score point
// 8. Group labels (Health / Work / Relationships) arced between spoke groups
// 9. Axis labels at (cx + (maxRadius+24)×cos, cy + (maxRadius+24)×sin)
//    text-anchor: "start" if x > cx, "end" if x < cx, "middle" if near top/bottom

// editable prop: renders 10 range sliders (0–10) below the wheel
// each slider updates settingsStore.updateWheelAxis(id, value, 'current')
```

### 8.3 Wheel Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Wheel SVG (center, 400px, interactive)                 │
├───────────────────┬─────────────────────────────────────┤
│  AXIS SCORES      │  SNAPSHOTS                          │
│  10 sliders for   │  Last 12 weekly snapshots           │
│  current scores   │  Sparkline per axis                 │
│  + target inputs  │                                     │
├───────────────────┴─────────────────────────────────────┤
│  Area group legend: Health / Work / Relationships / Joy │
└─────────────────────────────────────────────────────────┘
```

### 8.4 Wheel Analytics Integration

The wheel scores feed into the analytics engine. Track improvement rate per axis over snapshots.

```typescript
// In src/lib/analytics.ts — add:

export function wheelTrendByAxis(
  snapshots: WheelSnapshot[],
  axisId: WheelAxisId
): { date: string; score: number }[] {
  return snapshots
    .map((s) => ({ date: s.date, score: s.scores[axisId] ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Overall wheel "balance score": lower std deviation = more balanced
export function wheelBalanceScore(axes: WheelAxis[]): number {
  const scores = axes.map((a) => a.currentScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  // 0 stdDev = perfectly balanced = score 100; high stdDev = imbalanced = lower score
  return Math.max(0, Math.round(100 - stdDev * 10));
}
```

---

## 9. Phase 7 — Analytics Engine (Tab 6)

The analytics page is a data powerhouse. All computation lives in `lib/analytics.ts`.

### 9.1 Analytics Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Tab bar: Overview | Focus | Habits | Health | Wheel        │
├─────────────────────────────────────────────────────────────┤
│  OVERVIEW TAB:                                              │
│  Momentum sparkline + Longevity score + Wheel balance score │
│  ─────────────────────────────────────────────────────────  │
│  FOCUS TAB:                                                 │
│  Peak hours heatmap (7×24) | Area balance stacked bar       │
│  Sleep × focus scatter chart with regression line           │
│  Session log table (sortable, filterable)                   │
│  ─────────────────────────────────────────────────────────  │
│  HABITS TAB:                                                │
│  Area completion rates (bar chart, last 8 weeks)            │
│  Top streak leaderboard | Most skipped habits               │
│  Per-habit trend (weekly completion rate line chart)        │
│  ─────────────────────────────────────────────────────────  │
│  HEALTH TAB:                                                │
│  HRV trend | Sleep quality distribution                     │
│  Energy × mood correlation scatter                          │
│  Longevity score timeline                                   │
│  ─────────────────────────────────────────────────────────  │
│  WHEEL TAB:                                                 │
│  All 10 axis sparklines (12-week)                           │
│  Balance score over time | Group radar comparison           │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Momentum Score

```typescript
// src/lib/analytics.ts

export function momentumTimeSeries(sessions: FocusSession[]): { date: string; score: number }[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const date = s.startTime.slice(0, 10);
    const weight = (s.quality ?? 3) / 5;
    byDay.set(date, (byDay.get(date) ?? 0) + s.durationMinutes * weight);
  }

  const allDates = Array.from(byDay.keys()).sort();
  if (allDates.length === 0) return [];

  const filled: { date: string; raw: number }[] = [];
  const cur = new Date(allDates[0]);
  const end = new Date();
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    filled.push({ date: d, raw: byDay.get(d) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  const alpha = 2 / 8; // EMA α for 7-day window
  let ema = filled[0].raw;
  const MAX_DAILY = 200;

  return filled.map(({ date, raw }) => {
    ema = alpha * raw + (1 - alpha) * ema;
    return { date, score: Math.min(100, Math.round((ema / MAX_DAILY) * 100)) };
  });
}
```

### 9.3 Habit Analytics for Analytics Page

```typescript
// src/lib/analytics.ts — additions

import { HabitEntry, Habit } from '../types';

export function habitAreaCompletionByWeek(
  habits: Habit[],
  entries: HabitEntry[],
  areaId: string,
  weeks = 8
): { weekStart: string; rate: number }[] {
  const areaHabits = habits.filter((h) => h.areaId === areaId && !h.archivedAt);

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (weeks - 1 - i) * 7);
    weekStart.setHours(0, 0, 0, 0);

    let scheduled = 0;
    let completed = 0;

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const dayOfWeek = day.getDay();
      const dateStr = day.toISOString().slice(0, 10);

      for (const h of areaHabits) {
        if (!h.targetDays.includes(dayOfWeek)) continue;
        scheduled++;
        if (entries.some((e) => e.habitId === h.id && e.date === dateStr && e.completed)) {
          completed++;
        }
      }
    }

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      rate: scheduled > 0 ? completed / scheduled : 0,
    };
  });
}

// Energy × Mood correlation (from health checkins)
export interface EnergyMoodPoint {
  date: string;
  energy: number;
  mood: number;
  sleepHours: number | null;
}

export function energyMoodCorrelation(checkins: HealthCheckin[]): EnergyMoodPoint[] {
  return checkins
    .filter((c) => c.energyLevel !== null && c.moodScore !== null)
    .map((c) => ({
      date: c.date,
      energy: c.energyLevel!,
      mood: c.moodScore!,
      sleepHours: c.sleepHours,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
```

### 9.4 Sleep × Focus Correlation (unchanged, solid)

```typescript
export function sleepFocusCorrelation(
  sessions: FocusSession[],
  checkins: HealthCheckin[]
): CorrelationPoint[] {
  // ... (as in original plan)
}

export function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  // ... (as in original plan)
}
```

### 9.5 Peak Hours Grid

```typescript
export function peakHoursGrid(
  sessions: FocusSession[]
): { day: number; hour: number; avgMinutes: number; avgQuality: number | null }[] {
  // 7×24 grid (day × hour) — same as original plan
}
```

### 9.6 Area Balance

```typescript
export function areaBalanceByWeek(
  sessions: FocusSession[],
  weeks = 8
): { weekStart: string; health: number; learning: number; social: number; finance: number; recovery: number }[] {
  // ... (as in original plan)
}
```

---

## 10. Phase 8 — Weekly Karma Report (auto-generated on Dashboard)

The report is NOT AI-generated. It's a deterministic, data-driven report assembled from all stores. It renders as a full card on the Dashboard and as a full page view when expanded.

### 10.1 Report Data Assembly

```typescript
// src/lib/analytics.ts

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;

  // Focus
  totalFocusMinutes: number;
  focusByArea: Record<string, number>;
  completedSessions: number;
  abandonedSessions: number;
  completionRate: number;
  avgQuality: number | null;
  topFocusArea: string | null;
  neglectedFocusArea: string | null;

  // Habits
  habitCompletionRate: number;           // overall across all areas
  habitAreaRates: Record<string, number>; // per area
  longestCurrentStreak: { habitName: string; days: number } | null;
  mostImprovedArea: string | null;       // area with highest week-over-week improvement
  mostSkippedHabit: string | null;

  // Health
  sleepAvg: number | null;
  hrvAvg: number | null;
  energyAvg: number | null;
  moodAvg: number | null;

  // Wheel
  wheelBalanceScore: number;
  lowestWheelAxis: { label: string; score: number } | null;

  // Derived
  momentumScore: number;                 // this week's average momentum score
  recommendations: string[];             // 3–5 auto-generated action items
}

export function buildWeeklyReport(
  sessions: FocusSession[],
  checkins: HealthCheckin[],
  habits: Habit[],
  entries: HabitEntry[],
  wheelAxes: WheelAxis[]
): WeeklyReport {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  // ── Focus ──────────────────────────────────────────
  const weekSessions = sessions.filter((s) => new Date(s.startTime) >= weekStart);
  const completed = weekSessions.filter((s) => s.completed);
  const abandoned = weekSessions.filter((s) => !s.completed);
  const totalFocusMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const completionRate = weekSessions.length > 0 ? completed.length / weekSessions.length : 0;

  const qualitySessions = completed.filter((s) => s.quality !== null);
  const avgQuality =
    qualitySessions.length > 0
      ? qualitySessions.reduce((sum, s) => sum + (s.quality ?? 0), 0) / qualitySessions.length
      : null;

  const focusByArea: Record<string, number> = {};
  for (const s of weekSessions) {
    focusByArea[s.area] = (focusByArea[s.area] ?? 0) + s.durationMinutes;
  }
  const allFocusAreas = ['health', 'learning', 'social', 'finance', 'recovery'];
  const topFocusArea = Object.entries(focusByArea).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const neglectedFocusArea =
    allFocusAreas.find((a) => !focusByArea[a]) ??
    Object.entries(focusByArea).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;

  // ── Habits ─────────────────────────────────────────
  const activeHabits = habits.filter((h) => !h.archivedAt);
  let totalScheduled = 0;
  let totalCompleted = 0;
  const habitAreaRates: Record<string, number> = {};

  for (let d = 0; d < 7; d++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + d);
    const dayOfWeek = day.getDay();
    const dateStr = day.toISOString().slice(0, 10);

    for (const habit of activeHabits) {
      if (!habit.targetDays.includes(dayOfWeek)) continue;
      totalScheduled++;
      if (entries.some((e) => e.habitId === habit.id && e.date === dateStr && e.completed)) {
        totalCompleted++;
      }
    }
  }

  const habitCompletionRate = totalScheduled > 0 ? totalCompleted / totalScheduled : 0;

  // Per-area habit rate
  const uniqueAreas = [...new Set(activeHabits.map((h) => h.areaId))];
  for (const areaId of uniqueAreas) {
    const areaHabits = activeHabits.filter((h) => h.areaId === areaId);
    let aS = 0, aC = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const dayOfWeek = day.getDay();
      const dateStr = day.toISOString().slice(0, 10);
      for (const h of areaHabits) {
        if (!h.targetDays.includes(dayOfWeek)) continue;
        aS++;
        if (entries.some((e) => e.habitId === h.id && e.date === dateStr && e.completed)) aC++;
      }
    }
    habitAreaRates[areaId] = aS > 0 ? aC / aS : 0;
  }

  // Longest current streak
  let longestCurrentStreak: { habitName: string; days: number } | null = null;
  for (const h of activeHabits) {
    const streak = computeCurrentStreak(h.id, entries);
    if (!longestCurrentStreak || streak > longestCurrentStreak.days) {
      longestCurrentStreak = { habitName: h.name, days: streak };
    }
  }

  // Most skipped (lowest completion rate this week, with > 2 scheduled days)
  const habitWeekRates = activeHabits.map((h) => {
    let s = 0, c = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      if (!h.targetDays.includes(day.getDay())) continue;
      s++;
      const dateStr = day.toISOString().slice(0, 10);
      if (entries.some((e) => e.habitId === h.id && e.date === dateStr && e.completed)) c++;
    }
    return { name: h.name, rate: s > 2 ? c / s : 1 };
  });
  const mostSkippedHabit = habitWeekRates.sort((a, b) => a.rate - b.rate)[0]?.name ?? null;

  // ── Health ─────────────────────────────────────────
  const weekCheckins = checkins.filter((c) => new Date(c.date) >= weekStart);
  const avg = (arr: (number | null)[]) => {
    const v = arr.filter((x): x is number => x !== null);
    return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const sleepAvg = avg(weekCheckins.map((c) => c.sleepHours));
  const hrvAvg = avg(weekCheckins.map((c) => c.hrv));
  const energyAvg = avg(weekCheckins.map((c) => c.energyLevel));
  const moodAvg = avg(weekCheckins.map((c) => c.moodScore));

  // ── Wheel ──────────────────────────────────────────
  const wheelBalanceScore = computeWheelBalance(wheelAxes);
  const lowestWheelAxis = [...wheelAxes].sort((a, b) => a.currentScore - b.currentScore)[0]
    ? { label: wheelAxes.sort((a, b) => a.currentScore - b.currentScore)[0].label,
        score: wheelAxes.sort((a, b) => a.currentScore - b.currentScore)[0].currentScore }
    : null;

  // ── Recommendations ────────────────────────────────
  const recommendations: string[] = [];
  if (completionRate < 0.7)
    recommendations.push(`Session completion was ${Math.round(completionRate * 100)}%. Switch to 25-min blocks to rebuild consistency.`);
  if (neglectedFocusArea)
    recommendations.push(`No focus time in "${neglectedFocusArea}" this week. Schedule one block.`);
  if (sleepAvg !== null && sleepAvg < 7)
    recommendations.push(`Average sleep was ${sleepAvg.toFixed(1)} hrs — below the 7-hr threshold that correlates with your best focus quality sessions.`);
  if (habitCompletionRate < 0.6)
    recommendations.push(`Habit completion was ${Math.round(habitCompletionRate * 100)}%. Consider dropping 1–2 habits until you're at 80%+ consistency.`);
  if (lowestWheelAxis && lowestWheelAxis.score < 4)
    recommendations.push(`"${lowestWheelAxis.label}" is your lowest wheel score (${lowestWheelAxis.score}/10). One intentional action this week can move it.`);
  if (recommendations.length === 0)
    recommendations.push('Excellent week. Raise your lowest wheel axis by 1 point next week.');
  while (recommendations.length < 3)
    recommendations.push('Log HRV and mood daily to unlock deeper cross-metric correlations.');

  // ── Momentum ───────────────────────────────────────
  const momentumSeries = momentumTimeSeries(sessions);
  const weekMomentum = momentumSeries.slice(-7);
  const momentumScore = weekMomentum.length > 0
    ? Math.round(weekMomentum.reduce((s, p) => s + p.score, 0) / weekMomentum.length)
    : 0;

  return {
    weekStart: weekStartStr,
    weekEnd: now.toISOString().slice(0, 10),
    totalFocusMinutes,
    focusByArea,
    completedSessions: completed.length,
    abandonedSessions: abandoned.length,
    completionRate,
    avgQuality,
    topFocusArea,
    neglectedFocusArea,
    habitCompletionRate,
    habitAreaRates,
    longestCurrentStreak,
    mostImprovedArea: null, // compute from prev week comparison if needed
    mostSkippedHabit,
    sleepAvg,
    hrvAvg,
    energyAvg,
    moodAvg,
    wheelBalanceScore,
    lowestWheelAxis,
    momentumScore,
    recommendations,
  };
}

function computeCurrentStreak(habitId: string, entries: HabitEntry[]): number {
  const completed = entries
    .filter((e) => e.habitId === habitId && e.completed)
    .map((e) => e.date)
    .sort()
    .reverse();

  if (completed.length === 0) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const dateStr of completed) {
    const d = new Date(dateStr);
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff > 1) break;
    streak++;
    cursor = d;
  }
  return streak;
}

function computeWheelBalance(axes: WheelAxis[]): number {
  const scores = axes.map((a) => a.currentScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  return Math.max(0, Math.round(100 - Math.sqrt(variance) * 10));
}
```

### 10.2 Report UI Sections

```tsx
// src/components/analytics/WeeklyReport.tsx
// Six sections rendered as a card:
// 1. Header: "Week of [weekStart]" + total hours big type
// 2. Focus split: stacked mini bar + table (area, hours, % of total)
// 3. Habit summary: overall rate as radial gauge + area breakdown table
// 4. Health snapshot: sleep avg + HRV avg + energy avg + mood avg
// 5. Wheel status: balance score + lowest axis callout
// 6. Recommendations: 3–5 cards with amber left border
// 7. Export: copies plain-text summary to clipboard
```

---

## 11. Phase 9 — Countdown Targets (Dashboard Feature)

### 11.1 Target Card Component

```tsx
// src/components/targets/TargetCard.tsx
// Props: target: Target, size: 'large' | 'small'

// Countdown computation (runs on 1s interval):
function getCountdown(deadline: string): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

// Large card design:
//   - Title (large, bold, target.color accent)
//   - DD HH MM SS in large numerals with small labels below each
//   - Description (optional, muted)
//   - Progress bar: (deadline - createdAt) elapsed ratio
//   - "Mark complete" button
//   - Edit / Delete in corner menu

// Small card design:
//   - Title (medium)
//   - Compact DD:HH:MM:SS in one line
//   - Color accent left border (target.color)
//   - "Mark complete" on tap

// Expired cards show "REACHED" badge and createdAt → completedAt span
```

### 11.2 Target Grid Layout

```tsx
// src/components/targets/TargetGrid.tsx
// Filters targets to non-completed only (show last 3 completed in a "Done" section)
// 
// Layout:
//   const primary = targets.find(t => t.isPrimary) ?? targets[0];
//   const secondary = targets.filter(t => !t.isPrimary && !t.completed).slice(0, 2);
//
// Grid CSS:
//   display: grid;
//   grid-template-columns: 1fr 1fr;
//   grid-template-rows: auto auto;
//   gap: 16px;
//
//   .primary-card {
//     grid-column: 1;
//     grid-row: 1 / 3;       ← spans both rows on left
//   }
//   .secondary-card {
//     grid-column: 2;         ← right column, 2 rows
//   }
//
// "Add target" button renders as a dashed card in an empty slot
// "Set as primary" option in each card's menu
```

### 11.3 Target Form

```tsx
// src/components/targets/TargetForm.tsx
// Fields:
//   - Title (text, required)
//   - Deadline (datetime-local input, required)
//   - Description (textarea, optional)
//   - Color (6 preset swatches: blue, teal, amber, coral, purple, pink)
//   - Set as primary (toggle)
//
// On submit: targetStore.addTarget({ title, deadline, description, color, isPrimary })
// On edit: targetStore.updateTarget(id, updates)
```

---

## 12. Component Reference

### Dependencies

```bash
npm install zustand recharts date-fns
```

- **Zustand** — all store state
- **Recharts** — ScatterChart, BarChart, LineChart, PieChart, AreaChart, RadarChart
- **date-fns** — format, startOfWeek, eachDayOfInterval, isThisWeek

### Data Flow — Invariant Rules

```
User action
    ↓
Store action (Zustand) — the ONLY callers of storage functions
    ↓
lib/storage.ts (storageAppend / storageUpdate / storageRemove)
    ↓
localStorage  [versioned key: karma_yoga_v1_*]
    ↓
lib/aggregations.ts or lib/analytics.ts or lib/habitAnalytics.ts
(pure functions, zero side effects, same input → same output)
    ↓
Component renders via useMemo / selector
```

Components NEVER call localStorage directly. All computation lives in lib/ functions.

### CSS Variables — Full Set

```css
:root {
  /* Focus heatmap */
  --heatmap-empty: #e8e8e8;
  --heatmap-1: #b5d4f4;
  --heatmap-2: #3b8bd4;
  --heatmap-3: #185fa5;
  --heatmap-4: #042c53;

  /* Habit contribution heatmap */
  --heatmap-habit-1: #c6e48b;
  --heatmap-habit-2: #7bc96f;
  --heatmap-habit-3: #239a3b;
  --heatmap-habit-4: #196127;

  /* Sidebar */
  --sidebar-width: 220px;
  --sidebar-collapsed: 64px;
}

[data-theme='dark'] {
  --heatmap-empty: #2c2c2a;
  --heatmap-1: #0c447c;
  --heatmap-2: #185fa5;
  --heatmap-3: #378add;
  --heatmap-4: #85b7eb;

  --heatmap-habit-1: #0e4429;
  --heatmap-habit-2: #006d32;
  --heatmap-habit-3: #26a641;
  --heatmap-habit-4: #39d353;
}
```

### Recharts Pattern Reference

```tsx
// PieChart — Focus area breakdown (FocusAreaRing)
<PieChart width={200} height={200}>
  <Pie data={areaData} dataKey="minutes" innerRadius={50} outerRadius={80}>
    {areaData.map((entry) => <Cell key={entry.area} fill={AREA_COLORS[entry.area]} />)}
  </Pie>
  <Tooltip formatter={(v: number) => `${Math.round(v)} min`} />
</PieChart>

// Stacked Bar — Area balance
<BarChart data={weeklyData}>
  <XAxis dataKey="weekStart" tickFormatter={(d) => format(new Date(d), 'MMM d')} />
  <YAxis unit=" min" />
  <Bar dataKey="health"   stackId="a" fill="#1D9E75" />
  <Bar dataKey="learning" stackId="a" fill="#3B8BD4" />
  <Bar dataKey="social"   stackId="a" fill="#D4537E" />
  <Bar dataKey="finance"  stackId="a" fill="#7F77DD" />
  <Bar dataKey="recovery" stackId="a" fill="#888780" />
</BarChart>

// Scatter — Sleep × Focus
<ScatterChart width={400} height={300}>
  <XAxis dataKey="sleepHours" type="number" domain={[4, 10]} unit="h" />
  <YAxis dataKey="avgFocusQuality" type="number" domain={[1, 5]} />
  <Scatter data={correlationPoints} fill="#3b8bd4" />
  <ReferenceLine segment={[
    { x: 5, y: slope * 5 + intercept },
    { x: 9, y: slope * 9 + intercept },
  ]} stroke="#888" strokeDasharray="4 4" />
</ScatterChart>

// Line — Momentum
<LineChart data={momentumSeries}>
  <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} />
  <YAxis domain={[0, 100]} />
  <Line type="monotone" dataKey="score" stroke="#3b8bd4" dot={false} strokeWidth={2} />
  <ReferenceLine y={50} stroke="#ccc" strokeDasharray="4 4" label="baseline" />
</LineChart>

// RadarChart — Wheel group comparison (Health / Work / Relationships)
<RadarChart outerRadius={90} data={groupData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="group" />
  <Radar name="Current" dataKey="avg" stroke="#3B8BD4" fill="#3B8BD4" fillOpacity={0.3} />
  <Radar name="Target"  dataKey="target" stroke="#888" fill="none" strokeDasharray="6 3" />
</RadarChart>
```

### Page Tab Order and File Map

| Tab | Path | Page Component | Key Features |
|-----|------|---------------|--------------|
| 1 | `/` | Dashboard.tsx | Targets grid, habit quick-check, weekly habit grid, focus ring, report preview |
| 2 | `/focus` | Focus.tsx | Pomodoro timer, annual heatmap, session log |
| 3 | `/habits` | Habits.tsx | Contribution graph, area groups, streak leaderboard |
| 4 | `/health` | Health.tsx | Check-in card, longevity score, trends |
| 5 | `/wheel` | Wheel.tsx | Wheel SVG, axis sliders, snapshot sparklines |
| 6 | `/analytics` | Analytics.tsx | Full analytics powerhouse with 5 sub-tabs |
| 7 | `/settings` | Settings.tsx | User profile, timer defaults, wheel targets |

---

*Build in order: Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Data types are defined in Phase 1 (types/index.ts) and must not be altered after that without updating all consuming stores. Each phase adds to lib/analytics.ts — never remove existing exports.*