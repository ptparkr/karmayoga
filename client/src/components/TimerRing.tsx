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
            <stop offset="60%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.6" />
          </linearGradient>
          
          <filter id="glow-heavy" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feFlood floodColor={strokeColor} floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Background Track with subtle depth */}
        <circle 
          className="timer-ring-bg" 
          cx="140" cy="140" r={radius} 
          style={{ 
            stroke: 'rgba(255, 255, 255, 0.03)', 
            strokeWidth: 12,
            filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))'
          }}
        />
        
        {/* Ambient glow ring */}
        <circle
          cx="140" cy="140" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="20"
          strokeOpacity={isRunning ? "0.08" : "0.02"}
          style={{ transition: 'all 1s var(--ease-out)' }}
          filter={isRunning ? "url(#neon-glow)" : "none"}
        />

        {/* Main Progress Ring */}
        <circle
          className="timer-ring-progress"
          cx="140" cy="140" r={radius}
          stroke="url(#progressGradient)"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={isRunning ? "url(#glow-heavy)" : "none"}
          style={{ 
            transition: isRunning ? 'stroke-dashoffset 1s linear, stroke 0.6s ease' : 'stroke-dashoffset 0.6s var(--ease-out), stroke 0.6s ease',
          }}
        />
      </svg>
      
      <div className="timer-center">
        <div className="timer-time-container">
          <div className="timer-time" style={{ 
            color: isRunning ? '#fff' : 'var(--text-secondary)',
            fontSize: '56px',
            textShadow: isRunning 
              ? `0 0 30px ${strokeColor}aa, 0 0 60px ${strokeColor}44` 
              : 'none',
            transition: 'all 0.8s var(--ease-out)'
          }}>
            {timeStr}
          </div>
        </div>
        <div className="timer-phase" style={{ 
          color: strokeColor,
          textShadow: `0 0 10px ${strokeColor}80`,
          transition: 'all 0.6s ease',
          letterSpacing: '0.2em',
          fontWeight: 900,
          marginTop: '4px'
        }}>
          {phaseLabel}
        </div>
        <div className="timer-session" style={{ 
          marginTop: '8px', 
          opacity: 0.6,
          fontWeight: 600,
          letterSpacing: '0.05em'
        }}>{session}</div>
      </div>
    </div>
  );
}
