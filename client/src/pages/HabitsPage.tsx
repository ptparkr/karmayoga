import { useState, useEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useAreaColors } from '../hooks/useAreaColors';
import { HabitCard } from '../components/HabitCard';
import { Heatmap } from '../components/Heatmap';

export function HabitsPage() {
  const { habits, checkins, loading, addHabit, deleteHabit, toggleCheckin, isCheckedToday, aggregateCheckins } = useHabits();
  const { areas, getColor, updateColor, addArea, removeArea } = useAreaColors();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [viewMode, setViewMode] = useState<'all' | string>('all');

  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('#58a6ff');

  // Set default selected area when areas load
  useEffect(() => {
    if (areas.length > 0 && (!area || !areas.includes(area))) {
      setArea(areas[0]);
    }
  }, [areas, area]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !area) return;
    await addHabit(name.trim(), area);
    setName('');
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    const cleanName = newAreaName.trim().toLowerCase();
    await addArea(cleanName, newAreaColor);
    setNewAreaName('');
    if (!area) setArea(cleanName);
  };

  const handleDeleteArea = async (areaToDelete: string) => {
    if (confirm(`Delete area "${areaToDelete}" and all its habits? This cannot be undone.`)) {
      await removeArea(areaToDelete);
      // Wait for re-render, but habits will be stale until refresh. 
      // We should really force a refresh of habits here:
      // We don't have the refresh function exposed in `useHabits` returned object, but it was returned as `refresh`. Let's handle it manually or let the user do it.
      // Actually, my useHabits exposes `refresh` in Phase 5 but let's just let it be optimistic or the user reloads.
      // Assuming useHabits exposes refresh: (I added it earlier in useHabits)
      // We can just call window.location.reload() for simplicity on area delete to resync all habits.
      window.location.reload(); 
    }
  };

  // Group habits by area
  const grouped = areas.map(a => ({
    area: a,
    habits: habits.filter(h => h.area === a),
  })).filter(g => g.habits.length > 0 || areas.length > 0);

  // Build heatmap data based on view mode
  const getHeatmapData = (): Record<string, number> => {
    if (viewMode === 'all') return aggregateCheckins();
    const dates = checkins[viewMode];
    if (!dates) return {};
    const map: Record<string, number> = {};
    dates.forEach(d => { map[d] = 1; });
    return map;
  };

  if (loading) {
    return (
      <div className="app-main">
        <div className="empty-state"><span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</span></div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <div className="page-header">
        <h1 className="page-title">Habits & Areas</h1>
        <p className="page-subtitle">Track your daily habits across your customizable areas of life</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Add Habit Form */}
        <div className="card">
          <div className="card-title">Add Habit</div>
          <form className="add-habit-form" style={{ marginBottom: 0 }} onSubmit={handleSubmit}>
            <input
              className="input"
              type="text"
              placeholder="New habit name..."
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ flex: 1 }}
              id="habit-name-input"
            />
            <select className="select" value={area} onChange={e => setArea(e.target.value)} id="habit-area-select">
              {areas.map(a => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit" id="add-habit-btn">+</button>
          </form>
        </div>

        {/* Add Area Form */}
        <div className="card">
          <div className="card-title">Add Area</div>
          <form className="add-habit-form" style={{ marginBottom: 0 }} onSubmit={handleAddArea}>
            <input
              className="input"
              type="text"
              placeholder="New area name..."
              value={newAreaName}
              onChange={e => setNewAreaName(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="color"
              value={newAreaColor}
              onChange={e => setNewAreaColor(e.target.value)}
              title="Select area color"
              style={{
                width: 36,
                height: 36,
                border: '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'var(--bg-secondary)',
                padding: 2,
              }}
            />
            <button className="btn btn-ghost" type="submit">+</button>
          </form>
        </div>
      </div>

      {/* Habit List */}
      {areas.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 32 }}>
          <span className="empty-icon">🎯</span>
          <span className="empty-text">No areas defined. Add your first area!</span>
        </div>
      ) : (
        <div className="section" style={{ marginTop: 32 }}>
          <div className="habit-list">
            {grouped.map(group => (
              <div key={group.area}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 12 }}>
                  <input
                    type="color"
                    value={getColor(group.area)}
                    onChange={e => updateColor(group.area, e.target.value)}
                    title={`Change ${group.area} color`}
                    style={{
                      width: 18,
                      height: 18,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: 'transparent',
                      padding: 0,
                    }}
                  />
                  <span className="section-title" style={{ color: getColor(group.area) }}>
                    {group.area}
                  </span>
                  <button 
                    onClick={() => handleDeleteArea(group.area)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}
                    title="Delete area"
                  >
                    🗑️
                  </button>
                </div>
                {group.habits.length === 0 && (
                   <div style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 26, fontStyle: 'italic', marginBottom: 8 }}>No habits in this area.</div>
                )}
                <div className="habit-list">
                  {group.habits.map(h => (
                    <HabitCard
                      key={h.id}
                      name={h.name}
                      area={h.area}
                      areaColor={getColor(h.area)}
                      checked={isCheckedToday(h.id)}
                      onToggle={() => toggleCheckin(h.id)}
                      onDelete={() => deleteHabit(h.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {habits.length > 0 && (
        <div className="section" style={{ marginTop: 24 }}>
          <div className="section-header">
            <span className="section-title">Contribution Graph</span>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                All
              </button>
              {habits.slice(0, 5).map(h => (
                <button
                  key={h.id}
                  className={`toggle-btn ${viewMode === h.id ? 'active' : ''}`}
                  onClick={() => setViewMode(h.id)}
                >
                  {h.name.length > 8 ? h.name.slice(0, 8) + '…' : h.name}
                </button>
              ))}
            </div>
          </div>
          <Heatmap checkins={getHeatmapData()} />
        </div>
      )}
    </div>
  );
}
