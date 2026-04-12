import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

function queryAll(sql: string, params: any[] = []): any[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql: string, params: any[] = []): any | null {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function computeCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
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
    if (Math.round(diff) === 1) {
      current++;
      if (current > longest) longest = current;
    } else if (diff > 1) {
      current = 1;
    }
  }
  return longest;
}

// GET /api/dashboard/streaks
router.get('/streaks', (_req: Request, res: Response) => {
  const habits = queryAll('SELECT id, name, area FROM habits');
  const streaks = habits.map(h => {
    const rows = queryAll('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date', [h.id]);
    const dates = rows.map((r: any) => r.date);
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

// GET /api/dashboard/weekly
router.get('/weekly', (_req: Request, res: Response) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const habits = queryAll('SELECT id, name, area FROM habits');
  const matrix = habits.map(h => {
    const rows = queryAll(
      'SELECT date FROM checkins WHERE habit_id = ? AND date >= ? AND date <= ?',
      [h.id, weekDates[0], weekDates[6]]
    );
    const checkedDates = new Set(rows.map((r: any) => r.date));
    return {
      habitId: h.id,
      name: h.name,
      area: h.area,
      days: weekDates.map(d => ({ date: d, checked: checkedDates.has(d) })),
    };
  });
  res.json({ weekDates, matrix });
});

// GET /api/dashboard/areas
router.get('/areas', (_req: Request, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const areas = queryAll(`
    SELECT h.area,
      COUNT(DISTINCT h.id) as total,
      COUNT(c.id) as checked
    FROM habits h
    LEFT JOIN checkins c ON c.habit_id = h.id AND c.date >= ?
    GROUP BY h.area
  `, [thirtyDaysAgo]);

  const result = areas.map((a: any) => ({
    area: a.area,
    habitCount: a.total,
    checkins: a.checked,
    possible: a.total * 30,
    percentage: a.total > 0 ? Math.round((a.checked / (a.total * 30)) * 100) : 0,
  }));
  res.json(result);
});

// GET /api/dashboard/consistency
router.get('/consistency', (_req: Request, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const row = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM habits) as total_habits,
      COUNT(*) as total_checkins
    FROM checkins
    WHERE date >= ?
  `, [thirtyDaysAgo]);

  const totalHabits = row?.total_habits || 0;
  const totalCheckins = row?.total_checkins || 0;
  const possible = totalHabits * 30;
  const percentage = possible > 0 ? Math.round((totalCheckins / possible) * 100) : 0;
  res.json({
    totalHabits,
    totalCheckins,
    possible,
    percentage,
    missed: possible - totalCheckins,
  });
});

export default router;
