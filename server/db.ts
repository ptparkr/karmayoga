import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'karma-yoga.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    area       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id  TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date      TEXT NOT NULL,
    UNIQUE(habit_id, date)
  );

  CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    focus_min   INTEGER NOT NULL,
    break_min   INTEGER NOT NULL,
    completed   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
