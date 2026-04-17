import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { FocusAnalytics, FocusDay, Timeframe } from '../types';

interface Props {
  analytics: FocusAnalytics | null;
  loading?: boolean;
}

export function FocusActivityMap({ analytics, loading }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');
  const [currentOffset, setCurrentOffset] = useState(0);
  const [displayData, setDisplayData] = useState<FocusDay[]>(analytics?.weekDays ?? []);

  const getDateRange = useCallback((offset: number) => {
    const today = new Date();
    let start: Date;
    let end: Date;
    let days: number;

    if (timeframe === 'daily') {
      start = new Date(today);
      start.setDate(start.getDate() + offset);
      end = new Date(start);
      days = 1;
    } else if (timeframe === 'weekly') {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(today);
      start.setDate(start.getDate() + mondayOffset + offset * 7);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      days = 7;
    } else if (timeframe === 'monthly') {
      start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
      days = end.getDate();
    } else {
      start = new Date(today.getFullYear() + offset, 0, 1);
      end = new Date(today.getFullYear() + offset, 11, 31);
      days = 366;
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    return { start: formatDate(start), end: formatDate(end), days };
  }, [timeframe]);

  const fetchData = useCallback(async (offset: number) => {
    try {
      const { start, end } = getDateRange(offset);
      const data = await api.getFocusAnalytics(start, end);
      setDisplayData(data.weekDays || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchData(currentOffset);
  }, [currentOffset, fetchData]);

  useEffect(() => {
    if (timeframe === 'weekly' && currentOffset === 0 && analytics?.weekDays?.length) {
      setDisplayData(analytics.weekDays);
    }
  }, [analytics, currentOffset, timeframe]);

  const handlePrev = () => setCurrentOffset(prev => prev - 1);
  const handleNext = () => setCurrentOffset(prev => prev + 1);

  const getDateLabel = () => {
    if (displayData.length === 0) return '';

    const firstDate = new Date(`${displayData[0].date}T00:00:00`);
    const lastDate = new Date(`${displayData[displayData.length - 1].date}T00:00:00`);

    if (timeframe === 'daily') {
      return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (timeframe === 'weekly') {
      if (firstDate.getMonth() === lastDate.getMonth()) {
        return firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      return `${firstDate.toLocaleDateString('en-US', { month: 'short' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }

    if (timeframe === 'monthly') {
      return firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    return firstDate.getFullYear().toString();
  };

  if (loading || !analytics) {
    return (
      <div className="card focus-activity-card" style={{ opacity: 0.6, width: '100%', maxWidth: 'none' }}>
        <div className="section-title">Activity Map</div>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>...</span>
        </div>
      </div>
    );
  }

  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const totalMinutes = displayData.reduce((sum, day) => sum + day.minutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const getCellColor = (mins: number) => {
    if (mins === 0) return 'var(--bg-tertiary)';
    if (mins < 60) return 'rgba(0, 255, 204, 0.1)';
    if (mins < 120) return 'rgba(0, 255, 204, 0.3)';
    if (mins < 240) return 'rgba(0, 255, 204, 0.5)';
    return 'var(--accent)';
  };

  return (
    <div className="card focus-activity-card animate-in" style={{ width: '100%', maxWidth: 'none', border: 'none', background: 'var(--bg-secondary)' }}>
      <div className="activity-map-header">
        <div className="activity-map-info">
          <div className="section-title" style={{ fontSize: 13, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Focus Intensity
          </div>
          <div className="focus-time-display">
            <span className="focus-time-val">{hours}h {minutes}m</span>
            <span className="focus-time-range">{timeframe} view · {getDateLabel()}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <button className="toggle-btn" onClick={handlePrev}>&lt;</button>
          <div className="timeframe-toggles">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(tf => (
              <button
                key={tf}
                className={`toggle-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => {
                  setCurrentOffset(0);
                  setTimeframe(tf);
                }}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="toggle-btn" onClick={handleNext}>&gt;</button>
        </div>
      </div>

      <div
        className="activity-grid-weekly"
        style={{
          marginTop: 'var(--gap-lg)',
          display: 'grid',
          gridTemplateColumns: timeframe === 'daily' ? '1fr' : 'repeat(7, 1fr)',
          gap: 'var(--gap-md)',
        }}
      >
        {displayData.map(day => {
          const date = new Date(`${day.date}T00:00:00`);
          const isToday = day.date === todayLocal;
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dateNum = date.getDate();
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });

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
                boxShadow: day.minutes >= 240 ? '0 0 20px rgba(0, 255, 204, 0.2)' : (isToday ? '0 0 15px rgba(0, 255, 204, 0.35)' : 'none'),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                transition: 'all 0.4s var(--ease-out)',
                position: 'relative',
                overflow: 'hidden',
              }}
              title={`${dayName}, ${monthName} ${dateNum}: ${day.minutes}m focus`}
            >
              {isToday && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 8px var(--accent)',
                  }}
                />
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
              <div
                className="cell-mins"
                style={{
                  marginTop: '8px',
                  fontSize: 18,
                  fontWeight: 900,
                  color: day.minutes > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  opacity: day.minutes > 0 ? 1 : 0.3,
                }}
              >
                {day.minutes > 0 ? `${day.minutes}m` : '--'}
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
        <div
          style={{
            marginTop: 'var(--gap-lg)',
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border)',
          }}
        >
          Historical trends for {timeframe} will appear as you build your practice.
        </div>
      )}
    </div>
  );
}
