import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useAreaColors } from '../hooks/useAreaColors';
import { StreakCard } from '../components/StreakCard';
import { PieChart } from '../components/PieChart';
import { getWeekdayShort } from '../lib/dateUtils';

type ChartView = 'areas' | 'consistency' | 'habit';

export function DashboardPage() {
  const { streaks, weekly, areas, consistency, loading, totalCurrentStreak, totalLongestStreak } = useDashboard();
  const { getColor } = useAreaColors();
  const [chartView, setChartView] = useState<ChartView>('areas');
  const [selectedHabit, setSelectedHabit] = useState<string>('');

  if (loading) {
    return (
      <div className="app-main">
        <div className="empty-state"><span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</span></div>
      </div>
    );
  }

  // Pie chart data based on view — uses dynamic area colors
  const getPieData = () => {
    if (chartView === 'areas') {
      return areas.map(a => ({
        label: a.area.charAt(0).toUpperCase() + a.area.slice(1),
        value: a.checkins,
        color: getColor(a.area),
      }));
    }
    if (chartView === 'consistency' && consistency) {
      return [
        { label: 'Completed', value: consistency.totalCheckins, color: '#39d353' },
        { label: 'Missed', value: consistency.missed, color: '#30363d' },
      ];
    }
    if (chartView === 'habit' && selectedHabit) {
      const s = streaks.find(h => h.habitId === selectedHabit);
      if (s) {
        const possible = 30;
        return [
          { label: 'Done', value: Math.min(s.totalCheckins, possible), color: getColor(s.area) },
          { label: 'Missed', value: Math.max(0, possible - s.totalCheckins), color: '#30363d' },
        ];
      }
    }
    return [];
  };

  const getPieLabel = () => {
    if (chartView === 'areas') return 'By Area';
    if (chartView === 'consistency') return 'Overall';
    if (chartView === 'habit') {
      const s = streaks.find(h => h.habitId === selectedHabit);
      return s?.name || 'Select Habit';
    }
    return '';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Build a colored dot for streak cards
  const areaIcon = (area: string) => {
    const color = getColor(area);
    return (
      <span style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}40`,
      }} />
    );
  };

  return (
    <div className="app-main">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your progress at a glance</p>
      </div>

      {/* Streak Cards */}
      <div className="stat-row">
        <StreakCard icon="🔥" label="Best Active Streak" value={totalCurrentStreak} glow={totalCurrentStreak >= 7} />
        <StreakCard icon="🏆" label="All-Time Longest" value={totalLongestStreak} />
        <StreakCard icon="🎯" label="Active Habits" value={streaks.length} unit="habits" />
        <StreakCard icon="📈" label="30-Day Consistency" value={consistency?.percentage || 0} unit="%" />
      </div>

      {/* Charts Section */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Analytics</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="toggle-group">
              <button className={`toggle-btn ${chartView === 'areas' ? 'active' : ''}`} onClick={() => setChartView('areas')}>Areas</button>
              <button className={`toggle-btn ${chartView === 'consistency' ? 'active' : ''}`} onClick={() => setChartView('consistency')}>Overall</button>
              <button className={`toggle-btn ${chartView === 'habit' ? 'active' : ''}`} onClick={() => setChartView('habit')}>Per Habit</button>
            </div>
            {chartView === 'habit' && (
              <select
                className="select"
                value={selectedHabit}
                onChange={e => setSelectedHabit(e.target.value)}
                style={{ fontSize: 12, padding: '4px 28px 4px 8px' }}
              >
                <option value="">Select...</option>
                {streaks.map(s => (
                  <option key={s.habitId} value={s.habitId}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <PieChart segments={getPieData()} label={getPieLabel()} size={200} />
        </div>
      </div>

      {/* Per-Habit Streaks — use colored dot instead of hardcoded emojis */}
      {streaks.length > 0 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 12 }}>Habit Streaks</div>
          <div className="stat-row">
            {streaks.map(s => (
              <div key={s.habitId} className={`stat-card ${s.currentStreak >= 7 ? 'glow' : ''}`} style={s.currentStreak >= 7 ? { borderColor: getColor(s.area), boxShadow: `0 0 20px ${getColor(s.area)}25` } : undefined}>
                <span className="stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {areaIcon(s.area)}
                </span>
                <div>
                  <div className="stat-label">{s.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span className="stat-value" style={{ background: `linear-gradient(135deg, ${getColor(s.area)}, ${getColor(s.area)}cc)`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {s.currentStreak}
                    </span>
                    <span className="stat-unit">days</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Grid — colored dots per area */}
      {weekly && weekly.matrix.length > 0 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 12 }}>This Week</div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="weekly-grid">
              <thead>
                <tr>
                  <th>Habit</th>
                  {weekly.weekDates.map((d: string) => (
                    <th key={d}>{getWeekdayShort(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekly.matrix.map((row: any) => (
                  <tr key={row.habitId}>
                    <td>{row.name}</td>
                    {row.days.map((day: any) => (
                      <td key={day.date}>
                        <span
                          className={`weekly-dot ${day.checked ? 'done' : day.date > todayStr ? 'future' : 'missed'}`}
                          style={day.checked ? { background: getColor(row.area), boxShadow: `0 0 8px ${getColor(row.area)}50` } : undefined}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
