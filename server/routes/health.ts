import { getDb, saveDb } from '../db';

interface LongevityInput {
  hrv: number | null;
  restingHR: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  steps: number | null;
}

export function calculateLongevity(
  input: LongevityInput,
  age: number = 25
): { score: number; biologicalAge: number; ageDelta: number; factors: Record<string, number> } {
  // HRV scoring (higher is better, optimal 50-80)
  const hrvScore = input.hrv 
    ? Math.min(100, Math.max(0, (input.hrv / 80) * 100)) 
    : 50;

  // Resting HR scoring (lower is better, optimal 40-60)
  const restingScore = input.restingHR 
    ? Math.min(100, Math.max(0, ((120 - input.restingHR) / 60) * 100)) 
    : 50;

  // Sleep scoring (7-9 hours optimal)
  let sleepScore = 50;
  if (input.sleepHours !== null) {
    if (input.sleepHours >= 7 && input.sleepHours <= 9) {
      sleepScore = 100;
    } else if (input.sleepHours < 7) {
      sleepScore = input.sleepHours * 15;
    } else {
      sleepScore = 100 - (input.sleepHours - 9) * 10;
    }
  }

  // Sleep quality bonus (if provided)
  if (input.sleepQuality !== null) {
    sleepScore = (sleepScore + input.sleepQuality * 20) / 2;
  }

  // Steps scoring (8000+ optimal)
  const stepsScore = input.steps
    ? Math.min(100, (input.steps / 10000) * 100)
    : 50;

  // Weighted average
  const score = Math.round(
    (hrvScore * 0.25) +
    (restingScore * 0.25) +
    (sleepScore * 0.30) +
    (stepsScore * 0.20)
  );

  const biologicalAge = Math.round(age - ((score - 50) * 0.3));
  const ageDelta = biologicalAge - age;

  return {
    score,
    biologicalAge,
    ageDelta,
    factors: {
      hrv: Math.round(hrvScore),
      restingHR: Math.round(restingScore),
      sleep: Math.round(sleepScore),
      steps: Math.round(stepsScore),
    },
  };
}

export function getTodayCheckin() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  
  const stmt = db.prepare('SELECT * FROM health_checkins WHERE date = ?');
  stmt.bind([today]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return {
      hasCheckedIn: true,
      checkin: {
        id: row.id,
        date: row.date,
        hrv: row.hrv,
        sleepHours: row.sleep_hours,
        sleepQuality: row.sleep_quality,
        restingHR: row.resting_hr,
        steps: row.steps,
        energyLevel: row.energy_level,
        moodScore: row.mood_score,
        notes: row.notes || '',
      },
    };
  }
  
  stmt.free();
  return { hasCheckedIn: false, checkin: null };
}

export function createOrUpdateCheckin(data: {
  id?: string;
  date?: string;
  hrv: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  restingHR: number | null;
  steps: number | null;
  energyLevel: number | null;
  moodScore: number | null;
  notes: string;
}) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const date = data.date || new Date().toISOString().slice(0, 10);
  
  db.run(`
    INSERT OR REPLACE INTO health_checkins 
    (id, date, hrv, sleep_hours, sleep_quality, resting_hr, steps, energy_level, mood_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    date,
    data.hrv,
    data.sleepHours,
    data.sleepQuality,
    data.restingHR,
    data.steps,
    data.energyLevel,
    data.moodScore,
    data.notes,
  ]);
  
  saveDb();
  
  return {
    id,
    date,
    hrv: data.hrv,
    sleepHours: data.sleepHours,
    sleepQuality: data.sleepQuality,
    restingHR: data.restingHR,
    steps: data.steps,
    energyLevel: data.energyLevel,
    moodScore: data.moodScore,
    notes: data.notes,
  };
}

export function getHealthTrends(metric: string, days: number = 30) {
  const db = getDb();
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const metricMap: Record<string, string> = {
    hrv: 'hrv',
    sleep: 'sleep_hours',
    restingHR: 'resting_hr',
    energy: 'energy_level',
    mood: 'mood_score',
  };
  
  const col = metricMap[metric];
  if (!col) return [];
  
  const stmt = db.prepare(`
    SELECT date, ${col} as value 
    FROM health_checkins 
    WHERE date BETWEEN ? AND ? AND ${col} IS NOT NULL
    ORDER BY date ASC
  `);
  stmt.bind([startDate, endDate]);
  
  const results: { date: string; value: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({ date: row.date, value: row.value });
  }
  stmt.free();
  
  return results;
}

export function getLongevityScore() {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  // Get average of last 30 days
  const stmt = db.prepare(`
    SELECT 
      AVG(hrv) as avg_hrv,
      AVG(resting_hr) as avg_resting_hr,
      AVG(sleep_hours) as avg_sleep,
      AVG(sleep_quality) as avg_quality,
      AVG(steps) as avg_steps
    FROM health_checkins
    WHERE date >= ?
  `);
  stmt.bind([thirtyDaysAgo]);
  
  let input: LongevityInput = {
    hrv: null,
    restingHR: null,
    sleepHours: null,
    sleepQuality: null,
    steps: null,
  };
  
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    input = {
      hrv: row.avg_hrv,
      restingHR: row.avg_resting_hr,
      sleepHours: row.avg_sleep,
      sleepQuality: row.avg_quality,
      steps: row.avg_steps,
    };
  }
  stmt.free();
  
  return calculateLongevity(input);
}

// Biological markers
export function createMarker(data: {
  id?: string;
  date?: string;
  vo2MaxEstimate: number | null;
  gripStrengthKg: number | null;
  waistCm: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  restingHRAvg: number | null;
}) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const date = data.date || new Date().toISOString().slice(0, 10);
  
  db.run(`
    INSERT INTO bio_markers 
    (id, date, vo2_max, grip_kg, waist_cm, weight_kg, body_fat, resting_hr_avg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    date,
    data.vo2MaxEstimate,
    data.gripStrengthKg,
    data.waistCm,
    data.weightKg,
    data.bodyFatPercent,
    data.restingHRAvg,
  ]);
  
  saveDb();
  
  return {
    id,
    date,
    vo2MaxEstimate: data.vo2MaxEstimate,
    gripStrengthKg: data.gripStrengthKg,
    waistCm: data.waistCm,
    weightKg: data.weightKg,
    bodyFatPercent: data.bodyFatPercent,
    restingHRAvg: data.restingHRAvg,
  };
}

export function getMarkers() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM bio_markers ORDER BY date DESC LIMIT 20');
  
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: row.id,
      date: row.date,
      vo2MaxEstimate: row.vo2_max,
      gripStrengthKg: row.grip_kg,
      waistCm: row.waist_cm,
      weightKg: row.weight_kg,
      bodyFatPercent: row.body_fat,
      restingHRAvg: row.resting_hr_avg,
    });
  }
  stmt.free();
  
  return results;
}

import express from 'express';
const router = express.Router();

router.get('/today', (_req, res) => {
  const result = getTodayCheckin();
  res.json(result);
});

router.post('/checkin', (req, res) => {
  const data = req.body;
  const result = createOrUpdateCheckin(data);
  res.json(result);
});

router.get('/trends/:metric', (req, res) => {
  const { metric } = req.params;
  const days = parseInt(req.query.days as string) || 30;
  const result = getHealthTrends(metric, days);
  res.json(result);
});

router.get('/longevity', (_req, res) => {
  const result = getLongevityScore();
  res.json(result);
});

router.post('/markers', (req, res) => {
  const data = req.body;
  const result = createMarker(data);
  res.json(result);
});

router.get('/markers', (_req, res) => {
  const result = getMarkers();
  res.json(result);
});

export default router;