import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AreaColorsProvider } from './hooks/useAreaColors';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { PomodoroPage } from './pages/PomodoroPage';
import { HealthPage } from './pages/HealthPage';
import { WheelPage } from './pages/WheelPage';

export function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <AreaColorsProvider>
      <div className={`app-layout ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/pomodoro" element={<PomodoroPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/wheel" element={<WheelPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AreaColorsProvider>
  );
}
