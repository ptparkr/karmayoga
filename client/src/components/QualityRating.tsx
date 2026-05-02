import { useCallback, useEffect, useState } from 'react';
import type { FocusQuality } from '../types';

interface Props {
  onRate: (quality: FocusQuality | null) => void;
  autoSubmitSeconds?: number;
}

const QUALITY_LABELS: Record<FocusQuality, string> = {
  1: 'Scattered - many interruptions',
  2: 'Distracted - some focus',
  3: 'Moderate - mostly on task',
  4: 'Deep - clear, sustained focus',
  5: 'Flow - completely absorbed',
};

export function QualityRating({ onRate, autoSubmitSeconds = 30 }: Props) {
  const [selected, setSelected] = useState<FocusQuality | null>(null);
  const [hovered, setHovered] = useState<FocusQuality | null>(null);
  const [countdown, setCountdown] = useState(autoSubmitSeconds);

  useEffect(() => {
    if (selected !== null) return;

    const timer = setInterval(() => {
      setCountdown(current => {
        if (current <= 1) {
          onRate(null);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRate, selected]);

  const handleSelect = useCallback((quality: FocusQuality) => {
    setSelected(quality);
    onRate(quality);
  }, [onRate]);

  const currentLabel = (hovered ?? selected ?? 3) as FocusQuality;
  const progress = (countdown / autoSubmitSeconds) * 100;

  return (
    <div className="quality-rating-overlay">
      <div className="quality-rating-card">
        <div className="quality-header">
          <h3>Rate Your Session</h3>
          <p>How was your focus quality?</p>
        </div>

        <div className="quality-stars">
          {([1, 2, 3, 4, 5] as FocusQuality[]).map(quality => (
            <button
              key={quality}
              className={`quality-star ${(hovered ?? selected ?? 0) >= quality ? 'filled' : ''} ${selected === quality ? 'selected' : ''}`}
              onMouseEnter={() => setHovered(quality)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleSelect(quality)}
              disabled={selected !== null}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>

        <div className="quality-label">{QUALITY_LABELS[currentLabel]}</div>

        {selected === null && (
          <div className="quality-countdown">
            <div className="countdown-bar">
              <div className="countdown-progress" style={{ width: `${progress}%` }} />
            </div>
            <span>Auto-skipping in {countdown}s</span>
          </div>
        )}

        {selected !== null && (
          <div className="quality-confirmed">
            <span>Rating saved</span>
          </div>
        )}
      </div>
    </div>
  );
}
