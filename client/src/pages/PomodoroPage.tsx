import { usePomodoro } from '../hooks/usePomodoro';
import { TimerRing } from '../components/TimerRing';
import { FocusActivityMap } from '../components/FocusActivityMap';
import { useAreaColors } from '../hooks/useAreaColors';

export function PomodoroPage() {
  const {
    presetKey, selectPreset, presets,
    phaseLabel, sessionLabel,
    totalSeconds, remainingSeconds, isRunning,
    start, pause, reset,
    todaySessions,
    selectedArea, setSelectedArea, focusAnalytics,
  } = usePomodoro();
  const { areas } = useAreaColors();

  return (
    <div className="app-main">
      <div className="page-header">
        <h1 className="page-title">Pomodoro</h1>
        <p className="page-subtitle">Deep focus sessions with structured breaks</p>
      </div>

      <div className="pomodoro-container">
        {/* Presets */}
        <div className="preset-buttons">
          {presets.map(p => (
            <button
              key={p}
              className={`preset-btn ${presetKey === p ? 'active' : ''}`}
              onClick={() => selectPreset(p)}
            >
              {p} min
            </button>
          ))}
        </div>

        {/* Area Selector */}
        <div className="area-selector" style={{ marginTop: 24, marginBottom: -8 }}>
          {areas.map(a => (
            <button
              key={a.name}
              className={`area-pill ${selectedArea === a.name ? 'active' : ''}`}
              style={{ 
                '--color': a.color,
                '--shadow-color': `${a.color}40`,
              } as React.CSSProperties}
              onClick={() => setSelectedArea(a.name)}
            >
              {a.name.charAt(0).toUpperCase() + a.name.slice(1)}
            </button>
          ))}
        </div>


        {/* Timer Ring */}
        <TimerRing
          totalSeconds={totalSeconds}
          remainingSeconds={remainingSeconds}
          isRunning={isRunning}
          phase={phaseLabel}
          session={sessionLabel}
        />

        {/* Controls */}
        <div className="timer-controls">
          <button className="timer-btn timer-btn-reset" onClick={reset} title="Reset">
            ↺
          </button>
          {isRunning ? (
            <button className="timer-btn timer-btn-pause" onClick={pause} title="Pause">
              ❚❚
            </button>
          ) : (
            <button className="timer-btn timer-btn-start" onClick={start} title="Start">
              ▶
            </button>
          )}
        </div>

        {/* Break info */}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          {presetKey === 25 && '5 min short break · 10 min long break every 4 cycles'}
          {presetKey === 50 && '10 min short break · 20 min long break every 3 cycles'}
          {presetKey === 90 && '20 min short break · 30 min long break every 2 cycles'}
        </div>

        {/* Today's Sessions */}
        {todaySessions.length > 0 && (
          <div className="pomodoro-log" style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>Today's Sessions</div>
            {todaySessions.map((s: any, i: number) => (
              <div key={i} className="pomodoro-log-item">
                <span>✅</span>
                <span>{s.focus_min} min focus</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                  {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activity Map */}
        <FocusActivityMap analytics={focusAnalytics} />
      </div>
    </div>
  );
}
