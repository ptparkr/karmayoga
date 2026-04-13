interface Props {
  name: string;
  area: string;
  areaColor: string;
  checked: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HabitCard({ name, area, areaColor, checked, onToggle, onDelete }: Props) {
  return (
    <div className="habit-card animate-in">
      <button
        className={`habit-check ${checked ? 'checked' : ''}`}
        onClick={onToggle}
        style={checked ? { 
          background: areaColor, 
          borderColor: areaColor,
          boxShadow: `0 0 15px ${areaColor}60` 
        } : undefined}
      >
        {checked ? '✓' : ''}
      </button>
      <span className="habit-name">{name}</span>
      <span
        className="habit-area-tag"
        style={{ 
          color: areaColor, 
          background: hexToRgba(areaColor, 0.1),
          border: `1px solid ${hexToRgba(areaColor, 0.2)}`,
          boxShadow: `0 0 10px ${areaColor}20` 
        }}
      >
        {area}
      </span>
      <button className="habit-delete" onClick={onDelete} title="Delete habit">✕</button>
    </div>
  );
}
