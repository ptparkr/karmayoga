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
      area        TEXT NOT NULL DEFAULT 'other',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migration: add area column to pomodoro_sessions if missing
  try {
    db.run('ALTER TABLE pomodoro_sessions ADD COLUMN area TEXT NOT NULL DEFAULT "other"');
  } catch (e) {
    // Column likely already exists
  }


  db.run(`
    CREATE TABLE IF NOT EXISTS areas (
      name  TEXT PRIMARY KEY,
      color TEXT NOT NULL
    )
  `);

  // Seed default area colors if empty
  const areaCount = db.prepare('SELECT COUNT(*) as c FROM areas');
  areaCount.step();
  const count = (areaCount.getAsObject() as any).c;
  areaCount.free();

  if (count === 0) {
    const defaults = [
      ['health', '#3fb950'],
      ['career', '#58a6ff'],
      ['mind', '#bc8cff'],
      ['social', '#f0883e'],
      ['finance', '#39d2c0'],
    ];
    for (const [name, color] of defaults) {
      db.run('INSERT INTO areas (name, color) VALUES (?, ?)', [name, color]);
    }
    saveDb();
  }

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
