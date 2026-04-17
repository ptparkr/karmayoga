import type { AreaBalanceData } from '../../lib/analytics';

interface Props {
  data: AreaBalanceData[];
  areas: string[];
  getColor: (area: string) => string;
}

export function AreaBalance({ data, areas, getColor }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="analytics-empty">
        <p>Complete focus sessions to see area balance over time.</p>
      </div>
    );
  }

  // Calculate totals for each actual area from data
  const areaTotals = areas.reduce((acc, area) => {
    acc[area] = data.reduce((sum, week) => sum + (week.data[area] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const maxTotal = Math.max(...Object.values(areaTotals), 1);

  return (
    <div className="area-balance-chart">
      <div className="area-balance-bars">
        {areas.map(area => {
          const minutes = areaTotals[area] || 0;
          const pct = (minutes / maxTotal) * 100;
          return (
            <div key={area} className="area-balance-row">
              <span className="area-balance-label">{area}</span>
              <div className="area-balance-bar-container">
                <div 
                  className="area-balance-bar" 
                  style={{ 
                    width: `${pct}%`, 
                    background: getColor(area) 
                  }}
                />
              </div>
              <span className="area-balance-value">{Math.round(minutes / 60)}h</span>
            </div>
          );
        })}
      </div>

      <div className="area-balance-timeline">
        <span className="area-balance-timeline-label">8-week trend</span>
        <div className="area-balance-mini-bars">
          {data.map((week, i) => {
            const total = areas.reduce((sum, a) => sum + (week.data[a] || 0), 0);
            return (
              <div 
                key={i} 
                className="area-balance-mini-bar" 
                style={{ 
                  height: `${Math.min(100, (total / (maxTotal * 8)) * 100)}%`,
                  background: getColor(areas[i % areas.length])
                }}
                title={`Week ${i + 1}: ${Math.round(total / 60)}h`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}