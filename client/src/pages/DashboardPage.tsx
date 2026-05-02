import { useDashboard } from '../hooks/useDashboard';
import { useTargets } from '../hooks/useTargets';
import { useAreaColors } from '../hooks/useAreaColors';
import { useAnalytics } from '../hooks/useAnalytics';
import { StreakCard } from '../components/StreakCard';
import { HabitQuickCheck } from '../components/dashboard/HabitQuickCheck';
import { WeeklyHabitGrid } from '../components/dashboard/WeeklyHabitGrid';
import { FocusAreaRing } from '../components/dashboard/FocusAreaRing';
import { WeeklyReport } from '../components/analytics/WeeklyReport';
import { TargetsPanel } from '../components/dashboard/TargetsPanel';
import { DashboardShimmer } from '../components/Shimmer';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBanner } from '../components/ui/StatusBanner';

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
  const { weeklyReport, loading: analyticsLoading } = useAnalytics();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (loading && streaks.length === 0) {
    return <DashboardShimmer />;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Dashboard"
        subtitle="Daily command center built for a fast scan and an even faster loop."
      />

      {error && (
        <StatusBanner
          tone="danger"
          message={error}
          actions={<button className="status-action" onClick={() => void refresh()}>Retry</button>}
        />
      )}

      {focusError && !error && (
        <StatusBanner tone="subtle" message={focusError} />
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
        {weeklyReport && <WeeklyReport report={weeklyReport} />}
      </div>
    </div>
  );
}
