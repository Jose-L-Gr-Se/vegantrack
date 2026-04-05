interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  max,
  size = 160,
  strokeWidth = 12,
  color = '#16a34a',
  bgColor = '#e2e8f0',
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percent * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_30px_-24px_rgba(15,23,42,0.3)] backdrop-blur-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-circle transition-all duration-700 ease-out"
          style={{
            '--circumference': circumference,
            '--offset': offset,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-[14%] rounded-full bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
