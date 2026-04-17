import type { CSSProperties } from 'react';
import { usePomodoro } from '../hooks/usePomodoro';
import { TimerRing } from '../components/TimerRing';
import { FocusActivityMap } from '../components/FocusActivityMap';
import { useAreaColors } from '../hooks/useAreaColors';

export function PomodoroPage() {
  const {
    presetKey, selectPreset, presets,
    phase, phaseLabel, sessionLabel,
    totalSeconds, remainingSeconds, isRunning,
    start, pause, reset,
    loading, error,
    todaySessions,
    selectedArea, setSelectedArea, focusAnalytics,
  } = usePomodoro();
  const { areas, getColor } = useAreaColors();

  return (
    <div className="app-main">
      <div className="page-header animate-slide">
        <h1 className="page-title">Pomodoro</h1>
        <p className="page-subtitle">Deep focus sessions with structured breaks</p>
      </div>

      {error && (
        <div className="status-banner">
          <span>{error}</span>
        </div>
      )}

      <div className="pomodoro-grid">
        {/* Main Timer Section */}
        <div className="pomodoro-main-area animate-in">
          {/* Presets */}
          <div className="preset-buttons">
            {presets.map(p => (
              <button
                key={p}
                className={`preset-btn ${presetKey === p ? 'active' : ''}`}
                onClick={() => selectPreset(p)}
              >
                {p}m
              </button>
            ))}
          </div>

          <div className="timer-section-wrapper" style={{ position: 'relative' }}>
            {/* Timer Ring */}
            <TimerRing
              totalSeconds={totalSeconds}
              remainingSeconds={remainingSeconds}
              isRunning={isRunning}
              phase={phase}
              phaseLabel={phaseLabel}
              session={sessionLabel}
              selectedArea={selectedArea}
            />
          </div>

          {/* Area Selector */}
          <div className="area-selector">
            {areas.map(a => {
              const color = getColor(a);
              return (
                <button
                  key={a}
                  className={`area-pill ${selectedArea === a ? 'active' : ''}`}
                  style={{
                    '--color': color,
                    '--shadow-color': `${color}60`,
                  } as CSSProperties}
                  onClick={() => setSelectedArea(a)}
                >
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="timer-controls">
            <button className="timer-btn timer-btn-reset" onClick={reset} title="Reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            
            {isRunning ? (
              <button className="timer-btn timer-btn-pause" onClick={pause} title="Pause">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
            ) : (
              <button className="timer-btn timer-btn-start" onClick={start} title="Start">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
          </div>

          {/* Break info */}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em', opacity: 0.8 }}>
            {presetKey === 25 && '5 minute breaks · 15 minute long breaks'}
            {presetKey === 50 && '10 minute breaks · 25 minute long breaks'}
            {presetKey === 90 && '20 minute breaks · 45 minute long breaks'}
          </div>
        </div>

        {/* Info & Stats Section */}
        <div className="pomodoro-stats-area">
          {/* Activity Map */}
          <FocusActivityMap analytics={focusAnalytics} loading={loading} />

          {/* Today's Sessions */}
          {todaySessions.length > 0 && (
            <div className="pomodoro-log animate-in" style={{ animationDelay: '0.2s' }}>
              <div className="section-title" style={{ fontSize: 13, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--gap-md)' }}>
                Session History
              </div>
              <div className="card" style={{ padding: 'var(--gap-md)', background: 'var(--bg-secondary)', border: 'none' }}>
                {todaySessions.map((s, i: number) => (
                  <div key={`${s.created_at}-${i}`} className="pomodoro-log-item">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.focus_min} min focus session</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                      {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
