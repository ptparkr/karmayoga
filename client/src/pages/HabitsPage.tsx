import { useState, useEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useAreaColors } from '../hooks/useAreaColors';
import { HabitCard } from '../components/HabitCard';
import { Heatmap } from '../components/Heatmap';
import { CustomDropdown } from '../components/CustomDropdown';

export function HabitsPage() {
  const { habits, checkins, loading, addHabit, deleteHabit, toggleCheckin, isCheckedToday, aggregateCheckins } = useHabits();
  const { areas, getColor, updateColor, addArea, removeArea } = useAreaColors();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [viewMode, setViewMode] = useState<'all' | string>('all');

  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('#58a6ff');

  const premiumPresets = [
    '#00ffcc', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
    '#f43f5e', '#f59e0b', '#14b8a6', '#6366f1'
  ];

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--gap-lg)' }}>
        {/* Add Habit Form */}
        <div className="card" style={{ zIndex: isDropdownOpen ? 10000 : 1 }}>
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
            
            {/* Custom Dropdown */}
            <CustomDropdown 
              options={areas.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1), color: getColor(a) }))}
              value={area}
              onChange={setArea}
              placeholder="Select Area"
            />

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
            
            {/* Aesthetic Color Picker */}
            <div className="color-picker-container">
              <div className="preset-palette">
                {premiumPresets.map(c => (
                  <div 
                    key={c}
                    className={`color-dot ${newAreaColor === c ? 'active' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setNewAreaColor(c)}
                  />
                ))}
                <div className="custom-color-trigger" style={{ position: 'relative' }}>
                  <input
                    type="color"
                    value={newAreaColor}
                    onChange={e => setNewAreaColor(e.target.value)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%'
                    }}
                  />
                  <span>+</span>
                </div>
              </div>
            </div>

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
        <div className="section" style={{ marginTop: 'var(--gap-xl)' }}>
          <div className="area-grid">
            {grouped.map(group => (
              <div key={group.area} style={{ marginBottom: 'var(--gap-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)', marginBottom: 'var(--gap-sm)' }}>
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
                  <span className="section-title" style={{ color: getColor(group.area), textShadow: `0 0 15px ${getColor(group.area)}40` }}>
                    {group.area}
                  </span>
                  <button 
                    onClick={() => handleDeleteArea(group.area)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      color: 'var(--danger)', 
                      cursor: 'pointer', 
                      fontSize: 10, 
                      marginLeft: 'auto',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    title="Delete area"
                  >
                    Delete
                  </button>
                </div>
                {group.habits.length === 0 && (
                   <div style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 26, fontStyle: 'italic', marginBottom: 'var(--gap-sm)' }}>No habits in this area.</div>
                )}
                <div className="habit-list" style={{ gap: 'var(--gap-sm)' }}>
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
