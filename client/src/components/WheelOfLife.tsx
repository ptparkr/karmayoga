import { useMemo } from 'react';
import type { WheelAxis, WheelAxisId } from '../types';

interface WheelOfLifeProps {
  axes: WheelAxis[];
  editable?: boolean;
  size?: number;
  onAxisChange?: (id: WheelAxisId, value: number, type: 'current' | 'target') => void;
}

const AXIS_LABELS: Record<WheelAxisId, string> = {
  body: 'Body',
  mind: 'Mind',
  soul: 'Soul',
  growth: 'Growth',
  money: 'Money',
  mission: 'Mission',
  romance: 'Romance',
  family: 'Family',
  friends: 'Friends',
  joy: 'Joy',
};

const AXIS_GROUPS: Record<WheelAxisId, string> = {
  body: 'Health',
  mind: 'Health',
  soul: 'Health',
  growth: 'Work',
  money: 'Work',
  mission: 'Work',
  romance: 'Relationships',
  family: 'Relationships',
  friends: 'Relationships',
  joy: 'Joy',
};

export function WheelOfLife({ axes, editable = false, size = 400, onAxisChange }: WheelOfLifeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 50;
  const gridRadii = [0.25, 0.5, 0.75, 1].map(r => r * maxRadius);

  const angleStep = (2 * Math.PI) / 10;

  const polarToCartesian = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const gridPoints = gridRadii.map(radius => {
    return Array.from({ length: 10 }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const pos = polarToCartesian(angle, radius);
      return `${pos.x},${pos.y}`;
    }).join(' ');
  });

  const currentPoints = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const axis = axes[i];
      const radius = (axis.currentScore / 10) * maxRadius;
      const pos = polarToCartesian(angle, radius);
      return `${pos.x},${pos.y}`;
    }).join(' ');
  }, [axes, maxRadius, angleStep]);

  const targetPoints = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const axis = axes[i];
      const radius = (axis.targetScore / 10) * maxRadius;
      const pos = polarToCartesian(angle, radius);
      return `${pos.x},${pos.y}`;
    }).join(' ');
  }, [axes, maxRadius, angleStep]);

  const spokeLines = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const outer = polarToCartesian(angle, maxRadius);
      return { x1: cx, y1: cy, x2: outer.x, y2: outer.y };
    });
  }, [cx, cy, maxRadius, angleStep]);

  const axisLabels = useMemo(() => {
    return axes.map((axis, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const labelRadius = maxRadius + 28;
      const pos = polarToCartesian(angle, labelRadius);
      let textAnchor: 'start' | 'end' | 'middle' = 'middle';
      if (Math.abs(angle) > 0.3 && angle < Math.PI - 0.3) {
        textAnchor = angle < Math.PI ? 'start' : 'end';
      }
      return {
        id: axis.id,
        label: AXIS_LABELS[axis.id],
        group: AXIS_GROUPS[axis.id],
        x: pos.x,
        y: pos.y,
        textAnchor,
      };
    });
  }, [axes, maxRadius, angleStep]);

  const scoreDots = useMemo(() => {
    return axes.map((axis, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const radius = (axis.currentScore / 10) * maxRadius;
      const pos = polarToCartesian(angle, radius);
      return { id: axis.id, x: pos.x, y: pos.y };
    });
  }, [axes, maxRadius, angleStep]);

  return (
    <div className="wheel-container">
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="wheel-svg"
      >
        <defs>
          <filter id="wheel-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g className="wheel-grid">
          {gridPoints.map((points, i) => (
            <polygon 
              key={`grid-${i}`}
              points={points}
              fill="none"
              stroke="var(--border-light)"
              strokeWidth="1"
              strokeDasharray={i < 3 ? '4 4' : 'none'}
              opacity={0.5}
            />
          ))}
        </g>

        <g className="wheel-spokes">
          {spokeLines.map((line, i) => (
            <line
              key={`spoke-${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="var(--border-light)"
              strokeWidth="1"
              opacity="0.4"
            />
          ))}
        </g>

        <g className="wheel-target-polygon">
          <polygon
            points={targetPoints}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.5"
          />
        </g>

        <g className="wheel-current-polygon">
          <polygon
            points={currentPoints}
            fill="rgba(0, 255, 204, 0.15)"
            stroke="var(--accent)"
            strokeWidth="2"
          />
        </g>

        <g className="wheel-score-dots">
          {scoreDots.map((dot) => (
            <circle
              key={dot.id}
              cx={dot.x}
              cy={dot.y}
              r="5"
              fill="var(--accent)"
              filter="url(#wheel-glow)"
            />
          ))}
        </g>

        <g className="wheel-labels" fontSize="12" fontWeight="600" fill="var(--text-secondary)">
          {axisLabels.map((label) => (
            <text
              key={label.id}
              x={label.x}
              y={label.y}
              textAnchor={label.textAnchor}
              dominantBaseline="middle"
            >
              {label.label}
            </text>
          ))}
        </g>
      </svg>

      {editable && (
        <div className="wheel-sliders">
          {axes.map((axis) => (
            <div key={axis.id} className="wheel-slider-row">
              <label className="wheel-slider-label">
                {AXIS_LABELS[axis.id]}
                <span className="wheel-slider-group">({AXIS_GROUPS[axis.id]})</span>
              </label>
              <div className="wheel-slider-inputs">
                <div className="wheel-slider-field">
                  <span>Current</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={axis.currentScore}
                    onChange={(e) => onAxisChange?.(axis.id, Number(e.target.value), 'current')}
                    className="wheel-range"
                  />
                  <span className="wheel-slider-value">{axis.currentScore}</span>
                </div>
                <div className="wheel-slider-field">
                  <span>Target</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={axis.targetScore}
                    onChange={(e) => onAxisChange?.(axis.id, Number(e.target.value), 'target')}
                    className="wheel-range target"
                  />
                  <span className="wheel-slider-value">{axis.targetScore}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}