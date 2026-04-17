import { api } from '../lib/api';
import { useAreaColors } from '../hooks/useAreaColors';
import type { PomodoroSession } from '../types';

interface Props {
  sessions: PomodoroSession[];
}

export function SessionLog({ sessions }: Props) {
  const { getColor } = useAreaColors();

  if (sessions.length === 0) {
    return (
      <div className="session-log-empty">
        <div className="empty-icon">No sessions yet</div>
      </div>
    );
  }

  const formatTime = (datetime: string) => {
    const d = new Date(datetime);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getQualityLabel = (quality: number | null | undefined) => {
    if (quality == null) return null;
    const labels: Record<number, string> = {
      1: 'Scattered',
      2: 'Distracted',
      3: 'Moderate',
      4: 'Deep',
      5: 'Flow',
    };
    return labels[quality] || null;
  };

  return (
    <div className="session-log">
      <div className="session-timeline">
        {sessions.map((session, i) => {
          const areaColor = getColor(session.area || 'other');
          const qualityLabel = getQualityLabel(session.quality);
          
          return (
            <div key={`${session.created_at}-${i}`} className="session-item">
              <div className="session-dot" style={{ background: areaColor, boxShadow: `0 0 8px ${areaColor}` }} />
              <div className="session-content">
                <div className="session-header">
                  <span className="session-time">{formatTime(session.created_at)}</span>
                  <span className="session-duration">{session.focus_min} min</span>
                  {session.area !== 'other' && (
                    <span className="session-area" style={{ color: areaColor }}>{session.area}</span>
                  )}
                </div>
                {session.intention && (
                  <div className="session-intention">{session.intention}</div>
                )}
                {qualityLabel && (
                  <div className="session-quality">
                    <span className="quality-badge">{qualityLabel}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .session-log {
          width: 100%;
        }
        .session-log-empty {
          padding: var(--gap-lg);
          text-align: center;
          color: var(--text-muted);
        }
        .session-timeline {
          display: flex;
          flex-direction: column;
          gap: var(--gap-sm);
        }
        .session-item {
          display: flex;
          align-items: flex-start;
          gap: var(--gap-md);
          padding: var(--gap-sm);
          border-radius: var(--radius-md);
          background: var(--bg-tertiary);
          transition: all 0.2s ease;
        }
        .session-item:hover {
          background: var(--bg-secondary);
        }
        .session-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 6px;
        }
        .session-content {
          flex: 1;
          min-width: 0;
        }
        .session-header {
          display: flex;
          align-items: center;
          gap: var(--gap-sm);
          flex-wrap: wrap;
        }
        .session-time {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .session-duration {
          font-size: 14px;
          font-weight: 700;
        }
        .session-area {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .session-intention {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .session-quality {
          margin-top: 6px;
        }
        .quality-badge {
          display: inline-block;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: var(--radius-sm);
          background: var(--accent);
          color: var(--bg-primary);
        }
      `}</style>
    </div>
  );
}