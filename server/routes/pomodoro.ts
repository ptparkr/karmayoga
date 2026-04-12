import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db';

const router = Router();

// POST /api/pomodoro — log a completed session
router.post('/', (req: Request, res: Response) => {
  const { focus_min, break_min, completed } = req.body;
  if (!focus_min) {
    res.status(400).json({ error: 'focus_min required' });
    return;
  }
  const db = getDb();
  db.run(
    'INSERT INTO pomodoro_sessions (focus_min, break_min, completed) VALUES (?, ?, ?)',
    [focus_min, break_min || 0, completed ? 1 : 0]
  );
  saveDb();
  res.status(201).json({ success: true });
});

// GET /api/pomodoro/today — sessions completed today
router.get('/today', (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
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

export default router;
