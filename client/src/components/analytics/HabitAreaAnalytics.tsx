import type { AreaSummary } from '../../types';

interface Props {
  areas: AreaSummary[];
  getColor: (area: string) => string;
}

export function HabitAreaAnalytics({ areas, getColor }: Props) {
  if (areas.length === 0) {
    return (
      <div className="analytics-empty">
        <p>Create habits to track area completion rates.</p>
        <a href="/habits" className="btn btn-ghost">Go to Habits →</a>
      </div>
    );
  }

  const sorted = [...areas].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="habit-area-analytics">
      <div className="habit-area-bars">
        {sorted.map(area => {
          const pct = area.percentage;
          const color = getColor(area.area);
          return (
            <div key={area.area} className="habit-area-row">
              <span className="habit-area-label" style={{ color }}>{area.area}</span>
              <div className="habit-area-bar-container">
                <div 
                  className="habit-area-bar" 
                  style={{ 
                    width: `${pct}%`,
                    background: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'
                  }}
                />
              </div>
              <span className="habit-area-value">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="habit-area-summary">
        {sorted.length > 0 && (
          <p>
            Best: <strong style={{ color: getColor(sorted[0].area) }}>{sorted[0].area}</strong> 
            ({sorted[0].percentage}%)
            {' · '}
            Needs work: <strong style={{ color: getColor(sorted[sorted.length - 1].area) }}>{sorted[sorted.length - 1].area}</strong>
            ({sorted[sorted.length - 1].percentage}%)
          </p>
        )}
      </div>
    </div>
  );
}