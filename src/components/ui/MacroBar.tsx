interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, value, target, unit = 'g', color }: MacroBarProps) {
  const percent = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const isOver = value > target;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-600">{label}</span>
        <span className="text-sm font-mono tabular-nums">
          <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-surface-900'}`}>
            {Math.round(value)}
          </span>
          <span className="text-surface-400"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: isOver ? '#ef4444' : color,
          }}
        />
      </div>
    </div>
  );
}
