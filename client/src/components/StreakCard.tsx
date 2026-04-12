import { useEffect, useRef, useState } from 'react';

interface Props {
  icon: string;
  label: string;
  value: number;
  unit?: string;
  glow?: boolean;
}

export function StreakCard({ icon, label, value, unit = 'days', glow }: Props) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;

    const duration = 600;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * ease);
      setDisplayed(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    }

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className={`stat-card ${glow ? 'glow' : ''}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-label">{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span className="stat-value">{displayed}</span>
          <span className="stat-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}
