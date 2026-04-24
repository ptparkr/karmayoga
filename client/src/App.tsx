import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
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

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => storageGetString('karma_yoga_sidebar_collapsed', 'false') === 'true'
  );

  const handleSidebarChange = (nextValue: boolean) => {
    setIsSidebarCollapsed(nextValue);
    storageSetString('karma_yoga_sidebar_collapsed', String(nextValue));
  };

  return (
    <AreaColorsProvider>
      <div className={`app-layout ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={handleSidebarChange} />
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
    </AreaColorsProvider>
  );
}
