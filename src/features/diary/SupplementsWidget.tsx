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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">💊</span>
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
            Suplementos
          </span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          takenCount === active.length
            ? 'bg-brand-100 text-brand-700'
            : 'bg-surface-100 text-surface-500'
        }`}>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                taken
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
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
