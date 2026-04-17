import { useState, useEffect, useCallback } from 'react';
import type { FocusQuality } from '../types';

interface Props {
  onRate: (quality: FocusQuality) => void;
  autoSubmitSeconds?: number;
}

const QUALITY_LABELS: Record<FocusQuality, string> = {
  1: 'Scattered — many interruptions',
  2: 'Distracted — some focus',
  3: 'Moderate — mostly on task',
  4: 'Deep — clear, sustained focus',
  5: 'Flow — completely absorbed',
};

export function QualityRating({ onRate, autoSubmitSeconds = 30 }: Props) {
  const [selected, setSelected] = useState<FocusQuality | null>(null);
  const [hovered, setHovered] = useState<FocusQuality | null>(null);
  const [countdown, setCountdown] = useState(autoSubmitSeconds);

  useEffect(() => {
    if (selected !== null) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRate(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selected, onRate]);

  const handleSelect = useCallback((q: FocusQuality) => {
    setSelected(q);
    onRate(q);
  }, [onRate]);

  const currentLabel = (hovered ?? selected ?? 3) as FocusQuality;
  const label = QUALITY_LABELS[currentLabel];
  const progress = (countdown / autoSubmitSeconds) * 100;

  return (
    <div className="quality-rating-overlay">
      <div className="quality-rating-card">
        <div className="quality-header">
          <h3>Rate Your Session</h3>
          <p>How was your focus quality?</p>
        </div>

        <div className="quality-stars">
          {([1, 2, 3, 4, 5] as FocusQuality[]).map((q) => (
            <button
              key={q}
              className={`quality-star ${(hovered ?? selected ?? 0) >= q ? 'filled' : ''} ${selected === q ? 'selected' : ''}`}
              onMouseEnter={() => setHovered(q)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleSelect(q)}
              disabled={selected !== null}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>

        <div className="quality-label">{label}</div>

        {selected === null && (
          <div className="quality-countdown">
            <div className="countdown-bar">
              <div className="countdown-progress" style={{ width: `${progress}%` }} />
            </div>
            <span>Auto-selecting in {countdown}s</span>
          </div>
        )}

        {selected !== null && (
          <div className="quality-confirmed">
            <span>Rating saved</span>
          </div>
        )}
      </div>

      <style>{`
        .quality-rating-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        .quality-rating-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--gap-xl);
          text-align: center;
          min-width: 320px;
          animation: slideUp 0.4s var(--ease-out);
        }
        .quality-header h3 {
          margin: 0 0 var(--gap-sm);
          font-size: 18px;
          font-weight: 700;
        }
        .quality-header p {
          margin: 0 0 var(--gap-lg);
          color: var(--text-muted);
          font-size: 14px;
        }
        .quality-stars {
          display: flex;
          justify-content: center;
          gap: var(--gap-md);
          margin-bottom: var(--gap-md);
        }
        .quality-star {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          opacity: 0.3;
          transition: all 0.2s ease;
          transform: scale(1);
        }
        .quality-star:hover {
          transform: scale(1.2);
        }
        .quality-star.filled {
          opacity: 1;
          color: var(--accent);
        }
        .quality-star.selected {
          opacity: 1;
          color: var(--accent);
          transform: scale(1.1);
        }
        .quality-star svg {
          width: 36px;
          height: 36px;
          filter: drop-shadow(0 0 8px currentColor);
        }
        .quality-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--gap-lg);
          min-height: 42px;
        }
        .quality-countdown {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--gap-sm);
        }
        .countdown-bar {
          width: 100%;
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          overflow: hidden;
        }
        .countdown-progress {
          height: 100%;
          background: var(--accent);
          transition: width 1s linear;
        }
        .quality-countdown span {
          font-size: 12px;
          color: var(--text-muted);
        }
        .quality-confirmed {
          color: var(--accent);
          font-weight: 600;
          font-size: 14px;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}