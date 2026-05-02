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
    </div>
  );
}
