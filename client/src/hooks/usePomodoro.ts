import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { storageGet, storageGetString, storageRemove, storageSet, storageSetString } from '../lib/storage';
import type { FocusAnalytics, FocusQuality, PomodoroSession } from '../types';

export type Phase = 'idle' | 'focus' | 'rating' | 'short_break' | 'long_break';

interface Preset {
  focus: number;      // minutes
  shortBreak: number;
  longBreak: number;
  cyclesBeforeLong: number;
}

const PRESETS: Record<number, Preset> = {
  25: { focus: 25, shortBreak: 5, longBreak: 10, cyclesBeforeLong: 4 },
  50: { focus: 50, shortBreak: 10, longBreak: 20, cyclesBeforeLong: 3 },
  90: { focus: 90, shortBreak: 20, longBreak: 30, cyclesBeforeLong: 2 },
};

const POMODORO_CACHE_KEY = 'pomodoro_sessions_cache';
const POMODORO_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface PomodoroCache {
  sessions: PomodoroSession[];
  analytics: FocusAnalytics | null;
  timestamp: number;
}

function getPomodoroCached(): PomodoroCache | null {
  try {
    const raw = localStorage.getItem(POMODORO_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as PomodoroCache;
    if (Date.now() - cached.timestamp > POMODORO_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function setPomodoroCached(data: PomodoroCache): void {
  try {
    localStorage.setItem(POMODORO_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function usePomodoro() {
  const [presetKey, setPresetKey] = useState<number>(() => storageGet<number>('pomodoro_preset', 25));
  const [phase, setPhase] = useState<Phase>(() => {
    const stored = storageGetString('pomodoro_phase', 'idle');
    return ['idle', 'focus', 'short_break', 'long_break'].includes(stored) ? (stored as Phase) : 'idle';
  });
  const [totalSeconds, setTotalSeconds] = useState(() => storageGet<number>('pomodoro_total', 25 * 60));
  const [isRunning, setIsRunning] = useState(() => storageGetString('pomodoro_running', 'false') === 'true');
  const [cycle, setCycle] = useState(() => storageGet<number>('pomodoro_cycle', 1));
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>(() => storageGetString('pomodoro_area', 'mind'));
  const [intention, setIntention] = useState<string>(() => storageGetString('pomodoro_intention', ''));
  const [focusAnalytics, setFocusAnalytics] = useState<FocusAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [endTime, setEndTime] = useState<number | null>(() => {
    const saved = storageGet<number | null>('pomodoro_endTime', null);
    return typeof saved === 'number' ? saved : null;
  });

  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const savedEndTime = storageGet<number | null>('pomodoro_endTime', null);
    const wasRunning = storageGetString('pomodoro_running', 'false') === 'true';
    
    if (typeof savedEndTime === 'number' && wasRunning) {
      const remaining = Math.max(0, Math.floor((savedEndTime - Date.now()) / 1000));
      return remaining;
    }
    return storageGet<number>('pomodoro_remaining', 25 * 60);
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const preset = PRESETS[presetKey];



  // Load today's sessions and analytics
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Try cache first
      const cached = getPomodoroCached();
      if (cached) {
        setTodaySessions(cached.sessions);
        setFocusAnalytics(cached.analytics);
        setLoading(false);
      }

      try {
        const [sessions, analytics] = await Promise.all([
          api.getTodaySessions(),
          api.getFocusAnalytics(),
        ]);

        if (cancelled) return;
        setTodaySessions(sessions);
        setFocusAnalytics(analytics);
        setPomodoroCached({ sessions, analytics, timestamp: Date.now() });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pomodoro data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persistence Sync
  useEffect(() => {
    storageSet('pomodoro_preset', presetKey);
    storageSetString('pomodoro_phase', phase);
    storageSet('pomodoro_remaining', remainingSeconds);
    storageSet('pomodoro_total', totalSeconds);
    storageSetString('pomodoro_running', String(isRunning));
    storageSet('pomodoro_cycle', cycle);
    storageSetString('pomodoro_area', selectedArea);
    storageSetString('pomodoro_intention', intention);
    if (endTime) {
      storageSet('pomodoro_endTime', endTime);
    } else {
      storageRemove('pomodoro_endTime');
    }
  }, [presetKey, phase, remainingSeconds, totalSeconds, isRunning, cycle, selectedArea, intention, endTime]);

  // Timer tick - using timestamp-based calculation to avoid drift
  useEffect(() => {
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setRemainingSeconds(remaining);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, endTime]);

  const handlePhaseEnd = useCallback(() => {
    setIsRunning(false);
    setEndTime(null);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (phase === 'focus') {
      // Enter rating phase to get quality rating before logging session
      setPhase('rating');
    } else {
      // Break ended → back to focus
      if (phase === 'short_break') {
        setCycle(c => c + 1);
      }
      setPhase('idle');
      const secs = preset.focus * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
    }
  }, [phase, cycle, preset]);

  const submitRating = useCallback((quality: FocusQuality) => {
    // Log the completed focus session with quality
    api.logSession(preset.focus, preset.shortBreak, true, selectedArea, intention, quality)
      .then(() => {
        api.getTodaySessions().then(setTodaySessions);
        api.getFocusAnalytics().then(setFocusAnalytics);
      })
      .catch(console.error);

    // Determine next break
    if (cycle >= preset.cyclesBeforeLong) {
      setPhase('long_break');
      const secs = preset.longBreak * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
      setCycle(1);
    } else {
      setPhase('short_break');
      const secs = preset.shortBreak * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
    }
  }, [cycle, preset, selectedArea, intention]);

  // Handle Phase End when timer reaches zero
  useEffect(() => {
    if (isRunning && remainingSeconds === 0) {
      handlePhaseEnd();
    }
  }, [remainingSeconds, isRunning, handlePhaseEnd]);

  const selectPreset = useCallback((key: number) => {
    const p = PRESETS[key];
    setPresetKey(key);
    setPhase('idle');
    setIsRunning(false);
    setEndTime(null);
    setCycle(1);
    const secs = p.focus * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const start = useCallback(() => {
    if (phase === 'idle') {
      setPhase('focus');
    }
    const end = Date.now() + remainingSeconds * 1000;
    setEndTime(end);
    setIsRunning(true);
  }, [phase, remainingSeconds]);

  const pause = useCallback(() => {
    if (endTime) {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      setEndTime(null);
    }
    setIsRunning(false);
  }, [endTime]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setEndTime(null);
    setPhase('idle');
    setCycle(1);
    const secs = preset.focus * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [preset]);

  const phaseLabel = phase === 'idle' ? 'Ready'
    : phase === 'focus' ? 'Focus'
    : phase === 'rating' ? 'Rate Session'
    : phase === 'short_break' ? 'Short Break'
    : 'Long Break';

  const sessionLabel = `Cycle ${cycle} of ${preset.cyclesBeforeLong}`;

  const setIntentionText = useCallback((text: string) => {
    setIntention(text);
  }, []);

  return {
    presetKey,
    selectPreset,
    phase,
    phaseLabel,
    sessionLabel,
    totalSeconds,
    remainingSeconds,
    isRunning,
    start,
    pause,
    reset,
    loading,
    error,
    todaySessions,
    presets: Object.keys(PRESETS).map(Number),
    selectedArea,
    setSelectedArea,
    intention,
    setIntentionText,
    submitRating,
    focusAnalytics,
  };
}
