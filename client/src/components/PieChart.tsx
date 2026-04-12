interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  size?: number;
  label?: string;
}

export function PieChart({ segments, size = 160, label }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <div className="pie-chart-container">
        <svg width={size} height={size} viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="60" fill="none" stroke="var(--bg-tertiary)" strokeWidth="20" />
          <text x="80" y="76" textAnchor="middle" fill="var(--text-muted)" fontSize="20" fontWeight="700">0%</text>
          <text x="80" y="94" textAnchor="middle" fill="var(--text-muted)" fontSize="10">{label || 'No data'}</text>
        </svg>
      </div>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const arcs = segments.filter(s => s.value > 0).map(s => {
    const fraction = s.value / total;
    const dashLength = fraction * circumference;
    const dashOffset = -cumulativeOffset;
    cumulativeOffset += dashLength;
    return { ...s, dashLength, dashOffset, fraction };
  });

  const mainPercentage = total > 0
    ? Math.round((segments[0]?.value || 0) / total * 100)
    : 0;

  return (
    <div className="pie-chart-container">
      <svg width={size} height={size} viewBox="0 0 160 160" className="pie-chart-svg">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth="20" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx="80" cy="80" r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="20"
            strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
            strokeDashoffset={arc.dashOffset}
            style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke-dashoffset 0.6s ease-out' }}
          />
        ))}
        <text
          x="80" y="76"
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="24"
          fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: '80px 80px' }}
        >
          {mainPercentage}%
        </text>
        {label && (
          <text
            x="80" y="96"
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize="10"
            fontWeight="500"
            style={{ transform: 'rotate(90deg)', transformOrigin: '80px 80px' }}
          >
            {label}
          </text>
        )}
      </svg>
      <div className="pie-legend">
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} className="pie-legend-item">
            <div className="pie-legend-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
