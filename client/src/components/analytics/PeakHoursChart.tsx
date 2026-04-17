import type { PeakHourCell } from '../../lib/analytics';

interface Props {
  grid: PeakHourCell[][];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

function getHeatColor(minutes: number): string {
  if (minutes === 0) return 'var(--heatmap-empty)';
  if (minutes < 15) return 'var(--heatmap-1)';
  if (minutes < 30) return 'var(--heatmap-2)';
  if (minutes < 60) return 'var(--heatmap-3)';
  return 'var(--heatmap-4)';
}

export function PeakHoursChart({ grid }: Props) {
  if (!grid || grid.length === 0) {
    return (
      <div className="analytics-empty">
        <p>Complete focus sessions to see your peak hours.</p>
      </div>
    );
  }

  // Find peak hour
  let maxMin = 0;
  let peakDay = 0;
  let peakHour = 0;
  
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d]?.[h]?.avgMinutes > maxMin) {
        maxMin = grid[d][h].avgMinutes;
        peakDay = d;
        peakHour = h;
      }
    }
  }

  const formatHour = (h: number) => {
    if (h === 0) return '12a';
    if (h < 12) return `${h}a`;
    if (h === 12) return '12p';
    return `${h - 12}p`;
  };

  return (
    <div className="peak-hours-chart">
      <div className="peak-hours-summary">
        {maxMin > 0 ? (
          <p>
            Your peak focus time is <strong>{DAY_LABELS[peakDay]}s at {formatHour(peakHour)}</strong> 
            ({maxMin} min avg)
          </p>
        ) : (
          <p>No data yet</p>
        )}
      </div>

      <div className="peak-hours-grid">
        {/* Hour labels */}
        <div className="peak-hours-hours">
          {HOUR_LABELS.map((label, i) => (
            <span key={i} className="peak-hours-label">{label}</span>
          ))}
        </div>

        {/* Grid */}
        <div className="peak-hours-days">
          {DAY_LABELS.map((day, dayIdx) => (
            <div key={day} className="peak-hours-row">
              <span className="peak-hours-day-label">{day}</span>
              {[0, 3, 6, 9, 12, 15, 18, 21].map(h => {
                const cell = grid[dayIdx]?.[h];
                const mins = cell?.avgMinutes || 0;
                return (
                  <div
                    key={h}
                    className="peak-hours-cell"
                    style={{ background: getHeatColor(mins) }}
                    title={`${day} ${formatHour(h)}: ${mins} min`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="peak-hours-legend">
        <span>Less</span>
        <div className="peak-hours-legend-scale">
          {['var(--heatmap-empty)', 'var(--heatmap-1)', 'var(--heatmap-2)', 'var(--heatmap-3)', 'var(--heatmap-4)'].map((c, i) => (
            <div key={i} className="peak-hours-legend-cell" style={{ background: c }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}