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
    todaySessions,
    selectedArea, setSelectedArea, focusAnalytics,
  } = usePomodoro();
  const { areas, getColor } = useAreaColors();

  return (
    <div className="app-main">
      <div className="page-header">
        <h1 className="page-title">Pomodoro</h1>
        <p className="page-subtitle">Deep focus sessions with structured breaks</p>
      </div>

      <div className="pomodoro-container">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 'var(--gap-xl)', 
          maxWidth: 500, 
          margin: '0 auto', 
          width: '100%',
          textAlign: 'center'
        }}>
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
          <div className="area-selector" style={{ marginTop: 'var(--gap-sm)', marginBottom: -8 }}>
            {areas.map(a => {
              const color = getColor(a);
              return (
                <button
                  key={a}
                  className={`area-pill ${selectedArea === a ? 'active' : ''}`}
                  style={{ 
                    '--color': color,
                    '--shadow-color': `${color}40`,
                  } as React.CSSProperties}
                  onClick={() => setSelectedArea(a)}
                >
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              );
            })}
          </div>

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
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {presetKey === 25 && '5 min short break · 10 min long break every 4 cycles'}
            {presetKey === 50 && '10 min short break · 20 min long break every 3 cycles'}
            {presetKey === 90 && '20 min short break · 30 min long break every 2 cycles'}
          </div>

          {/* Today's Sessions */}
          {todaySessions.length > 0 && (
            <div className="pomodoro-log" style={{ marginTop: 'var(--gap-md)', width: '100%' }}>
              <div className="section-title" style={{ marginBottom: 'var(--gap-sm)', justifyContent: 'center' }}>Today's Sessions</div>
              <div className="card" style={{ padding: 'var(--gap-md)', background: 'rgba(255,255,255,0.02)' }}>
                {todaySessions.map((s: any, i: number) => (
                  <div key={i} className="pomodoro-log-item">
                    <span>✅</span>
                    <span style={{ fontWeight: 600 }}>{s.focus_min} min focus</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>
                      {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity Map - Full Width */}
        <div style={{ marginTop: 'var(--gap-xl)' }}>
          <FocusActivityMap analytics={focusAnalytics} />
        </div>
      </div>
    </div>
  );
}
