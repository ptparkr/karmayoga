import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { usePomodoro } from '../hooks/usePomodoro';
import { TimerRing } from '../components/TimerRing';
import { FocusActivityMap } from '../components/FocusActivityMap';
import { QualityRating } from '../components/QualityRating';
import { SessionLog } from '../components/SessionLog';
import { useAreaColors } from '../hooks/useAreaColors';
import { getRecommendedDuration } from '../lib/analytics';
import { loadSettings } from '../lib/settings';
import { PomodoroShimmer } from '../components/Shimmer';

const recommendationReasons: Record<25 | 45 | 90, string> = {
  25: 'Recent rated sessions point to shorter blocks for stronger consistency.',
  45: 'Recent sessions suggest you perform best with a balanced mid-length focus block.',
  90: 'Recent rated sessions show you can sustain deep work with longer focus blocks.',
};

export function PomodoroPage() {
  const {
    presetKey,
    selectPreset,
    presets,
    presetConfig,
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
    selectedArea,
    setSelectedArea,
    intention,
    setIntentionText,
    submitRating,
    focusAnalytics,
  } = usePomodoro();
  const { areas, getColor } = useAreaColors();
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);

  const settings = useMemo(() => loadSettings(), []);
  const recommendation = useMemo(() => {
    if (recentSessions.length < 3) return null;
    return getRecommendedDuration(recentSessions);
  }, [recentSessions]);

  const shouldShowRecommendation = Boolean(
    recommendation &&
    settings.preferences.showAdaptiveRecommendations &&
    !recommendationDismissed &&
    recommendation !== presetKey
  );

  if (loading && todaySessions.length === 0) {
    return <PomodoroShimmer />;
  }

  return (
    <div className="page-shell">
      <div className="page-header animate-slide">
        <h1 className="page-title">Pomodoro</h1>
        <p className="page-subtitle">Deep focus sessions with structured breaks and adaptive coaching.</p>
      </div>

      {error && (
        <div className="status-banner">
          <span>{error}</span>
        </div>
      )}

      {shouldShowRecommendation && recommendation && (
        <section className="recommendation-banner">
          <div className="recommendation-copy">
            <span className="recommendation-badge">Adaptive recommendation</span>
            <strong>{recommendation} minute sessions</strong>
            <p>{recommendationReasons[recommendation]}</p>
          </div>
          <div className="recommendation-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                selectPreset(recommendation);
                setRecommendationDismissed(true);
              }}
            >
              Apply
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setRecommendationDismissed(true)}>
              Dismiss
            </button>
          </div>
        </section>
      )}

      <div className="pomodoro-grid">
        <div className="pomodoro-main-area animate-in">
          <div className="preset-buttons">
            {presets.map(presetOption => (
              <button
                key={presetOption}
                className={`preset-btn ${presetKey === presetOption ? 'active' : ''}`}
                onClick={() => selectPreset(presetOption)}
              >
                {presetOption}m
              </button>
            ))}
          </div>

          {(phase === 'idle' || phase === 'rating') && (
            <div className="intention-input-wrapper">
              <input
                type="text"
                className="intention-input"
                placeholder="What will you focus on? (optional)"
                value={intention}
                onChange={event => setIntentionText(event.target.value)}
                maxLength={100}
              />
            </div>
          )}

          <div className="timer-section-wrapper">
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

          <div className="area-selector">
            {areas.map(area => {
              const color = getColor(area);
              return (
                <button
                  key={area}
                  className={`area-pill ${selectedArea === area ? 'active' : ''}`}
                  style={{
                    '--color': color,
                    '--shadow-color': `${color}60`,
                  } as CSSProperties}
                  onClick={() => setSelectedArea(area)}
                >
                  {area.charAt(0).toUpperCase() + area.slice(1)}
                </button>
              );
            })}
          </div>

          <div className="timer-controls">
            <button className="timer-btn timer-btn-reset" onClick={reset} title="Reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            {phase === 'rating' ? (
              <button className="timer-btn timer-btn-start" onClick={() => submitRating(null)} title="Skip Rating">
                <span className="timer-btn-label">SKIP</span>
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

          <div className="pomodoro-break-summary">
            {presetConfig.shortBreak} minute short breaks · {presetConfig.longBreak} minute long breaks · long break every {presetConfig.cyclesBeforeLong} cycles
          </div>
        </div>

        <div className="pomodoro-stats-area">
          <FocusActivityMap analytics={focusAnalytics} loading={loading} />

          {todaySessions.length > 0 && (
            <div className="pomodoro-log animate-in pomodoro-log-card">
              <div className="section-title pomodoro-log-title">
                Session History
              </div>
              <SessionLog sessions={todaySessions} />
            </div>
          )}
        </div>
      </div>

      {phase === 'rating' && <QualityRating onRate={submitRating} />}
    </div>
  );
}
