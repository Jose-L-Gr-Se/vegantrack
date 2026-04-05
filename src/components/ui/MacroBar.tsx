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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{label}</span>
        <span className="text-sm font-mono tabular-nums">
          <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-surface-900'}`}>
            {Math.round(value)}
          </span>
          <span className="text-surface-400"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-100/90 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out shadow-[0_8px_18px_-10px_rgba(15,23,42,0.55)]"
          style={{
            width: `${percent}%`,
            backgroundColor: isOver ? '#ef4444' : color,
          }}
        />
      </div>
    </div>
  );
}
