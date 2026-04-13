import { useAreaColors } from '../hooks/useAreaColors';

interface Props {
  analytics: {
    weekDays: { date: string; minutes: number }[];
  } | null;
  loading?: boolean;
}

export function FocusActivityMap({ analytics, loading }: Props) {
  const { getColor } = useAreaColors();

  if (loading || !analytics) {
    return (
      <div className="card focus-activity-card" style={{ opacity: 0.6 }}>
        <div className="section-title">Activity Map</div>
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</span>
        </div>
      </div>
    );
  }

  const { weekDays } = analytics;
  const totalMinutes = weekDays.reduce((sum, d) => sum + d.minutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const rangeStart = new Date(weekDays[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const rangeEnd = new Date(weekDays[weekDays.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Threshold logic
  const getCellColor = (mins: number) => {
    if (mins === 0) return 'var(--bg-tertiary)';
    if (mins < 120) return '#442222'; // LOW (Dark Red/Brown)
    if (mins < 240) return '#d29922'; // 2H+ (Orange/Yellow)
    if (mins < 360) return '#3fb950'; // 4H+ (Light Green)
    return '#238636';                 // 6H+ (Bright Green)
  };

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="card focus-activity-card">
      <div className="activity-map-header">
        <div className="activity-map-info">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📅</span> Activity Map
          </div>
          <div className="focus-time-display">
            <span className="focus-time-val">{hours}h {minutes}m</span>
            <span className="focus-time-range">{rangeStart} - {rangeEnd}</span>
          </div>
          <div className="activity-legend">
            <div className="legend-item"><span className="legend-box" style={{ background: '#442222' }} /> LOW</div>
            <div className="legend-item"><span className="legend-box" style={{ background: '#d29922' }} /> 2H+</div>
            <div className="legend-item"><span className="legend-box" style={{ background: '#3fb950' }} /> 4H+</div>
            <div className="legend-item"><span className="legend-box" style={{ background: '#238636' }} /> 6H+</div>
          </div>
        </div>

        <div className="timeframe-toggles">
          <button className="toggle-btn">DAILY</button>
          <button className="toggle-btn active">WEEKLY</button>
          <button className="toggle-btn">MONTHLY</button>
          <button className="toggle-btn">YEARLY</button>
        </div>
      </div>

      <div className="activity-grid-weekly">
        {weekDays.map((day, i) => (
          <div 
            key={day.date} 
            className="activity-cell" 
            style={{ 
              background: getCellColor(day.minutes),
              border: day.minutes > 0 ? 'none' : '1px solid var(--border-subtle)',
              boxShadow: day.minutes >= 360 ? '0 0 15px #23863640' : 'none'
            }}
          >
            <div className="cell-day">{dayNames[i]}</div>
            <div className="cell-mins">{day.minutes > 0 ? `${day.minutes}m` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
