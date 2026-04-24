import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../hooks/useSettings';

type NumericFieldKey =
  | 'heightCm'
  | 'weightKg'
  | 'waistCm'
  | 'bodyFatPercent'
  | 'restingHeartRate'
  | 'shortBreak'
  | 'longBreak'
  | 'pomosBeforeLongBreak';

const MEASUREMENT_FIELDS: { key: Extract<NumericFieldKey, 'heightCm' | 'weightKg' | 'waistCm' | 'bodyFatPercent' | 'restingHeartRate'>; label: string; helper: string; suffix: string }[] = [
  { key: 'heightCm', label: 'Height', helper: 'Used only for future body metrics and measurement tracking.', suffix: 'cm' },
  { key: 'weightKg', label: 'Weight', helper: 'Stores your current baseline weight for the measurements panel.', suffix: 'kg' },
  { key: 'waistCm', label: 'Waist', helper: 'Useful for progress snapshots and health context.', suffix: 'cm' },
  { key: 'bodyFatPercent', label: 'Body Fat', helper: 'Optional estimate for body-composition tracking.', suffix: '%' },
  { key: 'restingHeartRate', label: 'Resting Heart Rate', helper: 'Keeps a baseline for future health correlation views.', suffix: 'bpm' },
];

const POMODORO_FIELDS: { key: Extract<NumericFieldKey, 'shortBreak' | 'longBreak' | 'pomosBeforeLongBreak'>; label: string; helper: string; suffix: string }[] = [
  { key: 'shortBreak', label: 'Short Break', helper: 'Applied between completed focus cycles.', suffix: 'min' },
  { key: 'longBreak', label: 'Long Break', helper: 'Applied when the long-break cycle threshold is reached.', suffix: 'min' },
  { key: 'pomosBeforeLongBreak', label: 'Cycles Before Long Break', helper: 'Controls how many completed sessions trigger the long break.', suffix: 'cycles' },
];

function valueToDraft(value: number | null) {
  return value === null ? '' : String(value);
}

export function SettingsPage() {
  const {
    settings,
    status,
    error,
    lastSavedAt,
    markDirty,
    saveNow,
    resetToDefaults,
    formatLastSaved,
  } = useSettings();

  const [numericDrafts, setNumericDrafts] = useState<Record<NumericFieldKey, string>>({
    heightCm: valueToDraft(settings.measurements.heightCm),
    weightKg: valueToDraft(settings.measurements.weightKg),
    waistCm: valueToDraft(settings.measurements.waistCm),
    bodyFatPercent: valueToDraft(settings.measurements.bodyFatPercent),
    restingHeartRate: valueToDraft(settings.measurements.restingHeartRate),
    shortBreak: String(settings.pomodoro.shortBreak),
    longBreak: String(settings.pomodoro.longBreak),
    pomosBeforeLongBreak: String(settings.pomodoro.pomosBeforeLongBreak),
  });

  useEffect(() => {
    setNumericDrafts({
      heightCm: valueToDraft(settings.measurements.heightCm),
      weightKg: valueToDraft(settings.measurements.weightKg),
      waistCm: valueToDraft(settings.measurements.waistCm),
      bodyFatPercent: valueToDraft(settings.measurements.bodyFatPercent),
      restingHeartRate: valueToDraft(settings.measurements.restingHeartRate),
      shortBreak: String(settings.pomodoro.shortBreak),
      longBreak: String(settings.pomodoro.longBreak),
      pomosBeforeLongBreak: String(settings.pomodoro.pomosBeforeLongBreak),
    });
  }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = settings.preferences.reducedMotion ? 'true' : 'false';
  }, [settings.preferences.reducedMotion]);

  const saveLabel = useMemo(() => {
    if (status === 'saving') return 'Saving…';
    if (status === 'saved') return 'Saved';
    if (status === 'error') return 'Save Failed';
    if (status === 'dirty') return 'Save Now';
    return 'Save';
  }, [status]);

  const statusLabel = useMemo(() => {
    if (status === 'saving') return 'Saving your preferences…';
    if (status === 'saved') return `Saved ${formatLastSaved(lastSavedAt)}`;
    if (status === 'error') return error || 'Failed to save settings.';
    if (status === 'dirty') return 'Changes are queued for auto-save.';
    return lastSavedAt ? `Last saved ${formatLastSaved(lastSavedAt)}` : 'Auto-save is enabled for this page.';
  }, [error, formatLastSaved, lastSavedAt, status]);

  const updateNumericDraft = (key: NumericFieldKey, nextValue: string) => {
    setNumericDrafts(current => ({ ...current, [key]: nextValue }));
  };

  const handleMeasurementChange = (key: typeof MEASUREMENT_FIELDS[number]['key'], nextValue: string) => {
    updateNumericDraft(key, nextValue);
    if (nextValue.trim() === '') return;
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) return;
    markDirty(current => ({
      ...current,
      measurements: { ...current.measurements, [key]: parsed },
    }));
  };

  const handlePomodoroChange = (key: typeof POMODORO_FIELDS[number]['key'], nextValue: string) => {
    updateNumericDraft(key, nextValue);
    if (nextValue.trim() === '') return;
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) return;
    markDirty(current => ({
      ...current,
      pomodoro: { ...current.pomodoro, [key]: parsed },
    }));
  };

  const commitMeasurementField = (key: typeof MEASUREMENT_FIELDS[number]['key']) => {
    const rawValue = numericDrafts[key].trim();
    if (rawValue === '') {
      markDirty(current => ({
        ...current,
        measurements: { ...current.measurements, [key]: null },
      }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setNumericDrafts(current => ({ ...current, [key]: valueToDraft(settings.measurements[key]) }));
      return;
    }

    markDirty(current => ({
      ...current,
      measurements: { ...current.measurements, [key]: parsed },
    }));
  };

  const commitPomodoroField = (key: typeof POMODORO_FIELDS[number]['key']) => {
    const rawValue = numericDrafts[key].trim();
    if (rawValue === '') {
      setNumericDrafts(current => ({
        ...current,
        [key]: String(settings.pomodoro[key]),
      }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setNumericDrafts(current => ({
        ...current,
        [key]: String(settings.pomodoro[key]),
      }));
      return;
    }

    markDirty(current => ({
      ...current,
      pomodoro: {
        ...current.pomodoro,
        [key]: parsed,
      },
    }));
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Personal profile, measurements, focus defaults, and local app behavior.</p>
      </div>

      <div className={`status-banner ${status === 'error' ? '' : 'status-banner-subtle'}`}>
        <span>{statusLabel}</span>
        <div className="settings-status-actions">
          <button className="status-action" type="button" onClick={resetToDefaults}>
            Reset
          </button>
          <button className="status-action" type="button" onClick={saveNow} disabled={status === 'saving'}>
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-title">Profile</div>
          <div className="settings-field-grid">
            <label className="settings-field">
              <span className="settings-label">Name</span>
              <input
                type="text"
                className="input"
                value={settings.profile.name}
                maxLength={80}
                placeholder="Enter your name"
                onChange={event => {
                  const value = event.target.value;
                  markDirty(current => ({
                    ...current,
                    profile: { ...current.profile, name: value },
                  }));
                }}
              />
              <span className="settings-helper">Stored locally and used only to personalize the app.</span>
            </label>

            <label className="settings-field">
              <span className="settings-label">Date of Birth</span>
              <input
                type="date"
                className="input"
                value={settings.profile.dateOfBirth}
                onChange={event => {
                  const value = event.target.value;
                  markDirty(current => ({
                    ...current,
                    profile: { ...current.profile, dateOfBirth: value },
                  }));
                }}
              />
              <span className="settings-helper">Used only for future age-aware insights.</span>
            </label>
          </div>

          <div className="settings-field">
            <span className="settings-label">Biological Sex</span>
            <div className="preset-buttons settings-pill-row">
              {(['male', 'female', 'other'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  className={`preset-btn ${settings.profile.sex === option ? 'active' : ''}`}
                  onClick={() => {
                    markDirty(current => ({
                      ...current,
                      profile: { ...current.profile, sex: option },
                    }));
                  }}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            <span className="settings-helper">Optional context for future health and performance analytics.</span>
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-title">Measurements</div>
          <div className="settings-field-grid">
            {MEASUREMENT_FIELDS.map(field => (
              <label key={field.key} className="settings-field">
                <span className="settings-label">{field.label}</span>
                <div className="settings-input-with-suffix">
                  <input
                    type="number"
                    className="input"
                    value={numericDrafts[field.key]}
                    placeholder="Optional"
                    onChange={event => handleMeasurementChange(field.key, event.target.value)}
                    onBlur={() => commitMeasurementField(field.key)}
                  />
                  <span className="settings-suffix">{field.suffix}</span>
                </div>
                <span className="settings-helper">{field.helper}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-title">Pomodoro Defaults</div>
          <div className="settings-field">
            <span className="settings-label">Default Focus Duration</span>
            <div className="preset-buttons settings-pill-row">
              {[25, 45, 90].map(minutes => (
                <button
                  key={minutes}
                  type="button"
                  className={`preset-btn ${settings.pomodoro.defaultPomoDuration === minutes ? 'active' : ''}`}
                  onClick={() => {
                    markDirty(current => ({
                      ...current,
                      pomodoro: { ...current.pomodoro, defaultPomoDuration: minutes as 25 | 45 | 90 },
                    }));
                  }}
                >
                  {minutes}m
                </button>
              ))}
            </div>
            <span className="settings-helper">This becomes the starting preset whenever the Pomodoro screen opens.</span>
          </div>

          <div className="settings-field-grid">
            {POMODORO_FIELDS.map(field => (
              <label key={field.key} className="settings-field">
                <span className="settings-label">{field.label}</span>
                <div className="settings-input-with-suffix">
                  <input
                    type="number"
                    className="input"
                    min={1}
                    value={numericDrafts[field.key]}
                    onChange={event => handlePomodoroChange(field.key, event.target.value)}
                    onBlur={() => commitPomodoroField(field.key)}
                  />
                  <span className="settings-suffix">{field.suffix}</span>
                </div>
                <span className="settings-helper">{field.helper}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-title">App Behavior</div>
          <div className="settings-toggle-list">
            <button
              type="button"
              className={`settings-toggle ${settings.preferences.showAdaptiveRecommendations ? 'active' : ''}`}
              onClick={() => {
                markDirty(current => ({
                  ...current,
                  preferences: {
                    ...current.preferences,
                    showAdaptiveRecommendations: !current.preferences.showAdaptiveRecommendations,
                  },
                }));
              }}
            >
              <div>
                <span className="settings-label">Adaptive Pomodoro Recommendations</span>
                <span className="settings-helper">Shows recommendation cards based on recent rated sessions.</span>
              </div>
              <span className="settings-toggle-indicator">{settings.preferences.showAdaptiveRecommendations ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              className={`settings-toggle ${settings.preferences.reducedMotion ? 'active' : ''}`}
              onClick={() => {
                markDirty(current => ({
                  ...current,
                  preferences: {
                    ...current.preferences,
                    reducedMotion: !current.preferences.reducedMotion,
                  },
                }));
              }}
            >
              <div>
                <span className="settings-label">Reduced Motion</span>
                <span className="settings-helper">Softens nonessential animation and glow effects for comfort.</span>
              </div>
              <span className="settings-toggle-indicator">{settings.preferences.reducedMotion ? 'On' : 'Off'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
