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
  const stmt = db.prepare("SELECT * FROM pomodoro_sessions WHERE date(created_at) = ? ORDER BY created_at DESC");
  stmt.bind([today]);
  const sessions: any[] = [];
  while (stmt.step()) {
    sessions.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(sessions);
});

// GET /api/pomodoro/analytics — focus analytics
router.get('/analytics', (_req: Request, res: Response) => {
  const db = getDb();

  // Focus by Area (last 30 days)
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

  // Focus by Day (for Activity Map - current week)
  const timeInfo = getCurrentTimeInfo();
  const weekStart = toDateStr(timeInfo.weekStart);
  const monday = new Date(timeInfo.weekStart);

  const dailyStmt = db.prepare(`
    SELECT date(created_at) as date, SUM(focus_min) as total_min
    FROM pomodoro_sessions
    WHERE completed = 1 AND date(created_at) >= ?
    GROUP BY date(created_at)
  `);
  dailyStmt.bind([weekStart]);
  const byDayRaw: any[] = [];
  while (dailyStmt.step()) {
    byDayRaw.push(dailyStmt.getAsObject());
  }
  dailyStmt.free();

  // Ensure all 7 days are represented for the weekly view
  const weekDays: any[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
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
