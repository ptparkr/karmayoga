import type {
  ConsistencyData,
  FocusAnalytics,
  FocusAreaSummary,
  StreakData,
  Target,
  WeeklyReportPreview,
} from '../types';

export function buildTodayFocusSegments(byArea: FocusAreaSummary[]): FocusAreaSummary[] {
  return [...byArea].sort((a, b) => b.total_min - a.total_min);
}

export function buildWeeklyReportPreview(
  streaks: StreakData[],
  consistency: ConsistencyData | null,
  areas: Array<{ area: string; percentage: number }>,
  focusAnalytics: FocusAnalytics | null,
): WeeklyReportPreview {
  const totalFocusMinutes = focusAnalytics?.weekDays.reduce((sum, day) => sum + day.minutes, 0) ?? 0;
  const focusAreas = focusAnalytics?.byArea ?? [];
  const topFocusArea = [...focusAreas].sort((a, b) => b.total_min - a.total_min)[0]?.area ?? null;
  const strongestHabit = [...streaks].sort((a, b) => b.currentStreak - a.currentStreak)[0]?.name ?? null;
  const currentBestStreak = streaks.reduce((max, streak) => Math.max(max, streak.currentStreak), 0);
  const weakestArea = [...areas].sort((a, b) => a.percentage - b.percentage)[0]?.area ?? null;
  const consistencyPercentage = consistency?.percentage ?? 0;

  const recommendations: string[] = [];

  if (consistencyPercentage < 60) {
    recommendations.push('Cut one habit this week and rebuild consistency above 60%.');
  } else if (consistencyPercentage < 80) {
    recommendations.push('You are close. Protect your easiest habits first and keep the loop tight.');
  }

  if (totalFocusMinutes < 120) {
    recommendations.push('Schedule one more deep-focus block today to keep momentum alive.');
  }

  if (weakestArea) {
    recommendations.push(`Your weakest area is ${capitalize(weakestArea)}. Put one easy win there next.`);
  }

  if (topFocusArea) {
    recommendations.push(`Most focus is landing in ${capitalize(topFocusArea)}. Rebalance only if that is not intentional.`);
  }

  while (recommendations.length < 3) {
    recommendations.push('Keep the dashboard lean: finish today before adding anything new.');
  }

  return {
    totalFocusMinutes,
    topFocusArea,
    strongestHabit,
    currentBestStreak,
    consistencyPercentage,
    weakestArea,
    recommendations: recommendations.slice(0, 3),
  };
}

export function buildTargetSlots(targets: Target[]) {
  const activeTargets = targets.filter(target => !target.completed);
  const primary = activeTargets.find(target => target.isPrimary) ?? activeTargets[0] ?? null;
  const secondary = activeTargets
    .filter(target => target.id !== primary?.id)
    .slice(0, 2);
  const completed = targets
    .filter(target => target.completed)
    .sort((a, b) => new Date(b.completedAt ?? b.deadline).getTime() - new Date(a.completedAt ?? a.deadline).getTime())
    .slice(0, 3);

  return { primary, secondary, completed, activeCount: activeTargets.length };
}

export function getCountdownParts(deadline: string, nowMs: number) {
  const diff = new Date(deadline).getTime() - nowMs;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: false,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
