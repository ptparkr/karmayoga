import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

interface HabitRow { id: string; name: string; area: string }
interface CheckinRow { date: string }
interface AreaRow { area: string; total: number; checked: number }
interface ConsistencyRow { total_habits: number; total_checkins: number }

function computeCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a)); // descending
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else if (diff > 1) {
      current = 1;
    }
  }
  return longest;
}

// GET /api/dashboard/streaks — current & longest streak per habit
router.get('/streaks', (_req: Request, res: Response) => {
  const habits = db.prepare('SELECT id, name, area FROM habits').all() as HabitRow[];
  const streaks = habits.map(h => {
    const rows = db.prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date').all(h.id) as CheckinRow[];
    const dates = rows.map(r => r.date);
    return {
      habitId: h.id,
      name: h.name,
      area: h.area,
      currentStreak: computeCurrentStreak(dates),
      longestStreak: computeLongestStreak(dates),
      totalCheckins: dates.length,
    };
  });
  res.json(streaks);
});

// GET /api/dashboard/weekly — this week's completion matrix
router.get('/weekly', (_req: Request, res: Response) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const habits = db.prepare('SELECT id, name, area FROM habits').all() as HabitRow[];
  const matrix = habits.map(h => {
    const rows = db.prepare(
      'SELECT date FROM checkins WHERE habit_id = ? AND date >= ? AND date <= ?'
    ).all(h.id, weekDates[0], weekDates[6]) as CheckinRow[];
    const checkedDates = new Set(rows.map(r => r.date));
    return {
      habitId: h.id,
      name: h.name,
      area: h.area,
      days: weekDates.map(d => ({ date: d, checked: checkedDates.has(d) })),
    };
  });
  res.json({ weekDates, matrix });
});

// GET /api/dashboard/areas — completion % grouped by area of life
router.get('/areas', (_req: Request, res: Response) => {
  // For each area: total possible check-ins (habits × 30 days) vs actual
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const areas = db.prepare(`
    SELECT h.area,
      COUNT(DISTINCT h.id) as total,
      COUNT(c.id) as checked
    FROM habits h
    LEFT JOIN checkins c ON c.habit_id = h.id AND c.date >= ?
    GROUP BY h.area
  `).all(thirtyDaysAgo) as AreaRow[];

  const result = areas.map(a => ({
    area: a.area,
    habitCount: a.total,
    checkins: a.checked,
    possible: a.total * 30,
    percentage: a.total > 0 ? Math.round((a.checked / (a.total * 30)) * 100) : 0,
  }));
  res.json(result);
});

// GET /api/dashboard/consistency — overall consistency % (last 30 days)
router.get('/consistency', (_req: Request, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM habits) as total_habits,
      COUNT(*) as total_checkins
    FROM checkins
    WHERE date >= ?
  `).get(thirtyDaysAgo) as ConsistencyRow;

  const possible = (row.total_habits || 0) * 30;
  const percentage = possible > 0 ? Math.round((row.total_checkins / possible) * 100) : 0;
  res.json({
    totalHabits: row.total_habits,
    totalCheckins: row.total_checkins,
    possible,
    percentage,
    missed: possible - row.total_checkins,
  });
});

export default router;
