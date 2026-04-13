import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AreaColorsProvider } from './hooks/useAreaColors';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { PomodoroPage } from './pages/PomodoroPage';

export function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <AreaColorsProvider>
      <div className={`app-layout ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AreaColorsProvider>
  );
}
