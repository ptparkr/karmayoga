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
  const [presetKey, setPresetKey] = useState<number>(25);
  const [phase, setPhase] = useState<Phase>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycle, setCycle] = useState(1);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>(() => localStorage.getItem('pomodoro_area') || 'mind');
  const [focusAnalytics, setFocusAnalytics] = useState<any>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const preset = PRESETS[presetKey];

  // Load today's sessions and analytics
  useEffect(() => {
    api.getTodaySessions().then(setTodaySessions).catch(console.error);
    api.getFocusAnalytics().then(setFocusAnalytics).catch(console.error);
  }, []);

  // Update localStorage when area changes
  useEffect(() => {
    localStorage.setItem('pomodoro_area', selectedArea);
  }, [selectedArea]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, presetKey]); // Simplified dependencies

  const handlePhaseEnd = useCallback(() => {
    setIsRunning(false);
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
    setIsRunning(true);
  }, [phase]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
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
