import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/habits', label: 'Habits' },
  { to: '/pomodoro', label: 'Pomodoro' },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {isCollapsed && (
        <button 
          className="sidebar-toggle-fixed" 
          onClick={() => setIsCollapsed(false)}
          title="Expand Sidebar"
        >
          ☰
        </button>
      )}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-text">Karma-Yoga</span>
          <button 
            className="sidebar-toggle-btn" 
            onClick={() => setIsCollapsed(true)}
            title="Collapse Sidebar"
          >
            ←
          </button>
        </div>
        <nav className="sidebar-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={link.to === '/'}
            >
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
