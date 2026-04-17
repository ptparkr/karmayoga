import type { LeaderboardEntry } from '../types';

interface Props {
  entries: LeaderboardEntry[];
  areaColors: Record<string, string>;
}

export function StreakLeaderboard({ entries, areaColors }: Props) {
  if (entries.length === 0) {
    return (
      <div className="streak-leaderboard-empty">
        <span>No streaks yet. Complete some habits to get on the board!</span>
      </div>
    );
  }

  return (
    <div className="streak-leaderboard">
      <div className="leaderboard-header">
        <span className="col-rank">#</span>
        <span className="col-name">Habit</span>
        <span className="col-area">Area</span>
        <span className="col-streak">Current</span>
        <span className="col-best">Best</span>
      </div>
      <div className="leaderboard-body">
        {entries.slice(0, 10).map((entry, index) => (
          <div key={entry.habitId} className="leaderboard-row animate-in">
            <span className="col-rank">{index + 1}</span>
            <span className="col-name">{entry.name}</span>
            <span 
              className="col-area" 
              style={{ color: areaColors[entry.area] || '#888' }}
            >
              {entry.area}
            </span>
            <span className="col-streak">
              {entry.currentStreak > 0 ? `🔥 ${entry.currentStreak}d` : '-'}
            </span>
            <span className="col-best">{entry.longestStreak}d</span>
          </div>
        ))}
      </div>
    </div>
  );
}