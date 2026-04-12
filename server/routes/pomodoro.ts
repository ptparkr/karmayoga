import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

interface SessionRow {
  id: number;
  focus_min: number;
  break_min: number;
  completed: number;
  created_at: string;
}

// POST /api/pomodoro — log a completed session
router.post('/', (req: Request, res: Response) => {
  const { focus_min, break_min, completed } = req.body;
  if (!focus_min) {
    res.status(400).json({ error: 'focus_min required' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO pomodoro_sessions (focus_min, break_min, completed) VALUES (?, ?, ?)'
  ).run(focus_min, break_min || 0, completed ? 1 : 0);

  res.status(201).json({ id: result.lastInsertRowid });
});

// GET /api/pomodoro/today — sessions completed today
router.get('/today', (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const sessions = db.prepare(
    "SELECT * FROM pomodoro_sessions WHERE date(created_at) = ? ORDER BY created_at DESC"
  ).all(today) as SessionRow[];
  res.json(sessions);
});

export default router;
