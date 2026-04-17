import { PieChart } from '../PieChart';
import { buildTodayFocusSegments } from '../../lib/dashboard';
import type { FocusAnalytics } from '../../types';

interface Props {
  focusAnalytics: FocusAnalytics | null;
  getColor: (area: string) => string;
}

export function FocusAreaRing({ focusAnalytics, getColor }: Props) {
  const segments = buildTodayFocusSegments(focusAnalytics?.byArea ?? []).map(area => ({
    label: area.area,
    value: area.total_min,
    color: getColor(area.area),
  }));

  const totalMinutes = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="card dashboard-card dashboard-focus-card">
      <div className="dashboard-card-header">
        <div>
          <div className="card-title">Focus Area Breakdown</div>
          <p className="dashboard-card-subtitle">Today&apos;s completed focus minutes by area.</p>
        </div>
      </div>

      {totalMinutes > 0 ? (
        <div className="focus-ring-body">
          <PieChart segments={segments} label={`${totalMinutes} min today`} size={220} />
          <div className="focus-ring-summary">
            <span className="focus-ring-total">{totalMinutes}</span>
            <span className="focus-ring-caption">minutes logged today</span>
          </div>
        </div>
      ) : (
        <div className="empty-state dashboard-empty">
          <span className="empty-text">Log a focus session to light up today&apos;s ring.</span>
        </div>
      )}
    </div>
  );
}
