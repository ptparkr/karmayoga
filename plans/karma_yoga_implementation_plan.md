# Karma Yoga — Implementation Plan
> Personal self-analysis dashboard. Pomodoro focus engine + habit tracker + health layer + analytics.  
> Use this document linearly — each phase builds on the previous one.

---

## Table of Contents
1. [Project structure](#1-project-structure)
2. [Data schema and storage](#2-data-schema-and-storage)
3. [Phase 1 — Zero-error pass and UX polish](#3-phase-1--zero-error-pass-and-ux-polish)
4. [Phase 2 — Focus engine upgrades](#4-phase-2--focus-engine-upgrades)
5. [Phase 3 — Health layer and life expectancy](#5-phase-3--health-layer-and-life-expectancy)
6. [Phase 4 — Analytics engine](#6-phase-4--analytics-engine)
7. [Phase 5 — Wheel of life](#7-phase-5--wheel-of-life)
8. [Phase 6 — Weekly Karma Report](#8-phase-6--weekly-karma-report)
9. [Phase 7 — AI insight layer](#9-phase-7--ai-insight-layer)
10. [Component reference](#10-component-reference)

---

## 1. Project Structure

Organize the codebase as follows before doing anything else. Every new file created in this plan should land in the correct folder.

```
karma-yoga/
├── src/
│   ├── components/
│   │   ├── focus/
│   │   │   ├── PomodoroTimer.tsx
│   │   │   ├── FocusHeatmap.tsx
│   │   │   ├── SessionLog.tsx
│   │   │   └── FocusSettings.tsx
│   │   ├── habits/
│   │   │   ├── HabitTracker.tsx
│   │   │   ├── StreakCalendar.tsx
│   │   │   └── ContributionGraph.tsx
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
│   │   │   └── WheelOfLife.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── TopBar.tsx
│   ├── store/
│   │   ├── focusStore.ts
│   │   ├── habitStore.ts
│   │   ├── healthStore.ts
│   │   └── settingsStore.ts
│   ├── lib/
│   │   ├── aggregations.ts      ← all heatmap math lives here
│   │   ├── analytics.ts         ← correlation, momentum, peak hours
│   │   ├── longevity.ts         ← biological age calculator
│   │   └── storage.ts           ← localStorage wrapper with versioning
│   ├── types/
│   │   └── index.ts             ← all shared TypeScript types
│   └── pages/
│       ├── Dashboard.tsx
│       ├── Focus.tsx
│       ├── Health.tsx
│       ├── Analytics.tsx
│       └── Settings.tsx
```

---

## 2. Data Schema and Storage

Define all types in `src/types/index.ts` before writing any component. Every store reads and writes these exact shapes.

### 2.1 Core types

```typescript
// src/types/index.ts

export type LifeArea = 'health' | 'learning' | 'social' | 'finance' | 'recovery';

export type FocusQuality = 1 | 2 | 3 | 4 | 5;

// One completed Pomodoro session
export interface FocusSession {
  id: string;                    // crypto.randomUUID()
  startTime: string;             // ISO 8601 e.g. "2025-04-16T09:00:00"
  endTime: string;               // ISO 8601
  durationMinutes: number;       // actual elapsed, not planned
  plannedDurationMinutes: number; // 25 | 45 | 90
  area: LifeArea;
  intention: string;             // set before session starts
  quality: FocusQuality | null;  // set after session ends — null if skipped
  completed: boolean;            // false if abandoned early
  tags: string[];                // user-defined e.g. ["coding", "deepwork"]
}

// Daily habit entry
export interface HabitEntry {
  id: string;
  habitId: string;               // FK to Habit
  date: string;                  // "YYYY-MM-DD"
  completed: boolean;
  notes: string;
}

export interface Habit {
  id: string;
  name: string;
  area: LifeArea;
  targetDays: number[];          // 0=Sun … 6=Sat, e.g. [1,2,3,4,5] = weekdays
  createdAt: string;
  archivedAt: string | null;
}

// Morning health check-in
export interface HealthCheckin {
  id: string;
  date: string;                  // "YYYY-MM-DD"
  hrv: number | null;            // milliseconds, from wearable or manual
  sleepHours: number | null;     // e.g. 7.5
  sleepQuality: 1 | 2 | 3 | 4 | 5 | null;
  restingHR: number | null;      // bpm
  steps: number | null;
  energyLevel: 1 | 2 | 3 | 4 | 5 | null;
  moodScore: 1 | 2 | 3 | 4 | 5 | null;
  notes: string;
}

// Monthly biological marker snapshot
export interface BiologicalMarker {
  id: string;
  date: string;                  // "YYYY-MM-DD" — first of the month
  vo2MaxEstimate: number | null; // mL/kg/min
  gripStrengthKg: number | null;
  waistCm: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  restingHRAvg: number | null;   // 30-day average
}

// User settings
export interface Settings {
  name: string;
  dateOfBirth: string;           // "YYYY-MM-DD" — used for bio age delta
  sex: 'male' | 'female' | 'other';
  defaultPomoDuration: 25 | 45 | 90;
  shortBreak: number;            // minutes
  longBreak: number;             // minutes
  pomosBeforeLongBreak: number;  // default 4
  adaptiveTimerEnabled: boolean;
  wheelAxes: WheelAxis[];
}

export interface WheelAxis {
  id: string;
  label: string;
  color: string;                 // hex
  currentScore: number;          // 0–10
  targetScore: number;           // 0–10
}
```

### 2.2 Storage layer

Write this in `src/lib/storage.ts`. All stores call these functions — never call `localStorage` directly elsewhere.

```typescript
// src/lib/storage.ts

const VERSION = 1;

export function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`karma_yoga_v${VERSION}_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function storageSet<T>(key: string, value: T): void {
  localStorage.setItem(`karma_yoga_v${VERSION}_${key}`, JSON.stringify(value));
}

export function storageDelete(key: string): void {
  localStorage.removeItem(`karma_yoga_v${VERSION}_${key}`);
}

// Append an item to an array-backed store
export function storageAppend<T extends { id: string }>(
  key: string,
  item: T
): T[] {
  const existing = storageGet<T[]>(key) ?? [];
  const updated = [...existing, item];
  storageSet(key, updated);
  return updated;
}

// Replace one item in an array by id
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
```

### 2.3 Focus store

```typescript
// src/store/focusStore.ts
// Use Zustand: npm install zustand

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
    const sessions = storageGet<FocusSession[]>('sessions') ?? [];
    set({ sessions });
  },

  startSession: (area, intention, duration) => {
    const activeSession: Partial<FocusSession> = {
      id: crypto.randomUUID(),
      startTime: new Date().toISOString(),
      area,
      intention,
      plannedDurationMinutes: duration,
      completed: false,
      quality: null,
      tags: [],
    };
    set({ activeSession });
  },

  completeSession: (quality) => {
    const { activeSession } = get();
    if (!activeSession?.id) return;
    const endTime = new Date().toISOString();
    const start = new Date(activeSession.startTime!);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    const session: FocusSession = {
      ...(activeSession as FocusSession),
      endTime,
      durationMinutes,
      completed: true,
      quality,
    };
    const sessions = storageAppend<FocusSession>('sessions', session);
    set({ sessions, activeSession: null });
  },

  abandonSession: () => {
    const { activeSession } = get();
    if (!activeSession?.id) return;
    const endTime = new Date().toISOString();
    const start = new Date(activeSession.startTime!);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    const session: FocusSession = {
      ...(activeSession as FocusSession),
      endTime,
      durationMinutes,
      completed: false,
      quality: null,
    };
    const sessions = storageAppend<FocusSession>('sessions', session);
    set({ sessions, activeSession: null });
  },
}));
```

---

## 3. Phase 1 — Zero-Error Pass and UX Polish

Complete this phase before adding any new features. Goal: every existing UI element works correctly.

### 3.1 Fix heatmap label alignment

The root cause of misaligned labels in a calendar heatmap is an off-by-one in how weeks are computed. Use this canonical logic in `src/lib/aggregations.ts`.

```typescript
// src/lib/aggregations.ts

import { FocusSession } from '../types';

export interface HeatmapCell {
  date: string;          // "YYYY-MM-DD"
  totalMinutes: number;
  qualityAvg: number | null;
  sessionCount: number;
}

// Returns minutes per day for a range
// Input: flat array of all sessions
// Output: map keyed by "YYYY-MM-DD"
export function aggregateByDay(sessions: FocusSession[]): Map<string, HeatmapCell> {
  const map = new Map<string, HeatmapCell>();

  for (const s of sessions) {
    const date = s.startTime.slice(0, 10); // "YYYY-MM-DD"
    const existing = map.get(date) ?? { date, totalMinutes: 0, qualityAvg: null, sessionCount: 0 };
    existing.totalMinutes += s.durationMinutes;
    existing.sessionCount += 1;
    // Recompute quality average
    if (s.quality !== null) {
      const prevTotal = (existing.qualityAvg ?? 0) * (existing.sessionCount - 1);
      existing.qualityAvg = (prevTotal + s.quality) / existing.sessionCount;
    }
    map.set(date, existing);
  }

  return map;
}

// Produces a grid of weeks x days for the annual contribution view
// Returns columns (weeks) each containing 7 cells (Sun=0 … Sat=6)
export function buildAnnualGrid(
  sessions: FocusSession[],
  year: number
): { weekIndex: number; dayIndex: number; cell: HeatmapCell }[] {
  const byDay = aggregateByDay(sessions);
  const result: { weekIndex: number; dayIndex: number; cell: HeatmapCell }[] = [];

  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  // Pad start to Sunday
  const firstSunday = new Date(start);
  firstSunday.setDate(start.getDate() - start.getDay());

  let current = new Date(firstSunday);
  let weekIndex = 0;

  while (current <= end) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dateStr = current.toISOString().slice(0, 10);
      const cell = byDay.get(dateStr) ?? {
        date: dateStr,
        totalMinutes: 0,
        qualityAvg: null,
        sessionCount: 0,
      };
      result.push({ weekIndex, dayIndex, cell });
      current.setDate(current.getDate() + 1);
    }
    weekIndex++;
  }

  return result;
}

// Month label positions for the annual grid
// Returns { label: "Jan", weekIndex } for each month
export function getMonthLabels(year: number): { label: string; weekIndex: number }[] {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months.map((label, m) => {
    const firstOfMonth = new Date(year, m, 1);
    const yearStart = new Date(year, 0, 1);
    const startDay = yearStart.getDay(); // 0=Sun
    const dayOfYear = Math.floor((firstOfMonth.getTime() - yearStart.getTime()) / 86400000);
    const weekIndex = Math.floor((dayOfYear + startDay) / 7);
    return { label, weekIndex };
  });
}

// Color band by minutes — 5-stop scale
export function minutesToColor(minutes: number): string {
  if (minutes === 0) return 'var(--heatmap-empty)';
  if (minutes < 30) return 'var(--heatmap-1)';
  if (minutes < 90) return 'var(--heatmap-2)';
  if (minutes < 180) return 'var(--heatmap-3)';
  return 'var(--heatmap-4)';
}
```

Add these CSS variables to your root stylesheet:

```css
:root {
  --heatmap-empty: #e8e8e8;
  --heatmap-1: #b5d4f4;
  --heatmap-2: #3b8bd4;
  --heatmap-3: #185fa5;
  --heatmap-4: #042c53;
}

[data-theme='dark'] {
  --heatmap-empty: #2c2c2a;
  --heatmap-1: #0c447c;
  --heatmap-2: #185fa5;
  --heatmap-3: #378add;
  --heatmap-4: #85b7eb;
}
```

### 3.2 Fix daily, weekly, monthly view aggregation

Each view has its own time granularity. Here is the logic for all three.

```typescript
// Add to src/lib/aggregations.ts

// Daily view — returns 24 hour-blocks for a given date
export function aggregateDailyByHour(
  sessions: FocusSession[],
  date: string // "YYYY-MM-DD"
): { hour: number; minutes: number; quality: number | null }[] {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    minutes: 0,
    quality: null as number | null,
  }));

  const daySessions = sessions.filter((s) => s.startTime.slice(0, 10) === date);

  for (const s of daySessions) {
    const hour = new Date(s.startTime).getHours();
    hours[hour].minutes += s.durationMinutes;
    if (s.quality !== null) {
      hours[hour].quality = s.quality;
    }
  }

  return hours;
}

// Weekly view — returns 7 day-blocks for the week containing a given date
export function aggregateWeeklyByDay(
  sessions: FocusSession[],
  weekStart: string // "YYYY-MM-DD" of a Monday or Sunday
): { date: string; label: string; minutes: number; quality: number | null }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const daySessions = sessions.filter((s) => s.startTime.slice(0, 10) === date);
    const minutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const qualitySessions = daySessions.filter((s) => s.quality !== null);
    const quality =
      qualitySessions.length > 0
        ? qualitySessions.reduce((sum, s) => sum + (s.quality ?? 0), 0) / qualitySessions.length
        : null;
    return { date, label: days[d.getDay()], minutes, quality };
  });
}

// Monthly view — returns one cell per day in the month
export function aggregateMonthlyByDay(
  sessions: FocusSession[],
  year: number,
  month: number // 1-indexed
): HeatmapCell[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDay = aggregateByDay(sessions);

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    const date = `${year}-${m}-${day}`;
    return (
      byDay.get(date) ?? {
        date,
        totalMinutes: 0,
        qualityAvg: null,
        sessionCount: 0,
      }
    );
  });
}
```

### 3.3 Sidebar redesign spec

The sidebar should have three zones. Implement as a single `Sidebar.tsx` component.

**Zone 1 — Identity header (top)**
- User name in 15px/500 weight
- Streak count in large numerals (28px) with a flame icon
- Today's focus minutes as a sub-line in muted color

**Zone 2 — Navigation (middle, scrollable)**
- Icon + label nav links: Dashboard, Focus, Health, Analytics, Wheel, Settings
- Active state: left border accent (2px) + background tint
- Area pills showing today's split (health / learning / social) as a mini bar

**Zone 3 — Quick status (bottom)**
- Today's momentum score (see Section 6.3)
- Longevity score badge
- One-line motivational metric e.g. "14-day deep work streak"

```tsx
// src/components/layout/Sidebar.tsx — structure skeleton

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'focus',     label: 'Focus',     icon: '◉' },
  { id: 'health',    label: 'Health',    icon: '♡' },
  { id: 'analytics', label: 'Analytics', icon: '∿' },
  { id: 'wheel',     label: 'Wheel of life', icon: '◎' },
  { id: 'settings',  label: 'Settings',  icon: '⚙' },
];

// CSS custom properties for sidebar width:
// --sidebar-width: 220px (expanded), 64px (icon-only mode)
// Transition: width 200ms ease
// Toggle with a collapse button at the bottom of Zone 2
```

---

## 4. Phase 2 — Focus Engine Upgrades

### 4.1 Intention tag — pre-session prompt

Before starting the timer, show a one-field modal: "What will you build in this block?"
Store as `intention: string` on the `FocusSession`.
Display read-only in the session log alongside the session.
Make it optional — pressing Enter with an empty field skips it.

### 4.2 Quality rating — post-session

After the timer completes (or on manual stop), show a 5-star rating screen before dismissing.

```tsx
// src/components/focus/QualityRating.tsx

// Render 5 star buttons labeled 1–5
// On select, call: completeSession(rating)
// Show these descriptions below the stars:
// 1 = "Scattered — many interruptions"
// 2 = "Distracted — some focus"
// 3 = "Moderate — mostly on task"
// 4 = "Deep — clear, sustained focus"
// 5 = "Flow — completely absorbed"

// Auto-dismiss after 30 seconds with quality = 3 as default if no input
// Show a countdown bar so the user knows it will auto-dismiss
```

### 4.3 Adaptive Pomodoro logic

After the user has 10 or more sessions logged, activate adaptive mode.

```typescript
// src/lib/analytics.ts

// Computes recommended next session duration based on last 7 sessions
export function getRecommendedDuration(sessions: FocusSession[]): 25 | 45 | 90 {
  const recent = sessions
    .filter((s) => s.completed && s.quality !== null)
    .slice(-7);

  if (recent.length < 3) return 25; // not enough data

  const avgQuality = recent.reduce((s, r) => s + (r.quality ?? 0), 0) / recent.length;
  const avgDuration = recent.reduce((s, r) => s + r.durationMinutes, 0) / recent.length;

  // High quality + longer sessions = user can handle more
  if (avgQuality >= 4 && avgDuration >= 40) return 90;
  if (avgQuality >= 3.5 && avgDuration >= 22) return 45;
  return 25;
}
```

Show the recommendation in the timer start screen with a note: "Based on your last 7 sessions". The user can override it.

### 4.4 Session replay log

Add a daily debrief view below the timer showing today's sessions as a timeline.

Each row shows:
- Area color dot
- Time range e.g. "09:15 – 09:40"
- Intention text (truncated to 60 chars)
- Duration badge
- Quality stars (read-only, dimmed if null)
- Completed / abandoned indicator

Sort by `startTime` descending (most recent first).

---

## 5. Phase 3 — Health Layer and Life Expectancy

### 5.1 Morning check-in component

Render as a card on the dashboard if today's check-in is missing. Dismiss once submitted.

Fields and input types:
- **Sleep hours**: number input, step 0.25, range 0–12
- **Sleep quality**: 5-star buttons (reuse QualityRating component)
- **Morning HRV**: number input, range 20–120 ms (leave blank if no wearable)
- **Resting HR**: number input, range 40–120 bpm
- **Energy level**: slider 1–5
- **Mood score**: slider 1–5
- **Notes**: textarea, optional

On submit, call `addCheckin(checkin)` from the health store.

### 5.2 Health store

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
    const checkins = storageGet<HealthCheckin[]>('healthCheckins') ?? [];
    const markers = storageGet<BiologicalMarker[]>('bioMarkers') ?? [];
    set({ checkins, markers });
  },

  addCheckin: (checkin) => {
    const checkins = storageAppend<HealthCheckin>('healthCheckins', checkin);
    set({ checkins });
  },

  addMarker: (marker) => {
    const markers = storageAppend<BiologicalMarker>('bioMarkers', marker);
    set({ markers });
  },

  getTodayCheckin: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().checkins.find((c) => c.date === today) ?? null;
  },
}));
```

### 5.3 Longevity score calculator

Implement in `src/lib/longevity.ts`. The score is 0–100 and updates whenever new health data is logged.

```typescript
// src/lib/longevity.ts

import { HealthCheckin, Settings } from '../types';

export interface LongevityResult {
  score: number;               // 0–100
  biologicalAge: number;       // years
  chronologicalAge: number;    // years
  ageDelta: number;            // biologicalAge - chronologicalAge (negative = younger)
  riskFactors: string[];       // top 3 areas of concern
  strengths: string[];         // top 2 strong areas
}

// Reference ranges (evidence-based)
const REF = {
  hrv:         { excellent: 70,    good: 50,  poor: 30  }, // ms
  restingHR:   { excellent: 55,    good: 65,  poor: 75  }, // bpm (lower = better)
  sleepHours:  { excellent: 7.5,   good: 7,   poor: 6   },
  sleepQuality:{ excellent: 4.5,   good: 3.5, poor: 2.5 },
  steps:       { excellent: 10000, good: 7000,poor: 5000},
};

export function computeLongevityScore(
  checkins: HealthCheckin[],
  settings: Settings
): LongevityResult {
  const dob = new Date(settings.dateOfBirth);
  const now = new Date();
  const chronologicalAge = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);

  // Use last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = checkins.filter((c) => new Date(c.date) >= cutoff);

  if (recent.length === 0) {
    return {
      score: 50,
      biologicalAge: Math.round(chronologicalAge * 10) / 10,
      chronologicalAge: Math.round(chronologicalAge * 10) / 10,
      ageDelta: 0,
      riskFactors: ['Not enough data — log morning check-ins daily'],
      strengths: [],
    };
  }

  const avg = (arr: (number | null)[]): number | null => {
    const valid = arr.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const avgHRV    = avg(recent.map((c) => c.hrv));
  const avgRHR    = avg(recent.map((c) => c.restingHR));
  const avgSleep  = avg(recent.map((c) => c.sleepHours));
  const avgSleepQ = avg(recent.map((c) => c.sleepQuality));
  const avgSteps  = avg(recent.map((c) => c.steps));

  // Score each dimension 0–20 (5 dimensions × 20 = 100 total)
  const scoreHRV = avgHRV === null ? 10 : clamp(
    ((avgHRV - REF.hrv.poor) / (REF.hrv.excellent - REF.hrv.poor)) * 20, 0, 20
  );
  const scoreRHR = avgRHR === null ? 10 : clamp(
    ((REF.restingHR.poor - avgRHR) / (REF.restingHR.poor - REF.restingHR.excellent)) * 20, 0, 20
  );
  const scoreSleep = avgSleep === null ? 10 : clamp(
    ((avgSleep - REF.sleepHours.poor) / (REF.sleepHours.excellent - REF.sleepHours.poor)) * 20, 0, 20
  );
  const scoreSleepQ = avgSleepQ === null ? 10 : clamp(
    ((avgSleepQ - REF.sleepQuality.poor) / (REF.sleepQuality.excellent - REF.sleepQuality.poor)) * 20, 0, 20
  );
  const scoreSteps = avgSteps === null ? 10 : clamp(
    ((avgSteps - REF.steps.poor) / (REF.steps.excellent - REF.steps.poor)) * 20, 0, 20
  );

  const totalScore = Math.round(scoreHRV + scoreRHR + scoreSleep + scoreSleepQ + scoreSteps);

  // Bio age estimation: each score point below 50 adds ~0.3 years
  const ageDelta = (50 - totalScore) * 0.3;
  const biologicalAge = Math.round((chronologicalAge + ageDelta) * 10) / 10;

  const dimensions = [
    { name: 'HRV / recovery',    score: scoreHRV    },
    { name: 'Resting heart rate',score: scoreRHR    },
    { name: 'Sleep duration',    score: scoreSleep  },
    { name: 'Sleep quality',     score: scoreSleepQ },
    { name: 'Daily movement',    score: scoreSteps  },
  ];

  const sorted = [...dimensions].sort((a, b) => a.score - b.score);

  return {
    score: totalScore,
    biologicalAge,
    chronologicalAge: Math.round(chronologicalAge * 10) / 10,
    ageDelta: Math.round(ageDelta * 10) / 10,
    riskFactors: sorted.slice(0, 3).map((d) => d.name),
    strengths:   sorted.slice(-2).map((d) => d.name),
  };
}
```

### 5.4 Longevity score card UI

Display as a card in the Health page and a compact version in the sidebar.

- Large number: biological age (e.g. "24.3") — green if below chronological age, red if above
- Sub-line: "You are X years younger / older than your chronological age"
- Progress bar: longevity score 0–100
- Risk factors list (3 items, amber warning style)
- Strengths list (2 items, green style)
- "Log monthly markers" CTA button — opens a `BiologicalMarker` entry form

---

## 6. Phase 4 — Analytics Engine

All analytics functions live in `src/lib/analytics.ts`. Components import these — no raw data processing inside components.

### 6.1 Sleep × focus quality correlation

```typescript
// src/lib/analytics.ts

import { FocusSession, HealthCheckin } from '../types';

export interface CorrelationPoint {
  date: string;
  sleepHours: number;
  avgFocusQuality: number;
}

// Returns one point per day where both sleep and focus data exist
export function sleepFocusCorrelation(
  sessions: FocusSession[],
  checkins: HealthCheckin[]
): CorrelationPoint[] {
  const focusByDay = new Map<string, number[]>();

  for (const s of sessions) {
    if (s.quality === null) continue;
    const date = s.startTime.slice(0, 10);
    const existing = focusByDay.get(date) ?? [];
    existing.push(s.quality);
    focusByDay.set(date, existing);
  }

  return checkins
    .filter((c) => c.sleepHours !== null)
    .flatMap((c) => {
      const qualities = focusByDay.get(c.date);
      if (!qualities || qualities.length === 0) return [];
      const avg = qualities.reduce((a, b) => a + b, 0) / qualities.length;
      return [{ date: c.date, sleepHours: c.sleepHours!, avgFocusQuality: avg }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Linear regression for the scatter chart trend line
export function linearRegression(
  points: { x: number; y: number }[]
): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
```

Render as a Recharts `ScatterChart`. X axis = sleep hours (4–10), Y axis = focus quality (1–5). Overlay a `ReferenceLine` computed from the regression output.

### 6.2 Peak focus hours heatmap

```typescript
// Returns a 7×24 grid (day × hour) with avg minutes and avg quality
export function peakHoursGrid(
  sessions: FocusSession[]
): { day: number; hour: number; avgMinutes: number; avgQuality: number | null }[] {
  // day: 0=Sun … 6=Sat
  const grid = new Map<string, { minutes: number[]; qualities: number[] }>();

  for (const s of sessions) {
    const d = new Date(s.startTime);
    const key = `${d.getDay()}-${d.getHours()}`;
    const cell = grid.get(key) ?? { minutes: [], qualities: [] };
    cell.minutes.push(s.durationMinutes);
    if (s.quality !== null) cell.qualities.push(s.quality);
    grid.set(key, cell);
  }

  const result = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const data = grid.get(`${day}-${hour}`);
      if (!data) {
        result.push({ day, hour, avgMinutes: 0, avgQuality: null });
      } else {
        const avgMinutes = data.minutes.reduce((a, b) => a + b, 0) / data.minutes.length;
        const avgQuality =
          data.qualities.length > 0
            ? data.qualities.reduce((a, b) => a + b, 0) / data.qualities.length
            : null;
        result.push({ day, hour, avgMinutes, avgQuality });
      }
    }
  }
  return result;
}
```

Render as a CSS grid of 24×7 small squares (24 columns = hours, 7 rows = days). Color each cell with `minutesToColor(avgMinutes)`. Tooltip shows time slot label and avg quality.

### 6.3 Momentum score

The momentum score is a 7-day exponential moving average of quality-weighted focus minutes.

```typescript
// Returns a daily time series of momentum scores (0–100)
export function momentumTimeSeries(sessions: FocusSession[]): { date: string; score: number }[] {
  // Quality-weighted minutes per day: durationMinutes × (quality / 5)
  // Default quality weight = 3/5 = 0.6 if quality was not rated
  const byDay = new Map<string, number>();

  for (const s of sessions) {
    const date  = s.startTime.slice(0, 10);
    const weight = (s.quality ?? 3) / 5;
    byDay.set(date, (byDay.get(date) ?? 0) + s.durationMinutes * weight);
  }

  const allDates = Array.from(byDay.keys()).sort();
  if (allDates.length === 0) return [];

  // Fill date gaps with 0
  const start = new Date(allDates[0]);
  const end   = new Date();
  const filled: { date: string; raw: number }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    filled.push({ date: d, raw: byDay.get(d) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  // EMA: alpha = 2 / (7 + 1) = 0.25
  const alpha = 2 / 8;
  let ema = filled[0].raw;
  const MAX_DAILY = 200; // 200 weighted minutes = perfect score

  return filled.map(({ date, raw }) => {
    ema = alpha * raw + (1 - alpha) * ema;
    const score = Math.min(100, Math.round((ema / MAX_DAILY) * 100));
    return { date, score };
  });
}
```

Display as a small sparkline in the sidebar and a full `LineChart` on the Analytics page.

### 6.4 Area balance chart

```typescript
// Returns weekly totals per area for the last N weeks
export function areaBalanceByWeek(
  sessions: FocusSession[],
  weeks = 8
): { weekStart: string; health: number; learning: number; social: number; finance: number; recovery: number }[] {
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (weeks - 1 - i) * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const week = sessions.filter((s) => {
      const d = new Date(s.startTime);
      return d >= weekStart && d <= weekEnd;
    });

    const totals = { health: 0, learning: 0, social: 0, finance: 0, recovery: 0 };
    for (const s of week) {
      if (s.area in totals) totals[s.area as keyof typeof totals] += s.durationMinutes;
    }

    return { weekStart: weekStart.toISOString().slice(0, 10), ...totals };
  });
}
```

Render as a Recharts `BarChart` with `stackId="a"`. Fixed color per area:
- health = `#1D9E75`
- learning = `#3B8BD4`
- social = `#D4537E`
- finance = `#7F77DD`
- recovery = `#888780`

---

## 7. Phase 5 — Wheel of Life

### 7.1 WheelOfLife component

Render as an inline SVG inside a React component.

```
Drawing algorithm:
1. Compute center (cx, cy) and max radius from component size prop (default 300px)
2. Draw 4 concentric polygons at 25%, 50%, 75%, 100% of radius — these are the grid rings
3. Draw spoke lines from center to each of the 10 axis tips at 100% radius
4. For each axis i (0–9):
     angle = (2π × i / 10) - π/2    ← start at 12 o'clock
     scoreRadius = (currentScore / 10) × maxRadius
     x = cx + scoreRadius × cos(angle)
     y = cy + scoreRadius × sin(angle)
5. Connect all 10 score points into a filled polygon:
     fill: axis.color at 20% opacity
     stroke: axis.color at 100% opacity, 1.5px
6. Draw a dashed polygon for target scores (same math, dashed stroke, no fill)
7. Draw axis labels at (cx + (maxRadius + 20) × cos(angle), cy + ... sin(angle))
   — use text-anchor based on x position: "start" if x > cx, "end" if x < cx, "middle" if close
8. Draw a small circle (r=4) at each score point on the filled polygon
```

If `editable` prop is true, render 10 labeled range inputs (0–10) below the wheel. On slider change, update `settingsStore.wheelAxes[i].currentScore` and re-render the polygon.

### 7.2 Default axes configuration

```typescript
// In settingsStore.ts default state:

const DEFAULT_WHEEL_AXES: WheelAxis[] = [
  { id: 'deep-work',  label: 'Deep work',        color: '#3B8BD4', currentScore: 5, targetScore: 9 },
  { id: 'health',     label: 'Physical health',   color: '#1D9E75', currentScore: 5, targetScore: 9 },
  { id: 'learning',   label: 'Learning / skills', color: '#7F77DD', currentScore: 5, targetScore: 8 },
  { id: 'social',     label: 'Social capital',    color: '#D4537E', currentScore: 5, targetScore: 7 },
  { id: 'clarity',    label: 'Mental clarity',    color: '#EF9F27', currentScore: 5, targetScore: 8 },
  { id: 'nutrition',  label: 'Nutrition',         color: '#1D9E75', currentScore: 5, targetScore: 8 },
  { id: 'sleep',      label: 'Sleep quality',     color: '#185fa5', currentScore: 5, targetScore: 9 },
  { id: 'finance',    label: 'Finance / build',   color: '#7F77DD', currentScore: 5, targetScore: 8 },
  { id: 'purpose',    label: 'Purpose / meaning', color: '#D85A30', currentScore: 5, targetScore: 9 },
  { id: 'recovery',   label: 'Recovery',          color: '#888780', currentScore: 5, targetScore: 7 },
];
```

### 7.3 Weekly snapshot — persist wheel history

```typescript
// In settingsStore.ts

export interface WheelSnapshot {
  date: string;                   // "YYYY-MM-DD" of the Sunday
  scores: Record<string, number>; // axisId → score
}

// Call on every app load — saves once per Sunday
export function maybeSaveWeeklySnapshot(axes: WheelAxis[]): void {
  const today = new Date();
  if (today.getDay() !== 0) return; // only on Sundays

  const todayStr = today.toISOString().slice(0, 10);
  const snapshots = storageGet<WheelSnapshot[]>('wheelSnapshots') ?? [];
  if (snapshots.some((s) => s.date === todayStr)) return;

  const scores: Record<string, number> = {};
  axes.forEach((a) => { scores[a.id] = a.currentScore; });
  storageAppend('wheelSnapshots', { date: todayStr, scores });
}
```

On the Wheel settings page, render each axis as a sparkline of its score over the last 12 weekly snapshots.

---

## 8. Phase 6 — Weekly Karma Report

### 8.1 Report data assembly

```typescript
// src/lib/analytics.ts

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalFocusMinutes: number;
  focusByArea: Record<string, number>;
  completedSessions: number;
  abandonedSessions: number;
  completionRate: number;             // 0–1
  avgQuality: number | null;
  topArea: string | null;
  neglectedArea: string | null;
  longestStreak: { habitName: string; days: number } | null;
  sleepAvg: number | null;
  hrvAvg: number | null;
  recommendations: string[];          // 3 plain-text action items
}

export function buildWeeklyReport(
  sessions: FocusSession[],
  checkins: HealthCheckin[],
  habitStreaks: { name: string; streak: number }[]
): WeeklyReport {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekSessions = sessions.filter((s) => new Date(s.startTime) >= weekStart);
  const weekCheckins = checkins.filter((c) => new Date(c.date) >= weekStart);

  const completed  = weekSessions.filter((s) => s.completed);
  const abandoned  = weekSessions.filter((s) => !s.completed);
  const totalMins  = weekSessions.reduce((s, r) => s + r.durationMinutes, 0);
  const compRate   = weekSessions.length > 0 ? completed.length / weekSessions.length : 0;

  const qualitySessions = completed.filter((s) => s.quality !== null);
  const avgQuality =
    qualitySessions.length > 0
      ? qualitySessions.reduce((s, r) => s + (r.quality ?? 0), 0) / qualitySessions.length
      : null;

  const focusByArea: Record<string, number> = {};
  for (const s of weekSessions) {
    focusByArea[s.area] = (focusByArea[s.area] ?? 0) + s.durationMinutes;
  }

  const allAreas = ['health', 'learning', 'social', 'finance', 'recovery'];
  const topArea = Object.entries(focusByArea).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const neglectedArea =
    allAreas.find((a) => !focusByArea[a]) ??
    Object.entries(focusByArea).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;

  const sleepArr = weekCheckins.map((c) => c.sleepHours).filter((v): v is number => v !== null);
  const sleepAvg = sleepArr.length > 0 ? sleepArr.reduce((a, b) => a + b, 0) / sleepArr.length : null;

  const hrvArr = weekCheckins.map((c) => c.hrv).filter((v): v is number => v !== null);
  const hrvAvg = hrvArr.length > 0 ? hrvArr.reduce((a, b) => a + b, 0) / hrvArr.length : null;

  const longestStreak =
    habitStreaks.length > 0
      ? [...habitStreaks].sort((a, b) => b.streak - a.streak)[0]
        ? { habitName: habitStreaks[0].name, days: habitStreaks[0].streak }
        : null
      : null;

  const recommendations: string[] = [];
  if (compRate < 0.7)
    recommendations.push(`Session completion was ${Math.round(compRate * 100)}%. Try 25-min blocks to rebuild finishing momentum.`);
  if (neglectedArea)
    recommendations.push(`Zero focus time in ${neglectedArea} this week. Schedule at least one block next week.`);
  if (sleepAvg !== null && sleepAvg < 7)
    recommendations.push(`Average sleep was ${sleepAvg.toFixed(1)} hrs. Target 7+ hrs — it directly predicts your focus quality score.`);
  if (recommendations.length === 0)
    recommendations.push('Strong week. Maintain momentum and raise your lowest wheel axis score by 1 point.');
  if (recommendations.length < 3)
    recommendations.push('Log HRV and sleep daily to unlock sleep-focus correlation insights.');

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: now.toISOString().slice(0, 10),
    totalFocusMinutes: totalMins,
    focusByArea,
    completedSessions: completed.length,
    abandonedSessions: abandoned.length,
    completionRate: compRate,
    avgQuality,
    topArea,
    neglectedArea,
    longestStreak,
    sleepAvg,
    hrvAvg,
    recommendations,
  };
}
```

### 8.2 Report UI sections

Render in `WeeklyReport.tsx` as a full-width card. Six sections:

1. **Header row**: "Week of [weekStart]" + total hours in large type (e.g. "12.4 hrs")
2. **Area split**: stacked mini bar + table (area, hours, % of total)
3. **Session quality**: completion rate as a donut chart + avg quality stars
4. **Health snapshot**: sleep avg badge + HRV avg badge + streak record
5. **Recommendations**: 3 cards with amber left border
6. **Export button**: copies a plain-text version to clipboard

---

## 9. Phase 7 — AI Insight Layer

### 9.1 Anthropic API integration

```typescript
// src/lib/insights.ts

import { FocusSession, HealthCheckin } from '../types';

export async function generateInsight(
  sessions: FocusSession[],
  checkins: HealthCheckin[],
  userQuestion?: string
): Promise<string> {
  const focusSummary = buildFocusSummary(sessions);
  const healthSummary = buildHealthSummary(checkins);

  const systemPrompt =
    'You are a personal performance analyst. Analyze focus, health, and habit data to give concise, actionable insights. Be specific — reference the actual numbers. Give one concrete recommendation per insight. Speak directly. Never give generic advice.';

  const userContent = `
FOCUS DATA (last 30 days):
${focusSummary}

HEALTH DATA (last 30 days):
${healthSummary}

${userQuestion ?? 'Give me your top 3 insights and 3 specific actions to take this week.'}
  `.trim();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text ?? 'Unable to generate insight.';
}

function buildFocusSummary(sessions: FocusSession[]): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = sessions.filter((s) => new Date(s.startTime) >= cutoff);

  const byArea: Record<string, { minutes: number; qualities: number[] }> = {};
  for (const s of recent) {
    if (!byArea[s.area]) byArea[s.area] = { minutes: 0, qualities: [] };
    byArea[s.area].minutes += s.durationMinutes;
    if (s.quality !== null) byArea[s.area].qualities.push(s.quality);
  }

  return Object.entries(byArea)
    .map(([area, d]) => {
      const hrs = (d.minutes / 60).toFixed(1);
      const avgQ =
        d.qualities.length > 0
          ? (d.qualities.reduce((a, b) => a + b, 0) / d.qualities.length).toFixed(1)
          : 'unrated';
      return `${area}: ${hrs} hrs, avg quality ${avgQ}/5`;
    })
    .join('\n');
}

function buildHealthSummary(checkins: HealthCheckin[]): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = checkins.filter((c) => new Date(c.date) >= cutoff);
  if (recent.length === 0) return 'No health data logged.';

  const avg = (arr: (number | null)[]) => {
    const v = arr.filter((x): x is number => x !== null);
    return v.length > 0 ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 'n/a';
  };

  return [
    `Avg sleep: ${avg(recent.map((c) => c.sleepHours))} hrs`,
    `Avg HRV: ${avg(recent.map((c) => c.hrv))} ms`,
    `Avg resting HR: ${avg(recent.map((c) => c.restingHR))} bpm`,
    `Avg energy: ${avg(recent.map((c) => c.energyLevel))}/5`,
    `Avg mood: ${avg(recent.map((c) => c.moodScore))}/5`,
    `Check-in days: ${recent.length} of last 30`,
  ].join('\n');
}
```

### 9.2 Insight panel UI

Add to the Analytics page as a collapsible bottom panel.

- `<textarea>` placeholder: "Ask about your data..."
- "Analyse" button triggers `generateInsight()`
- Show a pulsing skeleton while the API call is in flight
- Render the response with basic markdown (bold, line breaks)
- Persist last 10 responses to `storageGet('insightHistory')`
- Show history as a collapsible list above the input

---

## 10. Component Reference

### Dependencies to install

```bash
npm install zustand recharts date-fns
```

- **Zustand** — all store state
- **Recharts** — `ScatterChart`, `BarChart`, `LineChart`, `AreaChart`
- **date-fns** — `format`, `startOfWeek`, `eachDayOfInterval`, `isThisWeek`

### Recharts patterns used across the app

```tsx
// Scatter chart — sleep × focus correlation
<ScatterChart width={400} height={300}>
  <XAxis dataKey="sleepHours" name="Sleep" type="number" domain={[4, 10]} unit="h" />
  <YAxis dataKey="avgFocusQuality" name="Quality" type="number" domain={[1, 5]} />
  <Scatter data={correlationPoints} fill="#3b8bd4" />
  <ReferenceLine
    segment={[
      { x: 5, y: regression.slope * 5 + regression.intercept },
      { x: 9, y: regression.slope * 9 + regression.intercept },
    ]}
    stroke="#888" strokeDasharray="4 4"
  />
  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
</ScatterChart>

// Stacked bar — area balance
<BarChart data={weeklyData}>
  <XAxis dataKey="weekStart" tickFormatter={(d) => format(new Date(d), 'MMM d')} />
  <YAxis unit=" min" />
  <Tooltip formatter={(v: number) => `${Math.round(v / 60 * 10) / 10} hrs`} />
  <Bar dataKey="health"   stackId="a" fill="#1D9E75" />
  <Bar dataKey="learning" stackId="a" fill="#3B8BD4" />
  <Bar dataKey="social"   stackId="a" fill="#D4537E" />
  <Bar dataKey="finance"  stackId="a" fill="#7F77DD" />
  <Bar dataKey="recovery" stackId="a" fill="#888780" />
</BarChart>

// Line chart — momentum over time
<LineChart data={momentumSeries}>
  <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} />
  <YAxis domain={[0, 100]} />
  <Line type="monotone" dataKey="score" stroke="#3b8bd4" dot={false} strokeWidth={2} />
  <ReferenceLine y={50} stroke="#ccc" strokeDasharray="4 4" label="baseline" />
</LineChart>
```

### Data flow — invariant rules

```
User action
    ↓
Store action (Zustand)
    ↓
lib/storage.ts (storageAppend / storageUpdate)
    ↓
localStorage  [versioned key: karma_yoga_v1_*]
    ↓
lib/aggregations.ts or lib/analytics.ts  [pure functions, zero side effects]
    ↓
Component renders via useMemo / selector
```

- Components never call `localStorage` directly — only through store actions
- All computation (aggregation, analytics, scoring) lives in `lib/` functions
- All `lib/` functions are pure — same input always returns same output
- Stores are the only place that call `storageAppend` / `storageUpdate`

---

*Build phases in order: 1 → 2 → 3 → 4 → 5 → 6 → 7. Do not skip ahead. Each phase's data model is consumed by the next.*
