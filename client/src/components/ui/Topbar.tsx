import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_TITLE_MAP } from '../../lib/navigation';

interface TopbarProps {
  onOpenCommandPalette: () => void;
}

export function Topbar({ onOpenCommandPalette }: TopbarProps) {
  const location = useLocation();
  const pageTitle = ROUTE_TITLE_MAP[location.pathname] ?? 'Karma Yoga';

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="window-controls" aria-hidden="true">
          <span className="window-dot close" />
          <span className="window-dot minimize" />
          <span className="window-dot zoom" />
        </div>
        <div className="topbar-title-group">
          <span className="topbar-kicker">Karma Yoga</span>
          <span className="topbar-title">{pageTitle}</span>
        </div>
      </div>

      <div className="topbar-right">
        <button type="button" className="topbar-search" onClick={onOpenCommandPalette}>
          <span className="topbar-search-label">Search or jump</span>
          <kbd>Cmd/Ctrl K</kbd>
        </button>
        <div className="topbar-date">{dateLabel}</div>
      </div>
    </header>
  );
}
