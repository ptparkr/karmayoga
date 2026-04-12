import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/habits', icon: '🎯', label: 'Habits' },
  { to: '/pomodoro', icon: '⏱️', label: 'Pomodoro' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🔥</span>
        <span className="brand-text">Karma-Yoga</span>
      </div>
      <nav className="sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end={link.to === '/'}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
