import { useMemo } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useTargets } from '../hooks/useTargets';
import { useAreaColors } from '../hooks/useAreaColors';
import { StreakCard } from '../components/StreakCard';
import { HabitQuickCheck } from '../components/dashboard/HabitQuickCheck';
import { WeeklyHabitGrid } from '../components/dashboard/WeeklyHabitGrid';
import { FocusAreaRing } from '../components/dashboard/FocusAreaRing';
import { WeeklyReportPreview } from '../components/dashboard/WeeklyReportPreview';
import { TargetsPanel } from '../components/dashboard/TargetsPanel';
import { buildWeeklyReportPreview } from '../lib/dashboard';

export function DashboardPage() {
  const {
    streaks,
    weekly,
    areas,
    consistency,
    focusAnalytics,
    focusError,
    loading,
    error,
    totalCurrentStreak,
    totalLongestStreak,
    toggleCheckin,
    refresh,
  } = useDashboard();
  const { getColor } = useAreaColors();
  const { targets, addTarget, updateTarget, removeTarget, completeTarget, setPrimary } = useTargets();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const report = useMemo(
    () => buildWeeklyReportPreview(streaks, consistency, areas, focusAnalytics),
    [streaks, consistency, areas, focusAnalytics],
  );

  if (loading) {
    return (
      <div className="app-main">
        <div className="empty-state"><span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>...</span></div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Daily command center built for a fast scan and an even faster loop.</p>
      </div>

      {error && (
        <div className="status-banner">
          <span>{error}</span>
          <button className="status-action" onClick={() => void refresh()}>Retry</button>
        </div>
      )}

      {focusError && !error && (
        <div className="status-banner status-banner-subtle">
          <span>{focusError}</span>
        </div>
      )}

      <div className="stat-row">
        <StreakCard icon="A" label="Best Active Streak" value={totalCurrentStreak} glow={totalCurrentStreak >= 7} />
        <StreakCard icon="L" label="All-Time Longest" value={totalLongestStreak} />
        <StreakCard icon="H" label="Active Habits" value={streaks.length} unit="habits" />
        <StreakCard icon="C" label="30-Day Consistency" value={consistency?.percentage || 0} unit="%" />
      </div>

      <div className="section dashboard-command-grid">
        <TargetsPanel
          targets={targets}
          addTarget={addTarget}
          updateTarget={updateTarget}
          removeTarget={removeTarget}
          completeTarget={completeTarget}
          setPrimary={setPrimary}
        />
        <HabitQuickCheck weekly={weekly} todayStr={todayStr} onToggle={toggleCheckin} getColor={getColor} />
      </div>

      <div className="section">
        <WeeklyHabitGrid weekly={weekly} todayStr={todayStr} onToggle={toggleCheckin} getColor={getColor} />
      </div>

      <div className="section dashboard-bottom-grid">
        <FocusAreaRing focusAnalytics={focusAnalytics} getColor={getColor} />
        <WeeklyReportPreview report={report} />
      </div>
    </div>
  );
}
