import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/ui/CommandPalette';
import { Topbar } from './components/ui/Topbar';
import { AreaColorsProvider } from './hooks/useAreaColors';
import { loadSettings } from './lib/settings';
import { storageGetString, storageSetString } from './lib/storage';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { PomodoroPage } from './pages/PomodoroPage';
import { HealthPage } from './pages/HealthPage';
import { WheelPage } from './pages/WheelPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = loadSettings().preferences.reducedMotion ? 'true' : 'false';
  }, []);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => storageGetString('karma_yoga_sidebar_collapsed', 'false') === 'true'
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(current => !current);
      }
      if (event.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSidebarChange = (nextValue: boolean) => {
    setIsSidebarCollapsed(nextValue);
    storageSetString('karma_yoga_sidebar_collapsed', String(nextValue));
  };

  return (
    <AreaColorsProvider>
      <div className={`app-layout ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={handleSidebarChange} />
        <div className="workspace-shell">
          <Topbar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/pomodoro" element={<PomodoroPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/wheel" element={<WheelPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <CommandPalette open={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      </div>
    </AreaColorsProvider>
  );
}
