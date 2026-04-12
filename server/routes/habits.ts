import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { getDb, saveDb } from '../db';

const router = Router();

// GET /api/habits — list all habits
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM habits ORDER BY area, created_at');
  const habits: any[] = [];
  while (stmt.step()) {
    habits.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(habits);
});

// POST /api/habits — create habit
router.post('/', (req: Request, res: Response) => {
  const { name, area } = req.body;
  if (!name || !area) {
    res.status(400).json({ error: 'name and area required' });
    return;
  }
  const db = getDb();
  const id = nanoid(12);
  db.run('INSERT INTO habits (id, name, area) VALUES (?, ?, ?)', [id, name.trim(), area]);
  saveDb();

  const stmt = db.prepare('SELECT * FROM habits WHERE id = ?');
  stmt.bind([id]);
  let habit = null;
  if (stmt.step()) {
    habit = stmt.getAsObject();
  }
  stmt.free();
  res.status(201).json(habit);
});

// DELETE /api/habits/:id — delete habit + cascade check-ins
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  // Check exists
  const stmt = db.prepare('SELECT id FROM habits WHERE id = ?');
  stmt.bind([id]);
  const exists = stmt.step();
  stmt.free();

  if (!exists) {
    res.status(404).json({ error: 'habit not found' });
    return;
  }

  db.run('DELETE FROM checkins WHERE habit_id = ?', [id]);
  db.run('DELETE FROM habits WHERE id = ?', [id]);
  saveDb();
  res.json({ deleted: true });
});

// POST /api/habits/:id/checkin — toggle check-in for a date
router.post('/:id/checkin', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date } = req.body;
  const dateStr = date || new Date().toISOString().split('T')[0];
  const db = getDb();

  // Check if already checked in
  const stmt = db.prepare('SELECT id FROM checkins WHERE habit_id = ? AND date = ?');
  stmt.bind([id, dateStr]);
  const exists = stmt.step();
  stmt.free();

  if (exists) {
    db.run('DELETE FROM checkins WHERE habit_id = ? AND date = ?', [id, dateStr]);
    saveDb();
    res.json({ checked: false, date: dateStr });
  } else {
    db.run('INSERT INTO checkins (habit_id, date) VALUES (?, ?)', [id, dateStr]);
    saveDb();
    res.json({ checked: true, date: dateStr });
  }
});

// GET /api/habits/:id/checkins — all check-in dates for a habit
router.get('/:id/checkins', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const stmt = db.prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date');
  stmt.bind([id]);
  const dates: string[] = [];
  while (stmt.step()) {
    dates.push(stmt.getAsObject().date as string);
  }
  stmt.free();
  res.json(dates);
});

export default router;
