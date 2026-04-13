import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db';
import { toDateStr, getDaysAgo, getCurrentTimeInfo } from '../utils/time';

const router = Router();

// POST /api/pomodoro — log a completed session
router.post('/', (req: Request, res: Response) => {
  const { focus_min, break_min, completed, area } = req.body;
  if (!focus_min) {
    res.status(400).json({ error: 'focus_min required' });
    return;
  }
  const db = getDb();
  db.run(
    'INSERT INTO pomodoro_sessions (focus_min, break_min, completed, area) VALUES (?, ?, ?, ?)',
    [focus_min, break_min || 0, completed ? 1 : 0, area || 'other']
  );
  saveDb();
  res.status(201).json({ success: true });
});

// GET /api/pomodoro/today — sessions completed today
router.get('/today', (_req: Request, res: Response) => {
  const today = toDateStr();
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM pomodoro_sessions WHERE date(created_at, 'localtime') = ? ORDER BY created_at DESC");
  stmt.bind([today]);
  const sessions: any[] = [];
  while (stmt.step()) {
    sessions.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(sessions);
});

// GET /api/pomodoro/analytics — focus analytics
router.get('/analytics', (req: Request, res: Response) => {
  const db = getDb();
  const { startDate, endDate } = req.query;

  // If date range provided, use it; otherwise default to current week
  let rangeStart: string;
  let rangeEnd: string;
  let daysCount: number;

  if (startDate && endDate) {
    rangeStart = startDate as string;
    rangeEnd = endDate as string;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  } else {
    const timeInfo = getCurrentTimeInfo();
    rangeStart = toDateStr(timeInfo.weekStart);
    rangeEnd = toDateStr(timeInfo.weekEnd);
    daysCount = 7;
  }

  // Focus by Area (last 30 days from rangeStart)
  const thirtyDaysAgo = getDaysAgo(30);
  const areaStmt = db.prepare(`
    SELECT area, SUM(focus_min) as total_min
    FROM pomodoro_sessions
    WHERE completed = 1 AND date(created_at) >= ?
    GROUP BY area
  `);
  areaStmt.bind([thirtyDaysAgo]);
  const byArea: any[] = [];
  while (areaStmt.step()) {
    byArea.push(areaStmt.getAsObject());
  }
  areaStmt.free();

  // Focus by Day for the requested date range
  const dailyStmt = db.prepare(`
    SELECT date(created_at) as date, SUM(focus_min) as total_min
    FROM pomodoro_sessions
    WHERE completed = 1 AND date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?
    GROUP BY date(created_at, 'localtime')
  `);
  dailyStmt.bind([rangeStart, rangeEnd]);
  const byDayRaw: any[] = [];
  while (dailyStmt.step()) {
    byDayRaw.push(dailyStmt.getAsObject());
  }
  dailyStmt.free();

  // Generate all dates in range
  const weekDays: any[] = [];
  const start = new Date(rangeStart + 'T00:00:00');
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    const match = byDayRaw.find(r => r.date === dStr);
    weekDays.push({
      date: dStr,
      minutes: match ? match.total_min : 0
    });
  }

  res.json({ byArea, weekDays });
});

export default router;
