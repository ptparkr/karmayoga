import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../lib/settings';
import type { AppSettings } from '../types';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 900;

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((nextSettings: AppSettings) => {
    setStatus('saving');
    setError(null);
    try {
      const saved = saveSettings(nextSettings);
      setSettings(saved);
      setLastSavedAt(new Date());
      setStatus('saved');
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        setStatus(current => (current === 'saved' ? 'idle' : current));
      }, 1800);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }, []);

  const markDirty = useCallback((updater: (current: AppSettings) => AppSettings) => {
    setSettings(current => updater(current));
    setStatus('dirty');
    setError(null);
  }, []);

  const saveNow = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    persist(settings);
  }, [persist, settings]);

  const resetToDefaults = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSettings(DEFAULT_SETTINGS);
    setStatus('dirty');
    setError(null);
  }, []);

  useEffect(() => {
    if (status !== 'dirty') return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persist(settings);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [persist, settings, status]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  const formatLastSaved = useMemo(() => {
    return (date: Date | null) => {
      if (!date) return 'Not saved yet';
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 5) return 'Just now';
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
  }, []);

  return {
    settings,
    status,
    error,
    lastSavedAt,
    markDirty,
    saveNow,
    resetToDefaults,
    formatLastSaved,
  };
}
