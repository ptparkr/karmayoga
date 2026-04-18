import type { CSSProperties } from 'react';
import { useState, useEffect } from 'react';
import { usePomodoro } from '../hooks/usePomodoro';
import { TimerRing } from '../components/TimerRing';
import { FocusActivityMap } from '../components/FocusActivityMap';
import { QualityRating } from '../components/QualityRating';
import { SessionLog } from '../components/SessionLog';
import { useAreaColors } from '../hooks/useAreaColors';
import { api } from '../lib/api';
import { getRecommendedDuration } from '../lib/analytics';
import { PomodoroShimmer } from '../components/Shimmer';

export function PomodoroPage() {
  const {
    presetKey, selectPreset, presets,
    phase, phaseLabel, sessionLabel,
    totalSeconds, remainingSeconds, isRunning,
    start, pause, reset,
    loading, error,
    todaySessions,
    selectedArea, setSelectedArea,
    intention, setIntentionText,
    submitRating,
    focusAnalytics,
  } = usePomodoro();
  const { areas, getColor } = useAreaColors();
  
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  // Fetch recent sessions for adaptive timer
  useEffect(() => {
    api.getRecentSessions(7).then(setRecentSessions).catch(console.error);
  }, []);

  // Get adaptive recommendation
  const recommendation = recentSessions.length >= 3 
    ? getRecommendedDuration(recentSessions)
    : null;
    
  const canStart = phase === 'idle' || phase === 'rating';

  if (loading && todaySessions.length === 0) {
    return <PomodoroShimmer />;
  }

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

      {/* Adaptive Timer Recommendation */}
      {recommendation && showRecommendation && (
        <div className="recommendation-banner" onClick={() => { selectPreset(recommendation); setShowRecommendation(false); }}>
          <span>Adaptive: Based on your recent sessions, we recommend {recommendation}m sessions</span>
          <button className="recommendation-btn">Apply</button>
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
            {recommendation && (
              <button className="preset-btn preset-btn-adaptive" onClick={() => setShowRecommendation(true)}>
                <span className="adaptive-icon">⚡</span>
              </button>
            )}
          </div>

          {/* Intention Input */}
          {(phase === 'idle' || phase === 'rating') && (
            <div className="intention-input-wrapper">
              <input
                type="text"
                className="intention-input"
                placeholder="What will you focus on? (optional)"
                value={intention}
                onChange={(e) => setIntentionText(e.target.value)}
                maxLength={100}
              />
            </div>
          )}

          <div className="timer-section-wrapper" style={{ position: 'relative' }}>
            {/* Timer Ring */}
            <TimerRing
              totalSeconds={totalSeconds}
              remainingSeconds={remainingSeconds}
              isRunning={isRunning}
              phase={phase === 'rating' ? 'focus' : phase}
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
            
            {phase === 'rating' ? (
              <button className="timer-btn timer-btn-start" onClick={() => submitRating(3)} title="Skip Rating">
                <span style={{ fontSize: 12, fontWeight: 700 }}>SKIP</span>
              </button>
            ) : isRunning ? (
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

          {/* Session Log */}
          {todaySessions.length > 0 && (
            <div className="pomodoro-log animate-in" style={{ animationDelay: '0.2s' }}>
              <div className="section-title" style={{ fontSize: 13, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--gap-md)' }}>
                Session History
              </div>
              <SessionLog sessions={todaySessions} />
            </div>
          )}
        </div>
      </div>

      {/* Quality Rating Overlay */}
      {phase === 'rating' && (
        <QualityRating onRate={submitRating} />
      )}

      <style>{`
        .recommendation-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--gap-md) var(--gap-lg);
          background: linear-gradient(135deg, rgba(0, 255, 204, 0.1), rgba(0, 255, 204, 0.05));
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          margin-bottom: var(--gap-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          animation: slideIn 0.4s var(--ease-out);
        }
        .recommendation-banner:hover {
          background: linear-gradient(135deg, rgba(0, 255, 204, 0.15), rgba(0, 255, 204, 0.1));
        }
        .recommendation-btn {
          padding: 6px 16px;
          background: var(--accent);
          color: var(--bg-primary);
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        .intention-input-wrapper {
          margin-bottom: var(--gap-lg);
        }
        .intention-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 14px;
          text-align: center;
          transition: all 0.2s ease;
        }
        .intention-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(0, 255, 204, 0.1);
        }
        .intention-input::placeholder {
          color: var(--text-muted);
        }
        .preset-btn-adaptive {
          padding: 8px 12px;
          background: rgba(0, 255, 204, 0.1);
          border: 1px solid var(--accent) !important;
        }
        .adaptive-icon {
          font-size: 14px;
        }
        .pomodorolog {
          width: 100%;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}