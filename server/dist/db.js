"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.getDb = getDb;
exports.saveDb = saveDb;
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function resolveSqlJsLocateFile(file) {
    const candidates = [
        path_1.default.join(process.cwd(), 'server', 'node_modules', 'sql.js', 'dist', file),
        path_1.default.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
        path_1.default.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
        path_1.default.join('/var/task/server/node_modules/sql.js/dist', file),
    ];
    for (const candidate of candidates) {
        if (fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    try {
        return require.resolve(`sql.js/dist/${file}`);
    }
    catch {
        return file;
    }
}
function resolveDbPath() {
    if (process.env.KARMA_DB_PATH) {
        return process.env.KARMA_DB_PATH;
    }
    const dbFileName = process.env.KARMA_DB_FILE || 'karma-yoga.db';
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        const tempDir = process.env.TMPDIR || '/tmp';
        return path_1.default.join(tempDir, dbFileName);
    }
    const cwd = process.cwd();
    const workspaceRoot = path_1.default.basename(cwd).toLowerCase() === 'server'
        ? path_1.default.resolve(cwd, '..')
        : cwd;
    return path_1.default.join(workspaceRoot, dbFileName);
}
const DB_PATH = resolveDbPath();
let db;
async function initDb() {
    const SQL = await sql_js_1.default({
        locateFile: resolveSqlJsLocateFile,
    });
    if (fs_1.default.existsSync(DB_PATH)) {
        const buffer = fs_1.default.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    }
    else {
        db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');
    db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      area       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (date('now')),
      target_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]'
    )
  `);
    // Migration: add target_days if missing
    try {
        db.run('ALTER TABLE habits ADD COLUMN target_days TEXT');
    }
    catch (e) {
        // Column likely already exists
    }
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
      intention  TEXT,
      quality    INTEGER,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
    // Migration: add intention and quality columns if missing
    try {
        db.run('ALTER TABLE pomodoro_sessions ADD COLUMN intention TEXT');
    }
    catch (e) {
        // Column likely already exists
    }
    try {
        db.run('ALTER TABLE pomodoro_sessions ADD COLUMN quality INTEGER');
    }
    catch (e) {
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
    const count = areaCount.getAsObject().c;
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
    // Health tables
    db.run(`
    CREATE TABLE IF NOT EXISTS health_checkins (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL UNIQUE,
      hrv         INTEGER,
      sleep_hours REAL,
      sleep_quality INTEGER,
      resting_hr  INTEGER,
      steps       INTEGER,
      energy_level INTEGER,
      mood_score  INTEGER,
      notes       TEXT DEFAULT ''
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS bio_markers (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      vo2_max     REAL,
      grip_kg     REAL,
      waist_cm    REAL,
      weight_kg   REAL,
      body_fat    REAL,
      resting_hr_avg INTEGER
    )
  `);
    // Wheel of Life tables
    db.run(`
    CREATE TABLE IF NOT EXISTS wheel_axes (
      id            TEXT PRIMARY KEY,
      current_score INTEGER NOT NULL DEFAULT 5,
      target_score  INTEGER NOT NULL DEFAULT 8
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS wheel_snapshots (
      id     TEXT PRIMARY KEY,
      date   TEXT NOT NULL,
      scores TEXT NOT NULL
    )
  `);
    // Seed default wheel axes if empty
    const wheelCount = db.prepare('SELECT COUNT(*) as c FROM wheel_axes');
    wheelCount.step();
    const wheelAxisCount = wheelCount.getAsObject().c;
    wheelCount.free();
    if (wheelAxisCount === 0) {
        const defaultAxes = [
            'body', 'mind', 'soul', 'growth', 'money',
            'mission', 'romance', 'family', 'friends', 'joy',
        ];
        for (const axisId of defaultAxes) {
            db.run('INSERT INTO wheel_axes (id, current_score, target_score) VALUES (?, 5, 8)', [axisId]);
        }
        saveDb();
    }
    return db;
}
function getDb() {
    if (!db)
        throw new Error('Database not initialized. Call initDb() first.');
    return db;
}
function saveDb() {
    fs_1.default.mkdirSync(path_1.default.dirname(DB_PATH), { recursive: true });
    const data = db.export();
    const buffer = Buffer.from(data);
    fs_1.default.writeFileSync(DB_PATH, buffer);
}
