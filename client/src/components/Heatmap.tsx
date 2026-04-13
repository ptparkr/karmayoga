import { useCallback, useRef, useState } from 'react';
import { toDateStr, addDays, formatDate } from '../lib/dateUtils';

interface Props {
  checkins: Record<string, number>; // date -> count
}

export function Heatmap({ checkins }: Props) {
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    visible: boolean;
  }>({ text: '', x: 0, y: 0, visible: false });

  const gridRef = useRef<HTMLDivElement>(null);
  const todayStr = toDateStr(new Date());

  // Build 52 weeks of cells
  const endDate = new Date();
  const startDate = addDays(endDate, -363);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const cells: { date: string; level: number; isToday: boolean }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = toDateStr(current);
    const count = checkins[dateStr] || 0;
    let level = 0;
    if (count >= 4) level = 4;
    else if (count >= 3) level = 3;
    else if (count >= 2) level = 2;
    else if (count >= 1) level = 1;

    cells.push({ date: dateStr, level, isToday: dateStr === todayStr });
    current.setDate(current.getDate() + 1);
  }

  // Month labels with smarter spacing
  const months: { label: string; offset: number }[] = [];
  let lastMonth = -1;
  cells.forEach((cell, i) => {
    if (i % 7 === 0) { // Only check start of weeks
      const d = new Date(cell.date + 'T00:00:00');
      const m = d.getMonth();
      if (m !== lastMonth) {
        months.push({
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          offset: Math.floor(i / 7),
        });
        lastMonth = m;
      }
    }
  });

  const handleMouseEnter = useCallback((e: React.MouseEvent, date: string, count: number) => {
    const cell = e.target as HTMLElement;
    const rect = cell.getBoundingClientRect();
    const containerRect = gridRef.current?.parentElement?.parentElement?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltip({
      text: `${formatDate(date)}: ${count} habit${count !== 1 ? 's' : ''} done`,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      visible: true,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="heatmap-container animate-in" style={{ position: 'relative' }}>
      <div className="heatmap-wrapper">
        <div className="heatmap-months">
          {months.map((m, i) => (
            <span key={i} style={{ 
              gridColumnStart: m.offset + 1,
              gridColumnEnd: 'span 4' // prevent overlap
            }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="heatmap-body">
          <div className="heatmap-days-label">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="heatmap-grid" ref={gridRef}>
            {cells.map((cell) => (
              <div
                key={cell.date}
                className={`heatmap-cell level-${cell.level}${cell.isToday ? ' today' : ''}`}
                onMouseEnter={e => handleMouseEnter(e, cell.date, checkins[cell.date] || 0)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-cells">
            {[0, 1, 2, 3, 4].map(l => (
              <div key={l} className={`legend-cell level-${l}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
      <div
        className={`heatmap-tooltip ${tooltip.visible ? 'visible' : ''}`}
        style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
      >
        {tooltip.text}
      </div>
    </div>
  );
}
