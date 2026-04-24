import { useMemo, useState } from 'react';
import type { WheelAxis, WheelAxisId } from '../types';
import { useAreaColors } from '../hooks/useAreaColors';

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

export function WheelOfLife({ axes, editable = false, size = 450, onAxisChange }: WheelOfLifeProps) {
  const { getColor } = useAreaColors();
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = 40;
  const maxRadius = size / 2 - 60;
  const barThickness = 12;
  const segmentGap = 2;
  const numSegments = 10;
  
  const angleStep = (2 * Math.PI) / 10;

  const getSegmentPath = (angle: number, index: number) => {
    const rStart = innerRadius + (index * (maxRadius - innerRadius)) / numSegments + segmentGap;
    const rEnd = innerRadius + ((index + 1) * (maxRadius - innerRadius)) / numSegments;
    
    // Slight arc for the segment
    const halfWidth = (Math.PI / 180) * 8; // 8 degrees wide segments
    
    const x1 = cx + rStart * Math.cos(angle - halfWidth);
    const y1 = cy + rStart * Math.sin(angle - halfWidth);
    const x2 = cx + rEnd * Math.cos(angle - halfWidth);
    const y2 = cy + rEnd * Math.sin(angle - halfWidth);
    const x3 = cx + rEnd * Math.cos(angle + halfWidth);
    const y3 = cy + rEnd * Math.sin(angle + halfWidth);
    const x4 = cx + rStart * Math.cos(angle + halfWidth);
    const y4 = cy + rStart * Math.sin(angle + halfWidth);

    return `M ${x1} ${y1} L ${x2} ${y2} A ${rEnd} ${rEnd} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rStart} ${rStart} 0 0 0 ${x1} ${y1} Z`;
  };

  return (
    <div className="wheel-container">
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="wheel-svg"
      >
        <defs>
          <filter id="segment-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Center Guide */}
        <circle cx={cx} cy={cy} r={innerRadius - 5} fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.3" />

        {/* Axes and Segments */}
        {axes.map((axis, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const labelRadius = maxRadius + 35;
          const labelX = cx + labelRadius * Math.cos(angle);
          const labelY = cy + labelRadius * Math.sin(angle);
          const color = getColor(axis.id);

          return (
            <g key={axis.id} className="wheel-axis-group">
              {/* Background Segments (Empty) */}
              {Array.from({ length: 10 }).map((_, idx) => (
                <path
                  key={`bg-${axis.id}-${idx}`}
                  d={getSegmentPath(angle, idx)}
                  fill="var(--bg-tertiary)"
                  opacity="0.1"
                  stroke="var(--border)"
                  strokeWidth="0.5"
                  className="wheel-segment-bg"
                />
              ))}

              {/* Target Score Indicator (Ghost) */}
              {Array.from({ length: axis.targetScore }).map((_, idx) => (
                <path
                  key={`target-${axis.id}-${idx}`}
                  d={getSegmentPath(angle, idx)}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.3"
                />
              ))}

              {/* Current Score Segments (Filled) */}
              {Array.from({ length: axis.currentScore }).map((_, idx) => (
                <path
                  key={`fill-${axis.id}-${idx}`}
                  d={getSegmentPath(angle, idx)}
                  fill={color}
                  className="wheel-segment-fill"
                  style={{ 
                    filter: idx === axis.currentScore - 1 ? 'url(#segment-glow)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => onAxisChange?.(axis.id, idx + 1, 'current')}
                  cursor={editable ? 'pointer' : 'default'}
                />
              ))}

              {/* Label */}
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="wheel-axis-label"
                fill="var(--text-secondary)"
                fontSize="11"
                fontWeight="700"
              >
                {AXIS_LABELS[axis.id]}
              </text>
              <text
                x={labelX}
                y={labelY + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize="10"
                fontWeight="800"
                opacity="0.8"
              >
                {axis.currentScore}/10
              </text>
            </g>
          );
        })}
      </svg>

      {editable && (
        <div className="wheel-sliders">
          {axes.map((axis) => (
            <div key={axis.id} className="wheel-slider-row">
              <label className="wheel-slider-label">
                <span style={{ color: getColor(axis.id) }}>●</span> {AXIS_LABELS[axis.id]}
              </label>
              <div className="wheel-slider-inputs">
                <div className="wheel-slider-field">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={axis.currentScore}
                    onChange={(e) => onAxisChange?.(axis.id, Number(e.target.value), 'current')}
                    className="wheel-range"
                    style={{ '--accent': getColor(axis.id) } as any}
                  />
                  <span className="wheel-slider-value">{axis.currentScore}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}