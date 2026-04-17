import type { WeeklyData } from '../../types';

interface Props {
  weekly: WeeklyData | null;
  todayStr: string;
  onToggle: (habitId: string, date: string) => void;
  getColor: (area: string) => string;
}

function hexToRgba(hex: string, alpha: number): string {
  const safeHex = hex.startsWith('#') ? hex : '#8b949e';
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HabitQuickCheck({ weekly, todayStr, onToggle, getColor }: Props) {
  if (!weekly || weekly.matrix.length === 0) {
    return (
      <div className="card dashboard-card">
        <div className="card-title">Habit Quick Check</div>
        <div className="empty-state dashboard-empty">
          <span className="empty-text">Add a habit to unlock your daily check-in board.</span>
        </div>
      </div>
    );
  }

  const grouped = weekly.matrix.reduce<Record<string, typeof weekly.matrix>>((acc, row) => {
    acc[row.area] = [...(acc[row.area] ?? []), row];
    return acc;
  }, {});

  return (
    <div className="card dashboard-card dashboard-quick-check">
      <div className="dashboard-card-header">
        <div>
          <div className="card-title">Habit Quick Check</div>
          <p className="dashboard-card-subtitle">Toggle today without leaving the dashboard.</p>
        </div>
      </div>

      <div className="quick-check-groups">
        {Object.entries(grouped).map(([area, rows]) => {
          const color = getColor(area);
          const completed = rows.filter(row => row.days.some(day => day.date === todayStr && day.checked)).length;

          return (
            <section
              key={area}
              className="quick-check-group"
              style={{
                borderColor: hexToRgba(color, 0.28),
                background: `linear-gradient(135deg, ${hexToRgba(color, 0.14)}, rgba(5, 8, 20, 0.7))`,
              }}
            >
              <header className="quick-check-group-header">
                <div className="quick-check-area">
                  <span className="quick-check-area-dot" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                  <span>{area}</span>
                </div>
                <span
                  className="quick-check-pill"
                  style={{
                    color,
                    background: hexToRgba(color, 0.12),
                    borderColor: hexToRgba(color, 0.24),
                  }}
                >
                  {completed}/{rows.length}
                </span>
              </header>

              <div className="quick-check-items">
                {rows.map(row => {
                  const todayState = row.days.find(day => day.date === todayStr);
                  const checked = Boolean(todayState?.checked);

                  return (
                    <button
                      key={row.habitId}
                      type="button"
                      className={`quick-check-item ${checked ? 'checked' : ''}`}
                      onClick={() => onToggle(row.habitId, todayStr)}
                      style={checked ? {
                        borderColor: hexToRgba(color, 0.42),
                        background: hexToRgba(color, 0.16),
                      } : undefined}
                    >
                      <span
                        className="quick-check-box"
                        style={checked ? { background: color, borderColor: color, boxShadow: `0 0 14px ${color}55` } : undefined}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      <span className="quick-check-label">{row.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
