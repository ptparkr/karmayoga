import { useState } from 'react';
import { useAreaColors } from '../hooks/useAreaColors';

interface Props {
  analytics: {
    weekDays: { date: string; minutes: number }[];
  } | null;
  loading?: boolean;
}

export function FocusActivityMap({ analytics, loading }: Props) {
  const { getColor } = useAreaColors();
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');

  if (loading || !analytics) {
    return (
      <div className="card focus-activity-card" style={{ opacity: 0.6, width: '100%', maxWidth: 'none' }}>
        <div className="section-title">Activity Map</div>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</span>
        </div>
      </div>
    );
  }

  const { weekDays } = analytics;
  
  // For now, we'll use weekDays for all views but filter/repeat to show the UI switching
  // In a real app, the backend would provide specific data for each timeframe.
  const todayLocal = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
  
  const displayData = timeframe === 'daily' 
    ? (weekDays.find(d => d.date === todayLocal) ? [weekDays.find(d => d.date === todayLocal)!] : (weekDays.length > 0 ? [weekDays[weekDays.length - 1]] : []))
    : weekDays;

  const totalMinutes = displayData.reduce((sum, d) => sum + d.minutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const rangeStart = displayData.length > 0 ? new Date(displayData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const rangeEnd = displayData.length > 0 ? new Date(displayData[displayData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  const getCellColor = (mins: number) => {
    if (mins === 0) return 'var(--bg-tertiary)';
    if (mins < 60) return 'rgba(0, 255, 204, 0.1)';
    if (mins < 120) return 'rgba(0, 255, 204, 0.3)';
    if (mins < 240) return 'rgba(0, 255, 204, 0.5)';
    return 'var(--accent)';
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="card focus-activity-card animate-in" style={{ width: '100%', maxWidth: 'none', border: 'none', background: 'var(--bg-secondary)' }}>
      <div className="activity-map-header">
        <div className="activity-map-info">
          <div className="section-title" style={{ fontSize: 13, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Focus Intensity
          </div>
          <div className="focus-time-display">
            <span className="focus-time-val">{hours}h {minutes}m</span>
            <span className="focus-time-range">{timeframe} VIEW · {rangeStart} {rangeEnd !== rangeStart ? `— ${rangeEnd}` : ''}</span>
          </div>
        </div>

        <div className="timeframe-toggles">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tf) => (
            <button 
              key={tf}
              className={`toggle-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="activity-grid-weekly" style={{ 
        marginTop: 'var(--gap-lg)',
        display: 'grid',
        gridTemplateColumns: timeframe === 'daily' ? '1fr' : 'repeat(7, 1fr)',
        gap: 'var(--gap-md)'
      }}>
        {displayData.map((day, i) => {
          if (!day) return null;
          const d = new Date(day.date + 'T00:00:00'); // Force local interpretation
          const isToday = day.date === todayLocal;
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          const dateNum = d.getDate();
          const monthName = d.toLocaleDateString('en-US', { month: 'short' });

          return (
            <div 
              key={day.date} 
              className={`activity-cell ${isToday ? 'today' : ''}`}
              style={{ 
                background: day.minutes > 0 ? getCellColor(day.minutes) : 'rgba(255,255,255,0.02)',
                padding: 'var(--gap-md)',
                minHeight: timeframe === 'daily' ? 140 : 100,
                borderRadius: 'var(--radius-lg)',
                border: isToday ? '2px solid var(--accent)' : (day.minutes > 0 ? '1px solid rgba(0, 255, 204, 0.1)' : '1px solid var(--border)'),
                boxShadow: day.minutes >= 240 ? '0 0 20px rgba(0, 255, 204, 0.2)' : (isToday ? '0 0 15px var(--accent-glow)' : 'none'),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                transition: 'all 0.4s var(--ease-out)',
                position: 'relative',
                overflow: 'hidden'
              }}
              title={`${dayName}, ${monthName} ${dateNum}: ${day.minutes}m focus`}
            >
              {isToday && (
                <div style={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)'
                }} />
              )}
              <div className="cell-day-name" style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, textTransform: 'uppercase' }}>
                {dayName}
              </div>
              <div className="cell-date" style={{ fontSize: 16, fontWeight: 800, opacity: isToday ? 1 : 0.8 }}>
                {dateNum}
              </div>
              <div className="cell-month" style={{ fontSize: 10, fontWeight: 700, opacity: 0.4, textTransform: 'uppercase' }}>
                {monthName}
              </div>
              <div className="cell-mins" style={{ 
                marginTop: '8px',
                fontSize: 18, 
                fontWeight: 900, 
                color: day.minutes > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: day.minutes > 0 ? 1 : 0.3
              }}>
                {day.minutes > 0 ? `${day.minutes}m` : '—'}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="activity-legend" style={{ justifyContent: 'center', marginTop: 'var(--gap-xl)' }}>
        <div className="legend-item"><span className="legend-box" style={{ background: 'rgba(0, 255, 204, 0.1)' }} /> Low</div>
        <div className="legend-item"><span className="legend-box" style={{ background: 'rgba(0, 255, 204, 0.3)' }} /> Med</div>
        <div className="legend-item"><span className="legend-box" style={{ background: 'rgba(0, 255, 204, 0.6)' }} /> High</div>
        <div className="legend-item"><span className="legend-box" style={{ background: 'var(--accent)' }} /> Deep</div>
      </div>

      {(timeframe === 'monthly' || timeframe === 'yearly') && (
        <div style={{ 
          marginTop: 'var(--gap-lg)', 
          textAlign: 'center', 
          fontSize: 11, 
          color: 'var(--text-muted)',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border)'
        }}>
          💡 Historical trends for {timeframe} will appear as you build your practice.
        </div>
      )}
    </div>
  );
}
