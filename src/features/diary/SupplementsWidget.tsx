import { useEffect } from 'react';
import { Check, Pill } from 'lucide-react';
import { useSupplementStore } from '@/stores/supplementStore';
import { useAuthStore } from '@/stores/authStore';
import type { Supplement } from '@/types';

const NUTRIENT_EMOJI: Record<string, string> = {
  vitamin_b12_mcg: '🧬',
  vitamin_d_mcg: '☀️',
  omega3_g: '🌊',
  iron_mg: '🩸',
  zinc_mg: '⚡',
  calcium_mg: '🦴',
  iodine_mcg: '💧',
};

function getEmoji(sup: Supplement): string {
  if (sup.emoji) return sup.emoji;
  if (sup.nutrient_key) return NUTRIENT_EMOJI[sup.nutrient_key] ?? '💊';
  return '💊';
}

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
  const allTaken = takenCount === active.length;

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <Pill className="w-3.5 h-3.5 text-surface-400" strokeWidth={2} />
          <span className="section-label">Suplementos</span>
        </div>
        <span className={`status-pill text-[10px] py-1 px-2.5 ${
          allTaken ? 'bg-brand-100 text-brand-700 border-brand-200' : ''
        }`}>
          {takenCount}/{active.length}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {active.map((sup) => {
          const taken = takenToday.has(sup.id);
          return (
            <button
              key={sup.id}
              onClick={() => user && toggleTaken(user.id, sup.id, date)}
              aria-pressed={taken}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 active:scale-[0.97] ${
                taken
                  ? 'bg-brand-50 border-brand-200 shadow-[0_4px_14px_-6px_rgba(22,163,74,0.35)]'
                  : 'bg-white/80 border-surface-200 hover:border-surface-300'
              }`}
            >
              <span className="text-base leading-none">{getEmoji(sup)}</span>
              <span className={`text-xs font-semibold whitespace-nowrap max-w-[90px] truncate ${
                taken ? 'text-brand-700' : 'text-surface-700'
              }`}>
                {sup.name}
              </span>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                taken ? 'bg-brand-500' : 'bg-surface-200'
              }`}>
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
