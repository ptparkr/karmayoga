import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'karma-yoga.db');

let db: Database;

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      area       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (date('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS checkins (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id  TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date      TEXT NOT NULL,
      UNIQUE(habit_id, date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      focus_min   INTEGER NOT NULL,
      break_min   INTEGER NOT NULL,
      completed   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function saveDb(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}
