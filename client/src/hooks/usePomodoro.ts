import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { loadSettings } from '../lib/settings';
import { storageGet, storageGetString, storageRemove, storageSet, storageSetString } from '../lib/storage';
import type { FocusAnalytics, FocusQuality, PomodoroSession } from '../types';

export type Phase = 'idle' | 'focus' | 'rating' | 'short_break' | 'long_break';

interface Preset {
  focus: number;
  shortBreak: number;
  longBreak: number;
  cyclesBeforeLong: number;
}

type PresetKey = 25 | 45 | 90;

const POMODORO_CACHE_KEY = 'pomodoro_sessions_cache';
const POMODORO_CACHE_TTL = 2 * 60 * 1000;

interface PomodoroCache {
  sessions: PomodoroSession[];
  analytics: FocusAnalytics | null;
  timestamp: number;
}

function buildPresets(): Record<PresetKey, Preset> {
  const settings = loadSettings();
  return {
    25: {
      focus: 25,
      shortBreak: settings.pomodoro.shortBreak,
      longBreak: settings.pomodoro.longBreak,
      cyclesBeforeLong: settings.pomodoro.pomosBeforeLongBreak,
    },
    45: {
      focus: 45,
      shortBreak: settings.pomodoro.shortBreak,
      longBreak: settings.pomodoro.longBreak,
      cyclesBeforeLong: settings.pomodoro.pomosBeforeLongBreak,
    },
    90: {
      focus: 90,
      shortBreak: settings.pomodoro.shortBreak,
      longBreak: settings.pomodoro.longBreak,
      cyclesBeforeLong: settings.pomodoro.pomosBeforeLongBreak,
    },
  };
}

function getPomodoroCached(): PomodoroCache | null {
  try {
    const raw = localStorage.getItem(POMODORO_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as PomodoroCache;
    return Date.now() - cached.timestamp > POMODORO_CACHE_TTL ? null : cached;
  } catch {
    return null;
  }
}

function setPomodoroCached(data: PomodoroCache) {
  try {
    localStorage.setItem(POMODORO_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to cache pomodoro data:', err);
  }
}

export function usePomodoro() {
  const presets = useMemo(() => buildPresets(), []);
  const presetValues = useMemo(() => Object.keys(presets).map(Number) as PresetKey[], [presets]);
  const defaultPreset = loadSettings().pomodoro.defaultPomoDuration as PresetKey;

  const [presetKey, setPresetKey] = useState<PresetKey>(() => {
    const storedPreset = storageGet<number>('pomodoro_preset', defaultPreset);
    return storedPreset === 45 || storedPreset === 90 ? storedPreset : 25;
  });
  const [phase, setPhase] = useState<Phase>(() => {
    const stored = storageGetString('pomodoro_phase', 'idle');
    return ['idle', 'focus', 'short_break', 'long_break', 'rating'].includes(stored) ? (stored as Phase) : 'idle';
  });
  const [totalSeconds, setTotalSeconds] = useState(() => storageGet<number>('pomodoro_total', presets[defaultPreset].focus * 60));
  const [isRunning, setIsRunning] = useState(() => storageGetString('pomodoro_running', 'false') === 'true');
  const [cycle, setCycle] = useState(() => storageGet<number>('pomodoro_cycle', 1));
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>(() => storageGetString('pomodoro_area', 'mind'));
  const [intention, setIntention] = useState<string>(() => storageGetString('pomodoro_intention', ''));
  const [focusAnalytics, setFocusAnalytics] = useState<FocusAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<PomodoroSession[]>([]);

  const [endTime, setEndTime] = useState<number | null>(() => {
    const saved = storageGet<number | null>('pomodoro_endTime', null);
    return typeof saved === 'number' ? saved : null;
  });

  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const savedEndTime = storageGet<number | null>('pomodoro_endTime', null);
    const wasRunning = storageGetString('pomodoro_running', 'false') === 'true';
    if (typeof savedEndTime === 'number' && wasRunning) {
      return Math.max(0, Math.floor((savedEndTime - Date.now()) / 1000));
    }
    return storageGet<number>('pomodoro_remaining', presets[defaultPreset].focus * 60);
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const preset = presets[presetKey] ?? presets[defaultPreset];

  const refreshSessionData = useCallback(async () => {
    const [sessions, analytics, recent] = await Promise.all([
      api.getTodaySessions(),
      api.getFocusAnalytics(),
      api.getRecentSessions(7),
    ]);
    setTodaySessions(sessions);
    setFocusAnalytics(analytics);
    setRecentSessions(recent);
    setPomodoroCached({ sessions, analytics, timestamp: Date.now() });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = getPomodoroCached();
      if (cached && !cancelled) {
        setTodaySessions(cached.sessions);
        setFocusAnalytics(cached.analytics);
        setLoading(false);
      }

      try {
        const [sessions, analytics, recent] = await Promise.all([
          api.getTodaySessions(),
          api.getFocusAnalytics(),
          api.getRecentSessions(7),
        ]);
        if (cancelled) return;
        setTodaySessions(sessions);
        setFocusAnalytics(analytics);
        setRecentSessions(recent);
        setPomodoroCached({ sessions, analytics, timestamp: Date.now() });
      } catch (err) {
        if (!cancelled) {
          console.error(err);
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
  }, [cycle, endTime, intention, isRunning, phase, presetKey, remainingSeconds, selectedArea, totalSeconds]);

  useEffect(() => {
    endTimeRef.current = endTime;
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const currentEndTime = endTimeRef.current;
        if (!currentEndTime) return;
        setRemainingSeconds(Math.max(0, Math.floor((currentEndTime - Date.now()) / 1000)));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endTime, isRunning]);

  const handlePhaseEnd = useCallback(() => {
    setIsRunning(false);
    setEndTime(null);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (phase === 'focus') {
      setPhase('rating');
      return;
    }

    if (phase === 'short_break') {
      setCycle(current => current + 1);
    }
    setPhase('idle');
    setTotalSeconds(preset.focus * 60);
    setRemainingSeconds(preset.focus * 60);
  }, [phase, preset.focus]);

  const submitRating = useCallback(async (quality: FocusQuality | null) => {
    try {
      await api.logSession(preset.focus, preset.shortBreak, true, selectedArea, intention, quality ?? undefined);
      await refreshSessionData();
    } catch (err) {
      console.error('Failed to log pomodoro session:', err);
    }

    if (cycle >= preset.cyclesBeforeLong) {
      setPhase('long_break');
      setTotalSeconds(preset.longBreak * 60);
      setRemainingSeconds(preset.longBreak * 60);
      setCycle(1);
      return;
    }

    setPhase('short_break');
    setTotalSeconds(preset.shortBreak * 60);
    setRemainingSeconds(preset.shortBreak * 60);
  }, [cycle, intention, preset, refreshSessionData, selectedArea]);

  useEffect(() => {
    if (isRunning && remainingSeconds === 0) {
      handlePhaseEnd();
    }
  }, [handlePhaseEnd, isRunning, remainingSeconds]);

  const selectPreset = useCallback((key: PresetKey) => {
    const nextPreset = presets[key];
    if (!nextPreset) return;
    setPresetKey(key);
    setPhase('idle');
    setIsRunning(false);
    setEndTime(null);
    setCycle(1);
    setTotalSeconds(nextPreset.focus * 60);
    setRemainingSeconds(nextPreset.focus * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [presets]);

  const start = useCallback(() => {
    if (phase === 'idle') setPhase('focus');
    setEndTime(Date.now() + remainingSeconds * 1000);
    setIsRunning(true);
  }, [phase, remainingSeconds]);

  const pause = useCallback(() => {
    if (endTime) {
      setRemainingSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
      setEndTime(null);
    }
    setIsRunning(false);
  }, [endTime]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setEndTime(null);
    setPhase('idle');
    setCycle(1);
    setTotalSeconds(preset.focus * 60);
    setRemainingSeconds(preset.focus * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [preset.focus]);

  const phaseLabel = phase === 'idle'
    ? 'Ready'
    : phase === 'focus'
      ? 'Focus'
      : phase === 'rating'
        ? 'Rate Session'
        : phase === 'short_break'
          ? 'Short Break'
          : 'Long Break';

  const sessionLabel = `Cycle ${cycle} of ${preset.cyclesBeforeLong}`;

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
    recentSessions,
    presets: presetValues,
    presetConfig: preset,
    selectedArea,
    setSelectedArea,
    intention,
    setIntentionText: setIntention,
    submitRating,
    focusAnalytics,
  };
}
