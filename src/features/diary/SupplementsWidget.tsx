import { useEffect } from 'react';
import { useSupplementStore } from '@/stores/supplementStore';
import { useAuthStore } from '@/stores/authStore';

const NUTRIENT_ICONS: Record<string, string> = {
  vitamin_b12_mcg: '🧬',
  vitamin_d_mcg: '☀️',
  omega3_g: '🌊',
  iron_mg: '🩸',
  zinc_mg: '⚡',
  calcium_mg: '🦴',
  iodine_mcg: '💧',
};

interface SupplementsWidgetProps {
  date: string;
}

export function SupplementsWidget({ date }: SupplementsWidgetProps) {
  const { user } = useAuthStore();
  const { supplements, takenToday, fetchTodayLogs, toggleTaken } = useSupplementStore();

  const active = supplements.filter((s) => s.is_active);

  useEffect(() => {
    if (user) fetchTodayLogs(user.id, date);
  }, [user?.id, date]);

  if (active.length === 0) return null;

  const takenCount = active.filter((s) => takenToday.has(s.id)).length;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="icon-badge text-sm">💊</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">
            Suplementos
          </span>
        </div>
        <span className={`status-pill text-[10px] ${takenCount === active.length ? 'bg-brand-100 text-brand-700' : 'text-surface-500'}`}>
          {takenCount}/{active.length} tomados
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {active.map((sup) => {
          const taken = takenToday.has(sup.id);
          return (
            <button
              key={sup.id}
              onClick={() => user && toggleTaken(user.id, sup.id, date)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 ${
                taken
                  ? 'bg-brand-500 text-white shadow-[0_14px_28px_-18px_rgba(22,163,74,0.7)]'
                  : 'bg-white/70 text-surface-600 border border-white/80 hover:bg-surface-100'
              }`}
            >
              <span>{NUTRIENT_ICONS[sup.nutrient_key] ?? '💊'}</span>
              <span>{sup.name}</span>
              <span className={`font-mono ${taken ? 'text-white/70' : 'text-surface-400'}`}>
                {taken ? '✓' : `${sup.dose_amount}${sup.dose_unit}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
