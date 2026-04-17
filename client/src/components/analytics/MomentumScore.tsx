import type { MomentumDataPoint } from '../../lib/analytics';

interface Props {
  data: MomentumDataPoint[];
}

export function MomentumScore({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="analytics-empty">
        <p>Complete focus sessions to see momentum trends.</p>
        <a href="/pomodoro" className="btn btn-ghost">Start Focusing →</a>
      </div>
    );
  }

  const latest = data[data.length - 1]?.score || 0;
  const weekAgo = data[Math.max(0, data.length - 7)]?.score || 0;
  const delta = latest - weekAgo;
  const trend = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';

  // Build mini sparkline SVG
  const width = 300;
  const height = 60;
  const padding = 4;
  const maxVal = 100;
  
  const points = data.slice(-14).map((d, i) => {
    const x = padding + (i / 13) * (width - padding * 2);
    const y = height - padding - (d.score / maxVal) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="momentum-chart">
      <div className="momentum-current">
        <span className="momentum-number" style={{ color: latest >= 50 ? 'var(--success)' : latest >= 30 ? 'var(--warning)' : 'var(--danger)' }}>
          {latest}
        </span>
        <span className="momentum-trend" style={{ color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
          {trend} {Math.abs(delta)}
        </span>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="momentum-sparkline">
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle
          cx={width - padding}
          cy={height - padding - (latest / maxVal) * (height - padding * 2)}
          r="4"
          fill="var(--accent)"
        />
      </svg>
      
      <div className="momentum-labels">
        <span>14 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}