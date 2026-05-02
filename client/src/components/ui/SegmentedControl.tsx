interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'default' | 'compact';
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'default',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`segmented ${size === 'compact' ? 'compact' : ''} ${className}`.trim()}>
      {options.map(option => (
        <button
          key={String(option.value)}
          type="button"
          className={`segmented-btn ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
