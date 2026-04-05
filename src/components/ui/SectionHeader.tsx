import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="section-label mb-2">VeganTrack</p>
        <h1 className="font-display text-[2rem] font-bold tracking-[-0.04em] text-surface-900 leading-none">{title}</h1>
        {subtitle && (
          <p className="text-sm text-surface-500 mt-2 max-w-[22rem] leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 pt-1">{action}</div>}
    </div>
  );
}
