"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nanoid_1 = require("nanoid");
const db_1 = require("../db");
const time_1 = require("../utils/time");
const router = (0, express_1.Router)();
// GET /api/habits — list all habits
router.get('/', (_req, res) => {
    const db = (0, db_1.getDb)();
    const stmt = db.prepare('SELECT * FROM habits ORDER BY area, created_at');
    const habits = [];
    while (stmt.step()) {
        habits.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(habits);
});
// POST /api/habits — create habit
router.post('/', (req, res) => {
    const { name, area, targetDays } = req.body;
    if (!name || !area) {
        res.status(400).json({ error: 'name and area required' });
        return;
    }
    const db = (0, db_1.getDb)();
    const id = (0, nanoid_1.nanoid)(12);
    const days = Array.isArray(targetDays) ? JSON.stringify(targetDays) : '[0,1,2,3,4,5,6]';
    db.run('INSERT INTO habits (id, name, area, target_days) VALUES (?, ?, ?, ?)', [id, name.trim(), area, days]);
    (0, db_1.saveDb)();
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
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = (0, db_1.getDb)();
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
    (0, db_1.saveDb)();
    res.json({ deleted: true });
});
// POST /api/habits/:id/checkin — toggle check-in for a date
router.post('/:id/checkin', (req, res) => {
    const { id } = req.params;
    const { date } = req.body;
    const dateStr = date || (0, time_1.toDateStr)();
    const db = (0, db_1.getDb)();
    // Check if already checked in
    const stmt = db.prepare('SELECT id FROM checkins WHERE habit_id = ? AND date = ?');
    stmt.bind([id, dateStr]);
    const exists = stmt.step();
    stmt.free();
    if (exists) {
        db.run('DELETE FROM checkins WHERE habit_id = ? AND date = ?', [id, dateStr]);
        (0, db_1.saveDb)();
        res.json({ checked: false, date: dateStr });
    }
    else {
        db.run('INSERT INTO checkins (habit_id, date) VALUES (?, ?)', [id, dateStr]);
        (0, db_1.saveDb)();
        res.json({ checked: true, date: dateStr });
    }
});
// GET /api/habits/:id/checkins — all check-in dates for a habit
router.get('/:id/checkins', (req, res) => {
    const { id } = req.params;
    const db = (0, db_1.getDb)();
    const stmt = db.prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date');
    stmt.bind([id]);
    const dates = [];
    while (stmt.step()) {
        dates.push(stmt.getAsObject().date);
    }
    stmt.free();
    res.json(dates);
});
// GET /api/habits/:id/streak — get current and longest streak for a habit
router.get('/:id/streak', (req, res) => {
    const { id } = req.params;
    const db = (0, db_1.getDb)();
    // Get all checkins for this habit, ordered by date
    const stmt = db.prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date DESC');
    stmt.bind([id]);
    const dates = [];
    while (stmt.step()) {
        dates.push(stmt.getAsObject().date);
    }
    stmt.free();
    if (dates.length === 0) {
        res.json({ currentStreak: 0, longestStreak: 0, totalCheckins: 0, lastCheckinDate: null });
        return;
    }
    // Calculate current streak (consecutive days from today/yesterday going backwards)
    let currentStreak = 0;
    const today = (0, time_1.toDateStr)(new Date());
    const yesterday = (0, time_1.toDateStr)((0, time_1.addDays)(new Date(), -1));
    let cursorDate = today;
    if (!dates.includes(today) && !dates.includes(yesterday)) {
        // No checkin today or yesterday, current streak is 0
        cursorDate = '';
    }
    else {
        cursorDate = dates.includes(today) ? today : yesterday;
        while (dates.includes(cursorDate)) {
            currentStreak++;
            cursorDate = (0, time_1.toDateStr)((0, time_1.addDays)(cursorDate, -1));
        }
    }
    // Calculate longest streak
    let longestStreak = 0;
    let streak = 0;
    const sortedDates = [...dates].sort();
    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            streak = 1;
        }
        else {
            const prev = new Date(sortedDates[i - 1]);
            const curr = new Date(sortedDates[i]);
            const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
            if (diff === 1) {
                streak++;
            }
            else {
                streak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, streak);
    }
    res.json({
        currentStreak,
        longestStreak,
        totalCheckins: dates.length,
        lastCheckinDate: dates[0] || null,
    });
});
// GET /api/habits/leaderboard — get all habits with streaks sorted
router.get('/leaderboard', (_req, res) => {
    const db = (0, db_1.getDb)();
    // Get all habits with their checkins
    const habitsStmt = db.prepare('SELECT id, name, area FROM habits ORDER BY area, name');
    const habits = [];
    while (habitsStmt.step()) {
        habits.push(habitsStmt.getAsObject());
    }
    habitsStmt.free();
    const results = habits.map(habit => {
        // Get all checkins for this habit
        const checkinStmt = db.prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date DESC');
        checkinStmt.bind([habit.id]);
        const dates = [];
        while (checkinStmt.step()) {
            dates.push(checkinStmt.getAsObject().date);
        }
        checkinStmt.free();
        if (dates.length === 0) {
            return { habitId: habit.id, name: habit.name, area: habit.area, currentStreak: 0, longestStreak: 0 };
        }
        // Calculate current streak
        let currentStreak = 0;
        const today = (0, time_1.toDateStr)(new Date());
        const yesterday = (0, time_1.toDateStr)((0, time_1.addDays)(new Date(), -1));
        let cursorDate = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : '');
        while (cursorDate && dates.includes(cursorDate)) {
            currentStreak++;
            cursorDate = (0, time_1.toDateStr)((0, time_1.addDays)(cursorDate, -1));
        }
        // Calculate longest streak
        let longestStreak = 0;
        let streak = 0;
        const sortedDates = [...dates].sort();
        for (let i = 0; i < sortedDates.length; i++) {
            if (i === 0) {
                streak = 1;
            }
            else {
                const prev = new Date(sortedDates[i - 1]);
                const curr = new Date(sortedDates[i]);
                const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
                if (diff === 1) {
                    streak++;
                }
                else {
                    streak = 1;
                }
            }
            longestStreak = Math.max(longestStreak, streak);
        }
        return {
            habitId: habit.id,
            name: habit.name,
            area: habit.area,
            currentStreak,
            longestStreak,
        };
    });
    // Sort by current streak descending
    results.sort((a, b) => b.currentStreak - a.currentStreak);
    res.json(results);
});
// PUT /api/habits/:id/target-days — update scheduled days for a habit
router.put('/:id/target-days', (req, res) => {
    const { id } = req.params;
    const { targetDays } = req.body;
    if (!Array.isArray(targetDays)) {
        res.status(400).json({ error: 'targetDays must be an array of day indices (0-6)' });
        return;
    }
    const db = (0, db_1.getDb)();
    const targetDaysJson = JSON.stringify(targetDays);
    db.run('UPDATE habits SET target_days = ? WHERE id = ?', [targetDaysJson, id]);
    (0, db_1.saveDb)();
    res.json({ success: true, targetDays });
});
// GET /api/habits/:id/checkins/range?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:id/checkins/range', (req, res) => {
    const { id } = req.params;
    const { start, end } = req.query;
    const db = (0, db_1.getDb)();
    let stmt;
    if (start && end) {
        stmt = db.prepare('SELECT date FROM checkins WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date');
        stmt.bind([id, start, end]);
    }
    else {
        stmt = db.prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date');
        stmt.bind([id]);
    }
    const dates = [];
    while (stmt.step()) {
        dates.push(stmt.getAsObject().date);
    }
    stmt.free();
    res.json(dates);
});
exports.default = router;
