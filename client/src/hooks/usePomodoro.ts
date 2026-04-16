import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';

export type Phase = 'idle' | 'focus' | 'short_break' | 'long_break';

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

export function usePomodoro() {
  const [presetKey, setPresetKey] = useState<number>(() => Number(localStorage.getItem('pomodoro_preset')) || 25);
  const [phase, setPhase] = useState<Phase>(() => (localStorage.getItem('pomodoro_phase') as Phase) || 'idle');
  const [totalSeconds, setTotalSeconds] = useState(() => Number(localStorage.getItem('pomodoro_total')) || 25 * 60);
  const [isRunning, setIsRunning] = useState(() => localStorage.getItem('pomodoro_running') === 'true');
  const [cycle, setCycle] = useState(() => Number(localStorage.getItem('pomodoro_cycle')) || 1);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>(() => localStorage.getItem('pomodoro_area') || 'mind');
  const [focusAnalytics, setFocusAnalytics] = useState<any>(null);

  const [endTime, setEndTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('pomodoro_endTime');
    return saved ? Number(saved) : null;
  });

  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const savedEndTime = localStorage.getItem('pomodoro_endTime');
    const wasRunning = localStorage.getItem('pomodoro_running') === 'true';
    
    if (savedEndTime && wasRunning) {
      const remaining = Math.max(0, Math.floor((Number(savedEndTime) - Date.now()) / 1000));
      return remaining;
    }
    return Number(localStorage.getItem('pomodoro_remaining')) || 25 * 60;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const preset = PRESETS[presetKey];

  // Load today's sessions and analytics
  useEffect(() => {
    api.getTodaySessions().then(setTodaySessions).catch(console.error);
    api.getFocusAnalytics().then(setFocusAnalytics).catch(console.error);
  }, []);

  // Persistence Sync
  useEffect(() => {
    localStorage.setItem('pomodoro_preset', String(presetKey));
    localStorage.setItem('pomodoro_phase', phase);
    localStorage.setItem('pomodoro_remaining', String(remainingSeconds));
    localStorage.setItem('pomodoro_total', String(totalSeconds));
    localStorage.setItem('pomodoro_running', String(isRunning));
    localStorage.setItem('pomodoro_cycle', String(cycle));
    localStorage.setItem('pomodoro_area', selectedArea);
    if (endTime) {
      localStorage.setItem('pomodoro_endTime', String(endTime));
    } else {
      localStorage.removeItem('pomodoro_endTime');
    }
  }, [presetKey, phase, remainingSeconds, totalSeconds, isRunning, cycle, selectedArea, endTime]);

  // Timer tick - using timestamp-based calculation to avoid drift
  useEffect(() => {
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setRemainingSeconds(remaining);
      }, 100);
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
      // Log the completed focus session
      api.logSession(preset.focus, preset.shortBreak, true, selectedArea)
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
    } else {
      // Break ended → back to focus
      if (phase === 'short_break') {
        setCycle(c => c + 1);
      }
      setPhase('focus');
      const secs = preset.focus * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
    }
  }, [phase, cycle, preset]);

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
    : phase === 'short_break' ? 'Short Break'
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
    todaySessions,
    presets: Object.keys(PRESETS).map(Number),
    selectedArea,
    setSelectedArea,
    focusAnalytics,
  };
}
