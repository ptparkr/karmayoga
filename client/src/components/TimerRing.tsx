import { useAreaColors } from '../hooks/useAreaColors';
import { Phase } from '../hooks/usePomodoro';

interface Props {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  phase: Phase;
  phaseLabel: string;
  session: string;
  selectedArea: string;
}

export function TimerRing({ 
  totalSeconds, 
  remainingSeconds, 
  isRunning, 
  phase, 
  phaseLabel,
  session, 
  selectedArea 
}: Props) {
  const { getColor } = useAreaColors();
  
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = circumference * (1 - progress);

  // Determine stroke color based on phase and area
  const strokeColor = phase === 'focus' 
    ? getColor(selectedArea) 
    : phase === 'idle' 
      ? 'var(--text-muted)' 
      : 'var(--accent)'; // Electric mint for breaks

  // Helper to format time MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timeStr = formatTime(remainingSeconds);

  return (
    <div className="timer-ring-container animate-in">
      <svg className="timer-ring-svg" viewBox="0 0 280 280">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Background Track */}
        <circle 
          className="timer-ring-bg" 
          cx="140" cy="140" r={radius} 
          style={{ stroke: 'rgba(255, 255, 255, 0.02)', strokeWidth: 10 }}
        />
        
        {/* Outer subtle glow ring */}
        <circle
          cx="140" cy="140" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeOpacity="0.04"
          style={{ transition: 'stroke 0.6s ease' }}
        />

        {/* Main Progress Ring */}
        <circle
          className="timer-ring-progress"
          cx="140" cy="140" r={radius}
          stroke="url(#progressGradient)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={isRunning ? "url(#glow)" : "none"}
          style={{ 
            transition: isRunning ? 'stroke-dashoffset 1s linear, stroke 0.6s ease' : 'stroke-dashoffset 0.3s ease-out, stroke 0.6s ease',
          }}
        />
      </svg>
      
      <div className="timer-center">
        <div className="timer-time-container">
          <div className="timer-time" style={{ 
            color: isRunning ? '#fff' : 'var(--text-secondary)',
            textShadow: isRunning ? `0 0 40px ${strokeColor}80, 0 0 10px ${strokeColor}40` : 'none',
            transition: 'all 0.5s var(--ease-out)'
          }}>
            {timeStr}
          </div>
        </div>
        <div className="timer-phase" style={{ 
          color: strokeColor,
          textShadow: `0 0 15px ${strokeColor}50`,
          transition: 'all 0.6s ease',
          letterSpacing: '0.1em',
          fontWeight: 800
        }}>
          {phaseLabel}
        </div>
        <div className="timer-session">{session}</div>
      </div>
    </div>
  );
}
