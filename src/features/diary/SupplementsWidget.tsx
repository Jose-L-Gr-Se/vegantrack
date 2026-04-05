import { useEffect } from 'react';
import {
  Bone,
  Check,
  Droplets,
  FlaskConical,
  Pill,
  Shield,
  Sparkles,
  Sun,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useSupplementStore } from '@/stores/supplementStore';
import { useAuthStore } from '@/stores/authStore';

const NUTRIENT_META: Record<string, { Icon: LucideIcon; accent: string; iconBg: string }> = {
  vitamin_b12_mcg: {
    Icon: FlaskConical,
    accent: 'text-violet-600 dark:text-violet-300',
    iconBg: 'bg-violet-50 border-violet-100 dark:bg-violet-500/12 dark:border-violet-500/25',
  },
  vitamin_d_mcg: {
    Icon: Sun,
    accent: 'text-amber-600 dark:text-amber-300',
    iconBg: 'bg-amber-50 border-amber-100 dark:bg-amber-500/12 dark:border-amber-500/25',
  },
  omega3_g: {
    Icon: Waves,
    accent: 'text-sky-600 dark:text-sky-300',
    iconBg: 'bg-sky-50 border-sky-100 dark:bg-sky-500/12 dark:border-sky-500/25',
  },
  iron_mg: {
    Icon: Droplets,
    accent: 'text-rose-600 dark:text-rose-300',
    iconBg: 'bg-rose-50 border-rose-100 dark:bg-rose-500/12 dark:border-rose-500/25',
  },
  zinc_mg: {
    Icon: Shield,
    accent: 'text-blue-600 dark:text-blue-300',
    iconBg: 'bg-blue-50 border-blue-100 dark:bg-blue-500/12 dark:border-blue-500/25',
  },
  calcium_mg: {
    Icon: Bone,
    accent: 'text-emerald-600 dark:text-emerald-300',
    iconBg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/12 dark:border-emerald-500/25',
  },
  iodine_mcg: {
    Icon: Sparkles,
    accent: 'text-fuchsia-600 dark:text-fuchsia-300',
    iconBg: 'bg-fuchsia-50 border-fuchsia-100 dark:bg-fuchsia-500/12 dark:border-fuchsia-500/25',
  },
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
    <section className="page-shell mb-5 p-4">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="icon-badge">
              <Pill className="w-[18px] h-[18px] text-brand-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="section-label mb-1">Suplementos</p>
              <h3 className="font-display text-xl font-bold tracking-[-0.04em] text-surface-900">
                Seguimiento diario
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`status-pill whitespace-nowrap ${
                takenCount === active.length ? 'bg-brand-100 text-brand-700 border-brand-200' : 'text-surface-600'
              }`}
            >
              {takenCount}/{active.length}
            </span>
            <p className="text-[10px] uppercase tracking-[0.16em] text-surface-400 mt-1">Tomados hoy</p>
          </div>
        </div>

        <p className="text-sm text-surface-500 mb-4">
          Marca cada suplemento cuando lo hayas tomado.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {active.map((sup) => {
            const taken = takenToday.has(sup.id);
            const meta = NUTRIENT_META[sup.nutrient_key] ?? {
              Icon: Pill,
              accent: 'text-brand-600 dark:text-brand-300',
              iconBg: 'bg-brand-50 border-brand-100 dark:bg-brand-500/12 dark:border-brand-500/25',
            };

            return (
              <button
                key={sup.id}
                onClick={() => user && toggleTaken(user.id, sup.id, date)}
                aria-pressed={taken}
                className={`metric-tile text-left transition-all duration-200 active:scale-[0.98] ${
                  taken
                    ? 'border-brand-200 bg-brand-50/80 shadow-[0_20px_38px_-30px_rgba(22,163,74,0.35)] dark:border-brand-500/30 dark:bg-brand-500/10'
                    : 'hover:border-surface-200 dark:hover:border-surface-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${meta.iconBg}`}>
                    <meta.Icon className={`w-[18px] h-[18px] ${meta.accent}`} strokeWidth={2} />
                  </div>
                  <span
                    className={`inline-flex h-7 items-center rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      taken
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-300'
                    }`}
                  >
                    {taken ? 'Tomado' : 'Pendiente'}
                  </span>
                </div>

                <div className="min-h-[3.25rem]">
                  <p className="text-sm font-semibold leading-tight text-surface-900">
                    {sup.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-surface-400 mt-2">
                    Dosis
                  </p>
                  <p className="text-sm font-mono text-surface-700 mt-1">
                    {sup.dose_amount} {sup.dose_unit}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      taken ? 'text-brand-700' : 'text-surface-400'
                    }`}
                  >
                    {taken ? 'Listo hoy' : 'Marcar'}
                  </span>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                      taken
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-surface-200 bg-white/80 text-surface-400 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-500'
                    }`}
                  >
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
