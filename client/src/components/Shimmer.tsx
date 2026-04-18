import type { CSSProperties, ReactNode } from 'react';

interface ShimmerProps {
  children?: ReactNode;
  style?: CSSProperties;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Shimmer({ children, style, width = '100%', height = 20, borderRadius = 8, className = '' }: ShimmerProps) {
  return (
    <div
      className={`shimmer-container ${className}`}
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg-secondary)',
        ...style,
      }}
    >
      <div className="shimmer-gradient" />
      {children}
    </div>
  );
}

interface StatCardShimmerProps {
  glow?: boolean;
}

export function StatCardShimmer({ glow }: StatCardShimmerProps) {
  return (
    <div className={`stat-card shimmer-card ${glow ? 'glow' : ''}`}>
      <div className="shimmer-icon">
        <Shimmer width={48} height={48} borderRadius={12} />
      </div>
      <div className="shimmer-stat-content">
        <Shimmer width={60} height={12} />
        <Shimmer width={80} height={36} />
      </div>
    </div>
  );
}

export function DashboardShimmer() {
  return (
    <div className="app-main">
      <div className="page-header">
        <Shimmer width={180} height={40} borderRadius={8} />
        <Shimmer width={320} height={20} style={{ marginTop: 8 }} />
      </div>
      <div className="stat-row">
        <StatCardShimmer glow />
        <StatCardShimmer />
        <StatCardShimmer />
        <StatCardShimmer />
      </div>
    </div>
  );
}

export function PomodoroShimmer() {
  return (
    <div className="app-main">
      <div className="page-header">
        <Shimmer width={160} height={40} borderRadius={8} />
        <Shimmer width={280} height={20} style={{ marginTop: 8 }} />
      </div>
      <div className="pomodoro-grid">
        <div className="pomodoro-main-area">
          <div className="preset-buttons">
            {[25, 50, 90].map(m => (
              <Shimmer key={m} width={50} height={36} borderRadius={20} />
            ))}
          </div>
          <Shimmer width={280} height={280} borderRadius="50%" className="shimmer-timer-ring" />
          <div className="timer-controls">
            <Shimmer width={64} height={64} borderRadius={20} />
            <Shimmer width={64} height={64} borderRadius={20} />
            <Shimmer width={48} height={48} borderRadius={16} />
          </div>
        </div>
        <div className="pomodoro-stats-area">
          <Shimmer width="100%" height={200} borderRadius={20} />
          <Shimmer width="100%" height={150} borderRadius={20} />
        </div>
      </div>
    </div>
  );
}

export function HabitCardShimmer() {
  return (
    <div className="habit-card">
      <Shimmer width={28} height={28} borderRadius={8} />
      <Shimmer width="60%" height={20} />
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <Shimmer width={50} height={12} borderRadius={12} />
        <Shimmer width={60} height={12} borderRadius={12} />
      </div>
    </div>
  );
}

export function WeeklyGridShimmer() {
  return (
    <div className="card">
      <div className="section-header">
        <Shimmer width={140} height={20} />
        <Shimmer width={80} height={32} borderRadius={16} />
      </div>
      <div className="weekly-grid-shell">
        <table className="weekly-grid">
          <tbody>
            {[1, 2, 3, 4].map(i => (
              <tr key={i}>
                <td><Shimmer width={100} height={16} /></td>
                {[1, 2, 3, 4, 5, 6, 7].map(j => (
                  <td key={j}><Shimmer width={20} height={20} borderRadius={10} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TargetCardShimmer() {
  return (
    <div className="target-card">
      <div className="target-card-top">
        <Shimmer width="40%" height={24} borderRadius={4} />
        <Shimmer width={60} height={20} borderRadius={10} />
      </div>
      <Shimmer width="70%" height={34} style={{ marginTop: 8 }} />
      <Shimmer width="50%" height={14} style={{ marginTop: 8 }} />
    </div>
  );
}

<style>{`
  .shimmer-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .shimmer-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 20%,
      rgba(255, 255, 255, 0.08) 40%,
      rgba(255, 255, 255, 0.04) 60%,
      transparent 100%
    );
    animation: shimmer-sweep 1.8s ease-in-out infinite;
  }

  .shimmer-card {
    transition: all var(--duration-normal) var(--ease-out);
  }
  
  .shimmer-card.glow {
    border-color: rgba(0, 255, 204, 0.25);
    box-shadow: 0 0 20px rgba(0, 255, 204, 0.1);
  }
  
  .shimmer-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .shimmer-stat-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shimmer-timer-ring {
    margin: var(--gap-xl) 0;
  }

  @keyframes shimmer-sweep {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`}</style>