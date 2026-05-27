import { Router, Request, Response } from 'express';
import { getOwnerId } from '../auth';
import { getDb, saveDb } from '../db';

const router = Router();

const DEFAULT_AXES = [
  'body', 'mind', 'soul', 'growth', 'money',
  'mission', 'romance', 'family', 'friends', 'joy',
] as const;

function ensureDefaultAxes(ownerId: string) {
  const db = getDb();
  const countStmt = db.prepare('SELECT COUNT(*) as c FROM wheel_axes WHERE owner_id = ?');
  countStmt.bind([ownerId]);
  countStmt.step();
  const count = (countStmt.getAsObject() as any).c;
  countStmt.free();

  if (count > 0) return;

  for (const axisId of DEFAULT_AXES) {
    db.run('INSERT INTO wheel_axes (owner_id, id, current_score, target_score) VALUES (?, ?, 5, 8)', [ownerId, axisId]);
  }
  saveDb();
}

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const ownerId = getOwnerId(req);
  ensureDefaultAxes(ownerId);

  const axesStmt = db.prepare('SELECT * FROM wheel_axes WHERE owner_id = ? ORDER BY id');
  axesStmt.bind([ownerId]);
  const axes: { id: string; currentScore: number; targetScore: number }[] = [];
  while (axesStmt.step()) {
    const row = axesStmt.getAsObject() as any;
    axes.push({
      id: row.id,
      currentScore: row.current_score,
      targetScore: row.target_score,
    });
  }
  axesStmt.free();

  const snapStmt = db.prepare('SELECT * FROM wheel_snapshots WHERE owner_id = ? ORDER BY date DESC LIMIT 12');
  snapStmt.bind([ownerId]);
  const snapshots: { id: string; date: string; scores: Record<string, number> }[] = [];
  while (snapStmt.step()) {
    const row = snapStmt.getAsObject() as any;
    try {
      snapshots.push({
        id: row.id,
        date: row.date,
        scores: JSON.parse(row.scores),
      });
    } catch {
      // Skip malformed rows.
    }
  }
  snapStmt.free();

  snapshots.reverse();
  res.json({ axes, snapshots });
});

router.put('/axis/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { score, type } = req.body;

  if (typeof score !== 'number' || score < 0 || score > 10) {
    res.status(400).json({ error: 'score must be a number between 0 and 10' });
    return;
  }
  if (type !== 'current' && type !== 'target') {
    res.status(400).json({ error: 'type must be "current" or "target"' });
    return;
  }

  const db = getDb();
  const ownerId = getOwnerId(req);
  ensureDefaultAxes(ownerId);
  const col = type === 'current' ? 'current_score' : 'target_score';

  const checkStmt = db.prepare('SELECT id FROM wheel_axes WHERE owner_id = ? AND id = ?');
  checkStmt.bind([ownerId, id]);
  const exists = checkStmt.step();
  checkStmt.free();

  if (!exists) {
    res.status(404).json({ error: `Axis "${id}" not found` });
    return;
  }

  db.run(`UPDATE wheel_axes SET ${col} = ? WHERE owner_id = ? AND id = ?`, [score, ownerId, id]);
  saveDb();

  const stmt = db.prepare('SELECT * FROM wheel_axes WHERE owner_id = ? AND id = ?');
  stmt.bind([ownerId, id]);
  let axis = null;
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    axis = {
      id: row.id,
      currentScore: row.current_score,
      targetScore: row.target_score,
    };
  }
  stmt.free();

  res.json(axis);
});

router.post('/snapshot', (req: Request, res: Response) => {
  const db = getDb();
  const ownerId = getOwnerId(req);
  ensureDefaultAxes(ownerId);
  const today = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();

  const axesStmt = db.prepare('SELECT id, current_score FROM wheel_axes WHERE owner_id = ?');
  axesStmt.bind([ownerId]);
  const scores: Record<string, number> = {};
  while (axesStmt.step()) {
    const row = axesStmt.getAsObject() as any;
    scores[row.id] = row.current_score;
  }
  axesStmt.free();

  db.run(
    'INSERT INTO wheel_snapshots (id, date, scores, owner_id) VALUES (?, ?, ?, ?)',
    [id, today, JSON.stringify(scores), ownerId]
  );
  saveDb();

  res.json({ id, date: today, scores });
});

router.get('/snapshots', (req: Request, res: Response) => {
  const weeks = parseInt(req.query.weeks as string) || 12;
  const db = getDb();
  const ownerId = getOwnerId(req);

  const stmt = db.prepare('SELECT * FROM wheel_snapshots WHERE owner_id = ? ORDER BY date DESC LIMIT ?');
  stmt.bind([ownerId, weeks]);

  const snapshots: { id: string; date: string; scores: Record<string, number> }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    try {
      snapshots.push({
        id: row.id,
        date: row.date,
        scores: JSON.parse(row.scores),
      });
    } catch {
      // Skip malformed rows.
    }
  }
  stmt.free();

  snapshots.reverse();
  res.json(snapshots);
});

export default router;
