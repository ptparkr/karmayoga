import { useHealth } from '../hooks/useHealth';
import type { BiologicalMarker } from '../types';

export function HealthPage() {
  const { todayStatus, longevity, trends, markers, loading, submitCheckin, addMarker, refresh } = useHealth();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="app-main">
        <div className="empty-state"><span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>...</span></div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <div className="page-header">
        <h1 className="page-title">Health</h1>
        <p className="page-subtitle">{today}</p>
      </div>

      <div className="health-grid">
        <div className="health-card">
          <div className="card-title">Morning Check-in</div>
          {todayStatus.hasCheckedIn ? (
            <div className="checkin-summary">
              <div className="checkin-done">✓ Checked in today</div>
              <div className="checkin-quick-stats">
                {todayStatus.checkin?.sleepHours && (
                  <span>💤 {todayStatus.checkin.sleepHours}h</span>
                )}
                {todayStatus.checkin?.energyLevel && (
                  <span>⚡ {todayStatus.checkin.energyLevel}/5</span>
                )}
                {todayStatus.checkin?.moodScore && (
                  <span>😊 {todayStatus.checkin.moodScore}/5</span>
                )}
              </div>
            </div>
          ) : (
            <CheckinForm onSubmit={submitCheckin} />
          )}
        </div>

        <div className="health-card">
          <div className="card-title">Longevity Score</div>
          {longevity ? (
            <div className="longevity-display">
              <div className="longevity-main">
                <div className="longevity-bio-age">
                  <span className="label">Biological Age</span>
                  <span className="value">{longevity.biologicalAge} yrs</span>
                </div>
                <div className={`longevity-delta ${longevity.ageDelta < 0 ? 'positive' : 'negative'}`}>
                  {longevity.ageDelta < 0 ? '↓' : '↑'} {Math.abs(longevity.ageDelta)} years {longevity.ageDelta < 0 ? 'younger' : 'older'}
                </div>
              </div>
              <div className="longevity-score">
                <span className="score-value">{longevity.score}</span>
                <span className="score-max">/100</span>
              </div>
              <div className="longevity-factors">
                <div className="factor"><span>HRV</span><span>{longevity.factors.hrv}</span></div>
                <div className="factor"><span>Resting HR</span><span>{longevity.factors.restingHR}</span></div>
                <div className="factor"><span>Sleep</span><span>{longevity.factors.sleep}</span></div>
                <div className="factor"><span>Steps</span><span>{longevity.factors.steps}</span></div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <span>Log check-ins to calculate your longevity score</span>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-title">30-Day Trends</div>
        <div className="trends-row">
          <TrendCard label="HRV" data={trends.hrv} unit="" />
          <TrendCard label="Sleep" data={trends.sleep} unit="h" />
          <TrendCard label="Resting HR" data={trends.restingHR} unit="" />
          <TrendCard label="Energy" data={trends.energy} unit="/5" />
          <TrendCard label="Mood" data={trends.mood} unit="/5" />
        </div>
      </div>

      <div className="section">
        <div className="section-title">Monthly Markers</div>
        <div className="marker-form-card">
          <MarkerForm onSubmit={addMarker} />
        </div>
        {markers.length > 0 && (
          <div className="marker-list">
            {markers.slice(0, 5).map((marker: BiologicalMarker) => (
              <div key={marker.id} className="marker-item">
                <span className="marker-date">{marker.date}</span>
                {marker.weightKg && <span>{marker.weightKg}kg</span>}
                {marker.bodyFatPercent && <span>{marker.bodyFatPercent}%</span>}
                {marker.vo2MaxEstimate && <span>VO₂ {marker.vo2MaxEstimate}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckinForm({ onSubmit }: { onSubmit: (data: any) => Promise<any> }) {
  const [formData, setFormData] = useState({
    sleepHours: 7,
    sleepQuality: 3 as 1|2|3|4|5,
    hrv: null as number | null,
    restingHR: null as number | null,
    steps: null as number | null,
    energyLevel: 3 as 1|2|3|4|5,
    moodScore: 3 as 1|2|3|4|5,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkin-form">
      <div className="checkin-grid">
        <div className="checkin-field">
          <label>Sleep Hours</label>
          <input type="number" step="0.25" min="0" max="24" value={formData.sleepHours} 
            onChange={e => setFormData({...formData, sleepHours: parseFloat(e.target.value)})} />
        </div>
        <div className="checkin-field">
          <label>Sleep Quality</label>
          <div className="star-rating">
            {[1,2,3,4,5].map(s => (
              <button type="button" key={s} className={`star ${s <= formData.sleepQuality ? 'active' : ''}`}
                onClick={() => setFormData({...formData, sleepQuality: s as 1|2|3|4|5})}>★</button>
            ))}
          </div>
        </div>
        <div className="checkin-field">
          <label>HRV</label>
          <input type="number" placeholder="ms" value={formData.hrv ?? ''} 
            onChange={e => setFormData({...formData, hrv: e.target.value ? parseInt(e.target.value) : null})} />
        </div>
        <div className="checkin-field">
          <label>Resting HR</label>
          <input type="number" placeholder="bpm" value={formData.restingHR ?? ''} 
            onChange={e => setFormData({...formData, restingHR: e.target.value ? parseInt(e.target.value) : null})} />
        </div>
        <div className="checkin-field">
          <label>Steps</label>
          <input type="number" placeholder="count" value={formData.steps ?? ''} 
            onChange={e => setFormData({...formData, steps: e.target.value ? parseInt(e.target.value) : null})} />
        </div>
        <div className="checkin-field">
          <label>Energy</label>
          <div className="slider-field">
            <input type="range" min="1" max="5" value={formData.energyLevel} 
              onChange={e => setFormData({...formData, energyLevel: parseInt(e.target.value) as 1|2|3|4|5})} />
            <span>{formData.energyLevel}/5</span>
          </div>
        </div>
        <div className="checkin-field">
          <label>Mood</label>
          <div className="slider-field">
            <input type="range" min="1" max="5" value={formData.moodScore} 
              onChange={e => setFormData({...formData, moodScore: parseInt(e.target.value) as 1|2|3|4|5})} />
            <span>{formData.moodScore}/5</span>
          </div>
        </div>
      </div>
      <div className="checkin-field full-width">
        <label>Notes</label>
        <textarea placeholder="How are you feeling today?" value={formData.notes}
          onChange={e => setFormData({...formData, notes: e.target.value})} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : 'Log Check-in'}
      </button>
    </form>
  );
}

function TrendCard({ label, data, unit }: { label: string; data: { date: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;

  return (
    <div className="trend-card">
      <div className="trend-label">{label}</div>
      <div className="trend-sparkline">
        {data.map((d, i) => (
          <div key={i} className="spark-bar" style={{ height: `${((d.value - min) / range) * 100}%` }} />
        ))}
      </div>
      <div className="trend-current">{data.length > 0 ? `${data[data.length - 1].value}${unit}` : '-'}
      </div>
    </div>
  );
}

function MarkerForm({ onSubmit }: { onSubmit: (data: any) => Promise<any> }) {
  const [formData, setFormData] = useState({
    weightKg: null as number | null,
    bodyFatPercent: null as number | null,
    vo2MaxEstimate: null as number | null,
    gripStrengthKg: null as number | null,
    waistCm: null as number | null,
    restingHRAvg: null as number | null,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ weightKg: null, bodyFatPercent: null, vo2MaxEstimate: null, gripStrengthKg: null, waistCm: null, restingHRAvg: null });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="marker-form">
      <div className="marker-grid">
        <input type="number" placeholder="Weight (kg)" value={formData.weightKg ?? ''}
          onChange={e => setFormData({...formData, weightKg: e.target.value ? parseFloat(e.target.value) : null})} />
        <input type="number" placeholder="Body Fat %" value={formData.bodyFatPercent ?? ''}
          onChange={e => setFormData({...formData, bodyFatPercent: e.target.value ? parseFloat(e.target.value) : null})} />
        <input type="number" placeholder="VO₂ Max" value={formData.vo2MaxEstimate ?? ''}
          onChange={e => setFormData({...formData, vo2MaxEstimate: e.target.value ? parseFloat(e.target.value) : null})} />
        <input type="number" placeholder="Grip (kg)" value={formData.gripStrengthKg ?? ''}
          onChange={e => setFormData({...formData, gripStrengthKg: e.target.value ? parseFloat(e.target.value) : null})} />
        <input type="number" placeholder="Waist (cm)" value={formData.waistCm ?? ''}
          onChange={e => setFormData({...formData, waistCm: e.target.value ? parseFloat(e.target.value) : null})} />
        <input type="number" placeholder="Avg Resting HR" value={formData.restingHRAvg ?? ''}
          onChange={e => setFormData({...formData, restingHRAvg: e.target.value ? parseInt(e.target.value) : null})} />
      </div>
      <button type="submit" className="btn btn-ghost" disabled={submitting}>
        {submitting ? 'Saving...' : 'Log Monthly Marker'}
      </button>
    </form>
  );
}

import { useState } from 'react';