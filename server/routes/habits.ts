import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import db from '../db';

const router = Router();

// GET /api/habits — list all habits
router.get('/', (_req: Request, res: Response) => {
  const habits = db.prepare('SELECT * FROM habits ORDER BY area, created_at').all();
  res.json(habits);
});

// POST /api/habits — create habit
router.post('/', (req: Request, res: Response) => {
  const { name, area } = req.body;
  if (!name || !area) {
    res.status(400).json({ error: 'name and area required' });
    return;
  }
  const id = nanoid(12);
  db.prepare('INSERT INTO habits (id, name, area) VALUES (?, ?, ?)').run(id, name.trim(), area);
  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
  res.status(201).json(habit);
});

// DELETE /api/habits/:id — delete habit + cascade check-ins
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM habits WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'habit not found' });
    return;
  }
  res.json({ deleted: true });
});

// POST /api/habits/:id/checkin — toggle check-in for a date
router.post('/:id/checkin', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date } = req.body;
  const dateStr = date || new Date().toISOString().split('T')[0];

  // Check if already checked in
  const existing = db.prepare('SELECT id FROM checkins WHERE habit_id = ? AND date = ?').get(id, dateStr);

  if (existing) {
    // Toggle off
    db.prepare('DELETE FROM checkins WHERE habit_id = ? AND date = ?').run(id, dateStr);
    res.json({ checked: false, date: dateStr });
  } else {
    // Toggle on
    db.prepare('INSERT INTO checkins (habit_id, date) VALUES (?, ?)').run(id, dateStr);
    res.json({ checked: true, date: dateStr });
  }
});

// GET /api/habits/:id/checkins — all check-in dates for a habit
router.get('/:id/checkins', (req: Request, res: Response) => {
  const { id } = req.params;
  const rows = db.prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date').all(id) as { date: string }[];
  res.json(rows.map(r => r.date));
});

export default router;
