import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../lib/navigation';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const pool = NAVIGATION_ITEMS.filter(item => item.to !== location.pathname);
    if (!normalized) return pool;
    return pool.filter(item => {
      return (
        item.label.toLowerCase().includes(normalized) ||
        item.hint.toLowerCase().includes(normalized)
      );
    });
  }, [location.pathname, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(index => Math.max(0, Math.min(index, filteredItems.length - 1)));
  }, [filteredItems, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex(index => {
          if (filteredItems.length === 0) return 0;
          return (index + 1) % filteredItems.length;
        });
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(index => {
          if (filteredItems.length === 0) return 0;
          return (index - 1 + filteredItems.length) % filteredItems.length;
        });
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = filteredItems[activeIndex];
        if (!selected) return;
        navigate(selected.to);
        onClose();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredItems, navigate, onClose, open]);

  if (!open) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <section className="command-palette" onClick={event => event.stopPropagation()}>
        <div className="command-palette-search">
          <span className="command-palette-icon">CMD</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search screens, panels, and settings"
            className="command-palette-input"
          />
        </div>

        <div className="command-palette-list">
          {filteredItems.length === 0 ? (
            <div className="command-palette-empty">No matching destinations</div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                type="button"
                key={item.to}
                className={`command-item ${index === activeIndex ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  navigate(item.to);
                  onClose();
                }}
              >
                <div className="command-item-main">
                  <span className="command-item-label">{item.label}</span>
                  <span className="command-item-hint">{item.hint}</span>
                </div>
                <kbd>{item.shortcut}</kbd>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
