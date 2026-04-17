import type { CorrelationPoint } from '../../lib/analytics';

interface Props {
  data: CorrelationPoint[];
  regression: { slope: number; intercept: number };
  hasData: boolean;
}

export function SleepFocusCorrelation({ data, regression, hasData }: Props) {
  if (!hasData || data.length < 2) {
    return (
      <div className="analytics-empty">
        <p>Log sleep and focus data to see correlations.</p>
        <a href="/health" className="btn btn-ghost">Log Health →</a>
      </div>
    );
  }

  // Calculate correlation coefficient (simplified)
  const n = data.length;
  const avgSleep = data.reduce((s, p) => s + p.sleepHours, 0) / n;
  const avgFocus = data.reduce((s, p) => s + p.avgFocusMinutes, 0) / n;
  
  let num = 0, denSleep = 0, denFocus = 0;
  for (const p of data) {
    num += (p.sleepHours - avgSleep) * (p.avgFocusMinutes - avgFocus);
    denSleep += Math.pow(p.sleepHours - avgSleep, 2);
    denFocus += Math.pow(p.avgFocusMinutes - avgFocus, 2);
  }
  
  const correlation = denSleep > 0 && denFocus > 0 
    ? Math.round((num / Math.sqrt(denSleep * denFocus)) * 100) / 100 
    : 0;

  const strength = Math.abs(correlation);
  const direction = correlation > 0 ? 'positive' : 'negative';
  const strengthLabel = strength >= 0.7 ? 'strong' : strength >= 0.4 ? 'moderate' : 'weak';

  // Build scatter points
  const width = 280;
  const height = 180;
  const padding = 30;
  
  const points = data.map(p => {
    const x = padding + ((p.sleepHours - 4) / 6) * (width - padding * 2);
    const y = height - padding - (p.avgFocusMinutes / 120) * (height - padding * 2);
    return `(${x},${y})`;
  }).join(' ');

  // Regression line
  const lineStart = 4;
  const lineEnd = 10;
  const y1 = regression.slope * lineStart + regression.intercept;
  const y2 = regression.slope * lineEnd + regression.intercept;
  
  const lineX1 = padding;
  const lineX2 = width - padding;
  const lineY1 = height - padding - (Math.max(0, y1) / 120) * (height - padding * 2);
  const lineY2 = height - padding - (Math.max(0, y2) / 120) * (height - padding * 2);

  return (
    <div className="sleep-focus-correlation">
      <div className="correlation-stats">
        <div className="correlation-value" style={{ color: strength >= 0.4 ? 'var(--success)' : 'var(--text-muted)' }}>
          {Math.abs(correlation) > 0.3 ? `${correlation > 0 ? '+' : ''}${correlation}` : '~0'}
        </div>
        <div className="correlation-label">
          {strength >= 0.3 ? (
            <>Your sleep and focus have a <strong>{strengthLabel} {direction}</strong> correlation.</>
          ) : (
            <>No clear pattern yet.</>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="correlation-scatter">
        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border)" />
        
        {/* Labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
          Sleep (hours)
        </text>
        <text x={10} y={height / 2} textAnchor="middle" fill="var(--text-muted)" fontSize="10" transform={`rotate(-90, 10, ${height / 2})`}>
          Focus (min)
        </text>
        
        {/* Points */}
        <g fill="var(--accent)">
          {data.map((p, i) => {
            const x = padding + ((p.sleepHours - 4) / 6) * (width - padding * 2);
            const y = height - padding - (p.avgFocusMinutes / 120) * (height - padding * 2);
            return <circle key={i} cx={x} cy={y} r="4" opacity="0.7" />;
          })}
        </g>
        
        {/* Regression line */}
        {regression.slope !== 0 && (
          <line
            x1={lineX1}
            y1={lineY1}
            x2={lineX2}
            y2={lineY2}
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeDasharray="4 2"
            opacity="0.6"
          />
        )}
      </svg>

      <div className="correlation-insight">
        {correlation > 0.3 ? (
          <p>Every extra hour of sleep adds ~{Math.round(regression.slope)} min of focused work.</p>
        ) : correlation < -0.3 ? (
          <p>Focus seems to decrease with more sleep. Check data quality.</p>
        ) : (
          <p>Keep logging sleep and focus to find your personal patterns.</p>
        )}
      </div>
    </div>
  );
}