interface Props {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  phase: string;
  session: string;
}

export function TimerRing({ totalSeconds, remainingSeconds, isRunning, phase, session }: Props) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="timer-ring-container">
      <svg className="timer-ring-svg" viewBox="0 0 280 280" style={{ filter: isRunning ? `drop-shadow(0 0 12px ${strokeColor}40)` : 'none' }}>
        <circle className="timer-ring-bg" cx="140" cy="140" r={radius} />
        <circle
          className="timer-ring-progress"
          cx="140" cy="140" r={radius}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ 
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
            filter: `drop-shadow(0 0 8px ${strokeColor})`
          }}
        />
      </svg>
      <div className="timer-center">
        <div className="timer-time" style={{ 
          color: isRunning ? 'var(--text-primary)' : 'var(--text-secondary)',
          textShadow: isRunning ? `0 0 20px ${strokeColor}40` : 'none'
        }}>
          {timeStr}
        </div>
        <div className="timer-phase" style={{ color: strokeColor }}>{phase}</div>
        <div className="timer-session">{session}</div>
      </div>
    </div>
  );
}
