import { useState, useEffect } from 'react';

interface UserSettings {
  name: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  defaultPomoDuration: 25 | 45 | 90;
  shortBreak: number;
  longBreak: number;
  pomosBeforeLongBreak: number;
}

const STORAGE_KEY = 'karma_yoga_settings';
const DEFAULT_SETTINGS: UserSettings = {
  name: '',
  dateOfBirth: '2000-01-01',
  sex: 'male',
  defaultPomoDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  pomosBeforeLongBreak: 4,
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    try {
      saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-main">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Personalize your experience</p>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="card-title">Profile</div>
        <div className="form-group">
          <label>Your Name</label>
          <input
            type="text"
            className="input"
            value={settings.name}
            onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
            placeholder="Enter your name"
          />
        </div>
        <div className="form-group">
          <label>Date of Birth</label>
          <input
            type="date"
            className="input"
            value={settings.dateOfBirth}
            onChange={e => setSettings(s => ({ ...s, dateOfBirth: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Biological Sex</label>
          <div className="preset-buttons">
            {(['male', 'female', 'other'] as const).map(s => (
              <button
                key={s}
                type="button"
                className={`preset-btn ${settings.sex === s ? 'active' : ''}`}
                onClick={() => setSettings(prev => ({ ...prev, sex: s }))}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500, marginTop: 'var(--gap-lg)' }}>
        <div className="card-title">Pomodoro</div>
        <div className="form-group">
          <label>Default Focus Duration</label>
          <div className="preset-buttons">
            {[25, 45, 90].map(m => (
              <button
                key={m}
                className={`preset-btn ${settings.defaultPomoDuration === m ? 'active' : ''}`}
                onClick={() => setSettings(s => ({ ...s, defaultPomoDuration: m as 25 | 45 | 90 }))}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Short Break (minutes)</label>
          <input
            type="number"
            className="input"
            value={settings.shortBreak}
            onChange={e => setSettings(s => ({ ...s, shortBreak: parseInt(e.target.value) || 5 }))}
            min={1}
            max={30}
          />
        </div>
        <div className="form-group">
          <label>Long Break (minutes)</label>
          <input
            type="number"
            className="input"
            value={settings.longBreak}
            onChange={e => setSettings(s => ({ ...s, longBreak: parseInt(e.target.value) || 15 }))}
            min={1}
            max={60}
          />
        </div>
        <div className="form-group">
          <label>Pomodoros Before Long Break</label>
          <input
            type="number"
            className="input"
            value={settings.pomosBeforeLongBreak}
            onChange={e => setSettings(s => ({ ...s, pomosBeforeLongBreak: parseInt(e.target.value) || 4 }))}
            min={1}
            max={10}
          />
        </div>
      </div>

      <div style={{ marginTop: 'var(--gap-lg)' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}