import { useState, useMemo } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { MomentumScore } from '../components/analytics/MomentumScore';
import { PeakHoursChart } from '../components/analytics/PeakHoursChart';
import { AreaBalance } from '../components/analytics/AreaBalance';
import { SleepFocusCorrelation } from '../components/analytics/SleepFocusCorrelation';
import { HabitAreaAnalytics } from '../components/analytics/HabitAreaAnalytics';
import { HealthCorrelations } from '../components/analytics/HealthCorrelations';
import { WheelAnalytics } from '../components/analytics/WheelAnalytics';
import { WeeklyReport } from '../components/analytics/WeeklyReport';
import { useAreaColors } from '../hooks/useAreaColors';
import type { WheelAxisId } from '../types';

type WheelAxis = { id: WheelAxisId; currentScore: number; targetScore: number };

type TabId = 'overview' | 'focus' | 'habits' | 'health' | 'wheel';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'focus', label: 'Focus' },
  { id: 'habits', label: 'Habits' },
  { id: 'health', label: 'Health' },
  { id: 'wheel', label: 'Wheel' },
];

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { getColor } = useAreaColors();
  
  const {
    momentum,
    peakHours,
    areaBalance,
    weeklyReport,
    sessions,
    habits,
    habitAreas,
    areaSummaries,
    consistency,
    streaks,
    wheelAxes,
    healthCheckins,
    sleepFocusData,
    sleepFocusRegression,
    loading,
    error,
    refresh,
    getColor: getColorFromAnalytics,
  } = useAnalytics();

  const getAreaColor = getColorFromAnalytics || getColor;

  const overviewCards = useMemo(() => {
    const avgMomentum = momentum.length > 0
      ? Math.round(momentum.reduce((s, m) => s + m.score, 0) / momentum.length)
      : 0;
    
    const consistencyPct = consistency?.percentage || 0;
    const wheelScore = wheelAxes.length > 0
      ? computeWheelBalance(wheelAxes)
      : 50;
    
    return [
      { label: 'Momentum', value: avgMomentum, unit: '/100', color: '#3b8bd4' },
      { label: 'Consistency', value: consistencyPct, unit: '%', color: '#1D9E75' },
      { label: 'Wheel Balance', value: wheelScore, unit: '/100', color: '#7F77DD' },
    ];
  }, [momentum, consistency, wheelAxes]);

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
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Your data powerhouse — see what's working and what needs attention.</p>
      </div>

      {error && (
        <div className="status-banner">
          <span>{error}</span>
          <button className="status-action" onClick={() => void refresh()}>Retry</button>
        </div>
      )}

      <div className="analytics-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`analytics-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="analytics-content">
        {activeTab === 'overview' && (
          <div className="analytics-overview">
            <div className="stat-row">
              {overviewCards.map(card => (
                <div key={card.label} className="analytics-card">
                  <div className="analytics-card-value" style={{ color: card.color }}>
                    {card.value}{card.unit}
                  </div>
                  <div className="analytics-card-label">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">Momentum Trend</h3>
              <MomentumScore data={momentum} />
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">This Week's Report</h3>
              {weeklyReport && <WeeklyReport report={weeklyReport} />}
            </div>
          </div>
        )}

        {activeTab === 'focus' && (
          <div className="analytics-focus">
            <div className="analytics-section">
              <h3 className="analytics-section-title">Peak Hours</h3>
              <PeakHoursChart grid={peakHours} />
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">Area Balance (8 weeks)</h3>
              <AreaBalance data={areaBalance} areas={habitAreas} getColor={getAreaColor} />
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">Sleep × Focus Correlation</h3>
              <SleepFocusCorrelation
                data={sleepFocusData}
                regression={sleepFocusRegression}
                hasData={sleepFocusData.length >= 2}
              />
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">Focus Sessions</h3>
              <FocusSessionsList sessions={sessions} />
            </div>
          </div>
        )}

        {activeTab === 'habits' && (
          <div className="analytics-habits">
            <div className="analytics-section">
              <h3 className="analytics-section-title">Area Completion Rates</h3>
              <HabitAreaAnalytics areas={areaSummaries} getColor={getAreaColor} />
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">Streak Leaderboard</h3>
              <StreakLeaderboardSimple streaks={streaks} getColor={getAreaColor} />
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="analytics-health">
            <div className="analytics-section">
              <h3 className="analytics-section-title">Health Metrics</h3>
              {healthCheckins && healthCheckins.length > 0 ? (
                <>
                  <HealthMetricsPreview checkins={healthCheckins} />
                  <div className="analytics-section" style={{ marginTop: 'var(--gap-xl)' }}>
                    <h3 className="analytics-section-title">Health Correlations</h3>
                    <HealthCorrelations checkins={healthCheckins} sessions={sessions} />
                  </div>
                </>
              ) : (
                <div className="analytics-empty">
                  <p>Log daily health check-ins to see correlations.</p>
                  <a href="/health" className="btn btn-ghost">Go to Health →</a>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'wheel' && (
          <div className="analytics-wheel">
            <div className="analytics-section">
              <h3 className="analytics-section-title">Wheel Balance Score</h3>
              <WheelAnalytics axes={wheelAxes} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FocusSessionsList({ sessions }: { sessions: any[] }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="analytics-empty">
        <p>No focus sessions yet. Start a pomodoro session!</p>
        <a href="/pomodoro" className="btn btn-ghost">Go to Pomodoro →</a>
      </div>
    );
  }

  return (
    <div className="focus-sessions-list">
      {sessions.slice(0, 10).map((session: any, i: number) => (
        <div key={session.id || i} className="focus-session-item">
          <span className="focus-session-area">{session.area || 'other'}</span>
          <span className="focus-session-duration">{session.focus_min || 0}m</span>
          <span className="focus-session-date">
            {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      ))}
      {sessions.length > 10 && (
        <div className="focus-sessions-more">+{sessions.length - 10} more sessions</div>
      )}
    </div>
  );
}

function computeWheelBalance(axes: { currentScore: number }[]): number {
  if (axes.length === 0) return 50;
  const scores = axes.map(a => a.currentScore);
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, Math.round(100 - stdDev * 10));
}

function StreakLeaderboardSimple({ streaks, getColor }: { streaks: any[]; getColor: (a: string) => string }) {
  const sorted = [...streaks].sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 5);
  
  return (
    <div className="streak-mini-list">
      {sorted.map((entry, i) => (
        <div key={entry.habitId || i} className="streak-mini-row">
          <span className="streak-mini-rank">#{i + 1}</span>
          <span className="streak-mini-name">{entry.name}</span>
          <span className="streak-mini-streak" style={{ color: getColor(entry.area) }}>
            {entry.currentStreak}d
          </span>
        </div>
      ))}
    </div>
  );
}

function HealthMetricsPreview({ checkins }: { checkins: any[] }) {
  if (checkins.length === 0) {
    return (
      <div className="analytics-empty">
        <p>Log health check-ins to see correlations.</p>
        <a href="/health" className="btn btn-ghost">Go to Health →</a>
      </div>
    );
  }

  const avg = (arr: (number | null)[], fallback = 0) => {
    const vals = arr.filter((x): x is number => x !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : fallback;
  };

  const sleep = avg(checkins.map(c => c.sleepHours));
  const hrv = avg(checkins.map(c => c.hrv));
  const energy = avg(checkins.map(c => c.energyLevel));
  const mood = avg(checkins.map(c => c.moodScore));

  return (
    <div className="health-metrics-grid">
      <div className="health-metric-card">
        <span className="health-metric-value">{sleep}h</span>
        <span className="health-metric-label">Avg Sleep</span>
      </div>
      <div className="health-metric-card">
        <span className="health-metric-value">{hrv}</span>
        <span className="health-metric-label">Avg HRV</span>
      </div>
      <div className="health-metric-card">
        <span className="health-metric-value">{energy}</span>
        <span className="health-metric-label">Avg Energy</span>
      </div>
      <div className="health-metric-card">
        <span className="health-metric-value">{mood}</span>
        <span className="health-metric-label">Avg Mood</span>
      </div>
    </div>
  );
}