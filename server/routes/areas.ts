import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db';

const router = Router();

// GET /api/areas — list all areas with colors
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM areas ORDER BY name');
  const areas: any[] = [];
  while (stmt.step()) {
    areas.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(areas);
});

// PUT /api/areas/:name — update area color
router.put('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const { color } = req.body;
  if (!color) {
    res.status(400).json({ error: 'color required' });
    return;
  }
  const db = getDb();

  // Upsert: update if exists, insert if not
  const stmt = db.prepare('SELECT name FROM areas WHERE name = ?');
  stmt.bind([name]);
  const exists = stmt.step();
  stmt.free();

  if (exists) {
    db.run('UPDATE areas SET color = ? WHERE name = ?', [color, name]);
  } else {
    db.run('INSERT INTO areas (name, color) VALUES (?, ?)', [name, color]);
  }
  saveDb();
  res.json({ name, color });
});

// DELETE /api/areas/:name — delete area and cascade to habits
router.delete('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const db = getDb();
  
  // Find all habit IDs for this area
  const stmt = db.prepare('SELECT id FROM habits WHERE area = ?');
  stmt.bind([name]);
  const habitIds: string[] = [];
  while (stmt.step()) {
    habitIds.push(stmt.getAsObject().id as string);
  }
  stmt.free();

  // Delete all checkins for these habits
  for (const id of habitIds) {
    db.run('DELETE FROM checkins WHERE habit_id = ?', [id]);
  }

  // Delete the habits
  db.run('DELETE FROM habits WHERE area = ?', [name]);

  // Delete the area
  db.run('DELETE FROM areas WHERE name = ?', [name]);

  saveDb();
  res.json({ deleted: true });
});

export default router;
