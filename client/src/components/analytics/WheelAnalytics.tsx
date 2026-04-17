import type { WheelAxisId } from '../../types';

type WheelAxis = { id: WheelAxisId; currentScore: number; targetScore: number };

interface Props {
  axes: WheelAxis[];
}

const AXIS_LABELS: Record<string, string> = {
  body: 'Body', mind: 'Mind', soul: 'Soul',
  growth: 'Growth', money: 'Money', mission: 'Mission',
  romance: 'Romance', family: 'Family', friends: 'Friends', joy: 'Joy'
};

const AXIS_COLORS: Record<string, string> = {
  body: '#1D9E75', mind: '#3B8BD4', soul: '#7F77DD',
  growth: '#EF9F27', money: '#639922', mission: '#D85A30',
  romance: '#D4537E', family: '#1D9E75', friends: '#185fa5', joy: '#EF9F27'
};

const GROUPS = [
  { name: 'Health', axes: ['body', 'mind', 'soul'] },
  { name: 'Work', axes: ['growth', 'money', 'mission'] },
  { name: 'Relationships', axes: ['romance', 'family', 'friends'] },
  { name: 'Bonus', axes: ['joy'] }
];

export function WheelAnalytics({ axes }: Props) {
  if (axes.length === 0) {
    return (
      <div className="analytics-empty">
        <p>Set up your Wheel of Life to track balance.</p>
        <a href="/wheel" className="btn btn-ghost">Go to Wheel →</a>
      </div>
    );
  }

  const scores = axes.reduce((acc, ax) => {
    acc[ax.id] = ax.currentScore;
    return acc;
  }, {} as Record<string, number>);

  const values = Object.values(scores);
  const avg = values.reduce((s, v) => s + v, 0) / values.length || 5;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
  );
  const balance = Math.max(0, Math.round(100 - stdDev * 10));

  const sorted = [...axes].sort((a, b) => b.currentScore - a.currentScore);

  return (
    <div className="wheel-analytics">
      <div className="wheel-balance-score">
        <span className="wheel-balance-number" style={{ color: balance >= 70 ? 'var(--success)' : 'var(--warning)' }}>
          {balance}
        </span>
        <span className="wheel-balance-label">Balance Score</span>
      </div>

      <div className="wheel-group-bars">
        {GROUPS.map(group => {
          const groupScores = group.axes.map(a => scores[a] || 5);
          const groupAvg = groupScores.reduce((s, v) => s + v, 0) / groupScores.length;
          return (
            <div key={group.name} className="wheel-group-row">
              <span className="wheel-group-label">{group.name}</span>
              <div className="wheel-group-bar-container">
                <div 
                  className="wheel-group-bar" 
                  style={{ 
                    width: `${(groupAvg / 10) * 100}%`,
                    background: groupAvg >= 7 ? 'var(--success)' : groupAvg >= 4 ? 'var(--warning)' : 'var(--danger)'
                  }}
                />
              </div>
              <span className="wheel-group-value">{groupAvg.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      <div className="wheel-axis-list">
        {sorted.map((ax, i) => (
          <div key={ax.id} className="wheel-axis-row" style={{ borderLeftColor: AXIS_COLORS[ax.id] }}>
            <span className="wheel-axis-rank">#{i + 1}</span>
            <span className="wheel-axis-name" style={{ color: AXIS_COLORS[ax.id] }}>
              {AXIS_LABELS[ax.id] || ax.id}
            </span>
            <span className="wheel-axis-score">{ax.currentScore}/10</span>
          </div>
        ))}
      </div>

      <div className="wheel-insight">
        {sorted.length > 0 && (
          <p>
            Highest: <strong style={{ color: AXIS_COLORS[sorted[0].id] }}>{AXIS_LABELS[sorted[0].id] || sorted[0].id}</strong> ({sorted[0].currentScore})
            {' · '}
            Lowest: <strong style={{ color: AXIS_COLORS[sorted[sorted.length - 1].id] }}>{AXIS_LABELS[sorted[sorted.length - 1].id] || sorted[sorted.length - 1].id}</strong> ({sorted[sorted.length - 1].currentScore})
          </p>
        )}
      </div>
    </div>
  );
}