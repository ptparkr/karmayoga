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

  // Color based on remaining time
  const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  let strokeColor = 'var(--heat-3)'; // green
  if (ratio < 0.25) strokeColor = 'var(--danger)'; // red
  else if (ratio < 0.5) strokeColor = 'var(--warning)'; // yellow

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="timer-ring-container">
      <svg className="timer-ring-svg" viewBox="0 0 280 280">
        <circle className="timer-ring-bg" cx="140" cy="140" r={radius} />
        <circle
          className="timer-ring-progress"
          cx="140" cy="140" r={radius}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="timer-center">
        <div className="timer-time" style={{ color: isRunning ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {timeStr}
        </div>
        <div className="timer-phase">{phase}</div>
        <div className="timer-session">{session}</div>
      </div>
    </div>
  );
}
