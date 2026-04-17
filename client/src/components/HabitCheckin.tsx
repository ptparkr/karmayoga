import { useState } from 'react';
import { toDateStr, formatDate } from '../lib/dateUtils';

interface Props {
  habitId: string;
  name: string;
  area: string;
  areaColor: string;
  checked: boolean;
  scheduled: boolean;
  streak: number;
  longestStreak: number;
  last7Days: { date: string; completed: boolean; scheduled: boolean }[];
  onToggle: () => void;
  onDelete: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HabitCheckin({
  habitId,
  name,
  area,
  areaColor,
  checked,
  scheduled,
  streak,
  longestStreak,
  last7Days,
  onToggle,
  onDelete,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="habit-checkin-row animate-in">
      <button
        className={`habit-check ${checked ? 'checked' : ''}`}
        onClick={onToggle}
        disabled={!scheduled}
        title={scheduled ? (checked ? 'Uncheck' : 'Check') : 'Not scheduled for today'}
        style={checked ? { 
          background: areaColor, 
          borderColor: areaColor,
          boxShadow: `0 0 15px ${areaColor}60` 
        } : !scheduled ? {
          opacity: 0.4,
          cursor: 'not-allowed',
        } : undefined}
      >
        {checked ? '✓' : ''}
      </button>
      
      <div className="habit-info">
        <span className="habit-name" style={!scheduled ? { opacity: 0.5 } : undefined}>
          {name}
          {!scheduled && <span className="not-scheduled-badge">Not scheduled</span>}
        </span>
        
        {streak > 0 && (
          <span className="streak-badge" title={`Best: ${longestStreak} days`}>
            🔥 {streak}d
          </span>
        )}
      </div>

      <div className="mini-trail">
        {last7Days.map((day, i) => (
          <div
            key={i}
            className={`mini-trail-cell ${day.completed ? 'completed' : ''} ${day.scheduled && !day.completed ? 'missed' : ''}`}
            style={day.completed ? { background: areaColor } : day.scheduled ? { background: hexToRgba(areaColor, 0.15) } : undefined}
            title={`${formatDate(day.date)}: ${day.completed ? 'Done' : day.scheduled ? 'Missed' : 'Not scheduled'}`}
          />
        ))}
      </div>

      <div className="habit-actions">
        <button 
          className="habit-menu-btn" 
          onClick={() => setShowMenu(!showMenu)}
          title="More options"
        >
          ⋮
        </button>
        {showMenu && (
          <div className="habit-menu">
            <button onClick={() => { onDelete(); setShowMenu(false); }} className="menu-item danger">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}