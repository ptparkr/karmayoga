"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const DEFAULT_AXES = [
    'body', 'mind', 'soul', 'growth', 'money',
    'mission', 'romance', 'family', 'friends', 'joy',
];
// GET /api/wheel — get current axes + snapshots
router.get('/', (_req, res) => {
    const db = (0, db_1.getDb)();
    // Load axes
    const axesStmt = db.prepare('SELECT * FROM wheel_axes ORDER BY id');
    const axes = [];
    while (axesStmt.step()) {
        const row = axesStmt.getAsObject();
        axes.push({
            id: row.id,
            currentScore: row.current_score,
            targetScore: row.target_score,
        });
    }
    axesStmt.free();
    // Load snapshots (last 12)
    const snapStmt = db.prepare('SELECT * FROM wheel_snapshots ORDER BY date DESC LIMIT 12');
    const snapshots = [];
    while (snapStmt.step()) {
        const row = snapStmt.getAsObject();
        try {
            snapshots.push({
                id: row.id,
                date: row.date,
                scores: JSON.parse(row.scores),
            });
        }
        catch {
            // skip malformed rows
        }
    }
    snapStmt.free();
    // Reverse so oldest first
    snapshots.reverse();
    res.json({ axes, snapshots });
});
// PUT /api/wheel/axis/:id — update a single axis score
router.put('/axis/:id', (req, res) => {
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
    const db = (0, db_1.getDb)();
    const col = type === 'current' ? 'current_score' : 'target_score';
    // Check if axis exists
    const checkStmt = db.prepare('SELECT id FROM wheel_axes WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) {
        res.status(404).json({ error: `Axis "${id}" not found` });
        return;
    }
    db.run(`UPDATE wheel_axes SET ${col} = ? WHERE id = ?`, [score, id]);
    (0, db_1.saveDb)();
    // Return updated axis
    const stmt = db.prepare('SELECT * FROM wheel_axes WHERE id = ?');
    stmt.bind([id]);
    let axis = null;
    if (stmt.step()) {
        const row = stmt.getAsObject();
        axis = {
            id: row.id,
            currentScore: row.current_score,
            targetScore: row.target_score,
        };
    }
    stmt.free();
    res.json(axis);
});
// POST /api/wheel/snapshot — save a snapshot of current scores
router.post('/snapshot', (_req, res) => {
    const db = (0, db_1.getDb)();
    const today = new Date().toISOString().slice(0, 10);
    const id = crypto.randomUUID();
    // Gather current scores from all axes
    const axesStmt = db.prepare('SELECT id, current_score FROM wheel_axes');
    const scores = {};
    while (axesStmt.step()) {
        const row = axesStmt.getAsObject();
        scores[row.id] = row.current_score;
    }
    axesStmt.free();
    db.run('INSERT INTO wheel_snapshots (id, date, scores) VALUES (?, ?, ?)', [id, today, JSON.stringify(scores)]);
    (0, db_1.saveDb)();
    res.json({ id, date: today, scores });
});
// GET /api/wheel/snapshots — get snapshot history
router.get('/snapshots', (req, res) => {
    const weeks = parseInt(req.query.weeks) || 12;
    const db = (0, db_1.getDb)();
    const stmt = db.prepare(`SELECT * FROM wheel_snapshots ORDER BY date DESC LIMIT ?`);
    stmt.bind([weeks]);
    const snapshots = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        try {
            snapshots.push({
                id: row.id,
                date: row.date,
                scores: JSON.parse(row.scores),
            });
        }
        catch {
            // skip malformed rows
        }
    }
    stmt.free();
    // Reverse so oldest first
    snapshots.reverse();
    res.json(snapshots);
});
exports.default = router;
