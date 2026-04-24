import { useMemo } from 'react';
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

export function WheelOfLife({ axes, editable = false, size = 600, onAxisChange }: WheelOfLifeProps) {
  const { getColor } = useAreaColors();
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = 0;
  const outerRadius = size / 2 - 80;
  const wedgeAngle = 36; // 360 / 10
  const segmentGap = 1.5;
  const radialGap = 2;

  const polarToCartesian = (angleDeg: number, radius: number) => {
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
    };
  };

  const getArcPath = (startAngle: number, endAngle: number, rIn: number, rOut: number) => {
    const p1 = polarToCartesian(startAngle, rIn);
    const p2 = polarToCartesian(startAngle, rOut);
    const p3 = polarToCartesian(endAngle, rOut);
    const p4 = polarToCartesian(endAngle, rIn);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${p1.x} ${p1.y}
      L ${p2.x} ${p2.y}
      A ${rOut} ${rOut} 0 ${largeArc} 1 ${p3.x} ${p3.y}
      L ${p4.x} ${p4.y}
      A ${rIn} ${rIn} 0 ${largeArc} 0 ${p1.x} ${p1.y}
      Z
    `;
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
          <filter id="active-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Background Ring */}
        <circle cx={cx} cy={cy} r={outerRadius + 10} fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.2" />

        {axes.map((axis, i) => {
          const startAngle = i * wedgeAngle + segmentGap;
          const endAngle = (i + 1) * wedgeAngle - segmentGap;
          const midAngle = startAngle + (endAngle - startAngle) / 2;
          const color = getColor(axis.id);
          
          const labelRadius = outerRadius + 30;
          const labelPos = polarToCartesian(midAngle, labelRadius);
          
          // Determine text anchor based on angle to avoid overlapping the wheel
          let textAnchor: 'start' | 'end' | 'middle' = 'middle';
          const normalizedAngle = midAngle % 360;
          if (normalizedAngle > 20 && normalizedAngle < 160) {
            textAnchor = 'start';
          } else if (normalizedAngle > 200 && normalizedAngle < 340) {
            textAnchor = 'end';
          }

          return (
            <g key={axis.id} className="wheel-wedge">
              {/* Labels */}
              <text
                x={labelPos.x}
                y={labelPos.y - 6}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                className="wheel-axis-label"
                fill="var(--text-secondary)"
                fontSize="10"
                fontWeight="800"
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {AXIS_LABELS[axis.id]}
              </text>
              
              <text
                x={labelPos.x}
                y={labelPos.y + 6}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill={color}
                fontSize="10"
                fontWeight="900"
                opacity="0.9"
              >
                {axis.currentScore}/{axis.targetScore}
              </text>

              {/* Segments (10 levels) */}
              {Array.from({ length: 10 }).map((_, level) => {
                const r1 = innerRadius + (level * (outerRadius - innerRadius)) / 10 + radialGap;
                const r2 = innerRadius + ((level + 1) * (outerRadius - innerRadius)) / 10;
                const levelNum = level + 1;
                
                let fill = 'var(--bg-tertiary)';
                let opacity = '0.1';
                let stroke = 'var(--border)';
                let filter = 'none';

                if (levelNum <= axis.currentScore) {
                  fill = color;
                  opacity = '1';
                  stroke = 'none';
                  if (levelNum === axis.currentScore) filter = 'url(#active-glow)';
                } else if (levelNum <= axis.targetScore) {
                  fill = 'var(--text-muted)';
                  opacity = '0.35';
                  stroke = 'rgba(255,255,255,0.1)';
                }

                return (
                  <path
                    key={`${axis.id}-${level}`}
                    d={getArcPath(startAngle, endAngle, r1, r2)}
                    fill={fill}
                    opacity={opacity}
                    stroke={stroke}
                    strokeWidth="0.5"
                    className="wheel-segment"
                    style={{ 
                      filter,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: editable ? 'pointer' : 'default'
                    }}
                    onClick={() => {
                      if (!editable) return;
                      // Logic: if click level > current, set current to this level. 
                      // If click already filled, could toggle down? Let's just set.
                      onAxisChange?.(axis.id, levelNum, 'current');
                    }}
                  />
                );
              })}
            </g>
          );
        })}
        
        {/* Center Aesthetic */}
        <circle cx={cx} cy={cy} r={4} fill="var(--accent)" filter="url(#active-glow)" />
      </svg>

      {editable && (
        <div className="wheel-sliders">
          <div className="wheel-sliders-grid">
            {axes.map((axis) => (
              <div key={axis.id} className="wheel-slider-card card">
                <div className="wheel-slider-header">
                  <span className="dot" style={{ background: getColor(axis.id) }} />
                  <strong>{AXIS_LABELS[axis.id]}</strong>
                </div>
                
                <div className="wheel-slider-controls">
                  <div className="control-group">
                    <label>Current: {axis.currentScore}</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={axis.currentScore}
                      onChange={(e) => onAxisChange?.(axis.id, Number(e.target.value), 'current')}
                      style={{ '--accent': getColor(axis.id) } as any}
                    />
                  </div>
                  <div className="control-group target">
                    <label>Target: {axis.targetScore}</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={axis.targetScore}
                      onChange={(e) => onAxisChange?.(axis.id, Number(e.target.value), 'target')}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}