import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useSupplementStore } from '@/stores/supplementStore';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrendingUp, Flame, Zap, AlertTriangle, Target } from 'lucide-react';
import type { SupplementNutrientKey } from '@/types';
import { computeVeganScore, getScoreColor, getScoreLabel } from '@/utils/veganScore';
import { usePro } from '@/hooks/usePro';
import { ProModal } from '@/features/pro/ProModal';
import { MicroTrendsChart } from '@/features/dashboard/MicroTrendsChart';
import { IRON_NONHEME_FACTOR } from '@/lib/nutrientOverrides';

const MICRO_RDA = {
  vitamin_b12_mcg: { label: 'Vitamina B12', rda: 2.4, unit: 'mcg' },
  iron_mg: { label: 'Hierro', rda: 18, unit: 'mg' },
  zinc_mg: { label: 'Zinc', rda: 11, unit: 'mg' },
  calcium_mg: { label: 'Calcio', rda: 1000, unit: 'mg' },
  vitamin_d_mcg: { label: 'Vitamina D', rda: 15, unit: 'mcg' },
  omega3_g: { label: 'Omega-3', rda: 1.6, unit: 'g' },
};

interface DayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function DashboardPage() {
  const { user, profile } = useAuthStore();
  const { getDaySummary, getWeekData, fetchEntries, selectedDate } = useDiaryStore();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const { isPro } = usePro();
  const [showProModal, setShowProModal] = useState(false);
  const summary = getDaySummary();
  const { getTodayContributions } = useSupplementStore();

  const suppContributions = getTodayContributions();

  const veganScore = computeVeganScore({
    summary,
    calorieTarget: profile?.calorie_target ?? 2000,
    proteinTarget: profile?.protein_target_g ?? 120,
    streakCount: profile?.streak_count ?? 0,
    suppContributions,
    sex: profile?.sex ?? null,
  });

  const loadGenRef = useRef(0);

  const loadData = async () => {
    if (!user) return;
    const gen = ++loadGenRef.current;
    setLoading(true);
    try {
      await fetchEntries(user.id, selectedDate);
      const data = await getWeekData(user.id);
      if (gen !== loadGenRef.current) return;
      setWeekData(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    if (gen === loadGenRef.current) setLoading(false);
  };

  const refreshSilent = async () => {
    if (!user) return;
    const gen = ++loadGenRef.current;
    try {
      const makeTimeout = (ms: number): Promise<never> =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
      await Promise.race([fetchEntries(user.id, selectedDate), makeTimeout(10000)]);
      const weekResult = await Promise.race([getWeekData(user.id), makeTimeout(10000)]);
      if (gen !== loadGenRef.current) return;
      setWeekData(weekResult);
    } catch (err) {
      console.error('Dashboard refresh error:', err);
    }
    if (gen === loadGenRef.current) setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id, selectedDate]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setLoading(false);
        refreshSilent();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user?.id, selectedDate]);

  const microRda = {
    ...MICRO_RDA,
    iron_mg: { ...MICRO_RDA.iron_mg, rda: profile?.sex === 'male' ? 8 : 18 },
  };

  const MICRO_INSIGHTS: Partial<Record<keyof typeof microRda, {
    condition: (pct: number, hasSupp: boolean) => boolean;
    text: string;
    type: 'tip' | 'warning' | 'info';
  }>> = {
    omega3_g: {
      condition: (pct, hasSupp) => pct < 50 && !hasSupp,
      text: 'Casi ningún alimento declara DHA/EPA. Si no tomas suplemento de algas, considera añadirlo — es el omega-3 más relevante en dieta vegana.',
      type: 'tip',
    },
    iron_mg: {
      condition: (pct) => pct < 70,
      text: 'El hierro vegetal se absorbe mejor con vitamina C. Combínalo en la misma comida con pimiento, cítricos, kiwi o perejil para mejorar la absorción.',
      type: 'tip',
    },
    vitamin_b12_mcg: {
      condition: (pct, hasSupp) => pct < 80 && !hasSupp,
      text: 'La B12 fiable en dieta vegana proviene de suplementos o alimentos enriquecidos. Los análisis de sangre anuales son recomendables para confirmar tus niveles.',
      type: 'warning',
    },
    calcium_mg: {
      condition: (pct) => pct < 60,
      text: 'Buenas fuentes veganas de calcio: bebida de soja enriquecida, tofu (con sulfato cálcico), brócoli, almendras y tahini.',
      type: 'tip',
    },
    zinc_mg: {
      condition: (pct) => pct < 60,
      text: 'Las legumbres y semillas son las mejores fuentes veganas de zinc. Remojarlas antes de cocinar reduce el ácido fítico y mejora la absorción.',
      type: 'tip',
    },
    vitamin_d_mcg: {
      condition: (pct, hasSupp) => pct < 50 && !hasSupp,
      text: 'La síntesis solar en España es insuficiente de octubre a marzo. Un suplemento de vitamina D3 (de líquenes para veganos) es recomendable en esos meses.',
      type: 'warning',
    },
  };

  const calorieTarget = profile?.calorie_target ?? 2000;
  const maxCalInWeek = Math.max(...weekData.map((d) => d.calories), calorieTarget);

  const daysWithData = weekData.filter((d) => d.calories > 0);
  const weekAvg = daysWithData.length > 0 ? {
    calories: Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length),
    protein: Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length),
    carbs: Math.round(daysWithData.reduce((s, d) => s + d.carbs, 0) / daysWithData.length),
    fat: Math.round(daysWithData.reduce((s, d) => s + d.fat, 0) / daysWithData.length),
  } : null;

  function MicroInsightBox({ text, type }: { text: string; type: 'tip' | 'warning' | 'info' }) {
    const [open, setOpen] = useState(false);
    const colors = {
      tip: 'text-brand-700 bg-brand-50 border-brand-100',
      warning: 'text-amber-700 bg-amber-50 border-amber-100',
      info: 'text-blue-700 bg-blue-50 border-blue-100',
    };
    const icons = { tip: '💡', warning: '⚠️', info: 'ℹ️' };
    return (
      <div className="mt-1.5">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 text-[10px] text-surface-400 hover:text-surface-600 transition-colors"
        >
          <span>{icons[type]}</span>
          <span>{open ? 'Ocultar consejo' : 'Ver consejo'}</span>
        </button>
        {open && (
          <div className={`mt-1.5 rounded-xl border px-3 py-2 text-xs leading-relaxed ${colors[type]}`}>
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-6">
      <SectionHeader
        title="Resumen"
        subtitle="Tu progreso nutricional"
        action={
          <div className="icon-badge">
            <TrendingUp className="w-5 h-5 text-brand-600" />
          </div>
        }
      />

      <div className="page-shell p-5 mb-4">
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="section-label mb-2">VeganScore</p>
              <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">Tu lectura de hoy</h2>
            </div>
            <span className="status-pill">Hoy</span>
          </div>

          {!veganScore.hasData ? (
            <div className="text-center py-6">
              <p className="text-surface-500 text-sm">Registra alimentos para calcular tu score</p>
              <p className="text-xs text-surface-400 mt-1">Aparecerá aquí en cuanto añadas algo al diario</p>
            </div>
          ) : (
            <div className="flex items-start gap-5">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="relative w-[100px] h-[100px] rounded-full bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <svg width={100} height={100} className="-rotate-90 absolute inset-0">
                    <circle cx={50} cy={50} r={42} fill="none" stroke="#f1f5f9" strokeWidth={10} />
                    <circle
                      cx={50}
                      cy={50}
                      r={42}
                      fill="none"
                      stroke={getScoreColor(veganScore.total)}
                      strokeWidth={10}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - veganScore.total / 100)}
                      style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="font-display text-2xl font-bold leading-none"
                      style={{ color: getScoreColor(veganScore.total) }}
                    >
                      {veganScore.total}
                    </span>
                    <span className="text-[9px] text-surface-400 mt-0.5">/ 100</span>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold text-center leading-tight"
                  style={{ color: getScoreColor(veganScore.total) }}
                >
                  {getScoreLabel(veganScore.total)}
                </span>
              </div>

              <div className="flex-1 space-y-2.5">
                {([
                  { label: 'Calorías', data: veganScore.calories },
                  { label: 'Proteína', data: veganScore.protein },
                  { label: 'Micros', data: veganScore.micros },
                  { label: 'Fibra', data: veganScore.fiber },
                  { label: 'Racha', data: veganScore.streak },
                ] as const).map(({ label, data }) => {
                  const pct = data.max > 0 ? data.score / data.max : 0;
                  const barColor =
                    pct >= 0.9 ? 'bg-brand-500'
                    : pct >= 0.5 ? 'bg-amber-400'
                    : 'bg-red-400';
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-surface-600 font-medium">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-surface-400 truncate max-w-[80px] text-right">
                            {data.label}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-surface-700 tabular-nums w-9 text-right">
                            {data.score}/{data.max}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="section-label mb-2">Hoy</p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">Balance diario</h2>
          </div>
          <div className="status-pill">
            <Target className="w-3.5 h-3.5" />
            {calorieTarget} kcal
          </div>
        </div>

        <div className="flex items-center gap-5">
          <ProgressRing value={summary.calories} max={calorieTarget} size={112} strokeWidth={10}>
            <span className="font-display text-xl font-bold">{Math.round(summary.calories)}</span>
            <span className="text-[9px] text-surface-400">kcal</span>
          </ProgressRing>

          <div className="flex-1 space-y-3">
            <MacroBar label="Proteína" value={summary.protein_g} target={profile?.protein_target_g ?? 120} color="#3b82f6" />
            <MacroBar label="Carbos" value={summary.carbs_g} target={profile?.carbs_target_g ?? 250} color="#f59e0b" />
            <MacroBar label="Grasas" value={summary.fat_g} target={profile?.fat_target_g ?? 65} color="#ef4444" />
          </div>
        </div>

        <div className="soft-divider my-4" />
        <div className="grid grid-cols-2 gap-3">
          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-surface-500 font-semibold">Fibra</p>
                <p className="text-xl font-display font-bold text-green-600 mt-1">{Math.round(summary.fiber_g)}g</p>
              </div>
              <Zap className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-surface-500 font-semibold">Racha</p>
                <p className="text-xl font-display font-bold text-brand-700 mt-1">{profile?.streak_count ?? 0} días</p>
              </div>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label mb-2">Última semana</p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">Energía registrada</h2>
          </div>
          {weekAvg && (
            <span className="status-pill font-mono">
              {weekAvg.calories} kcal/día
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-end gap-1.5 h-36 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-surface-100 rounded-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
                <div className="h-2 w-6 bg-surface-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-36 relative">
              {maxCalInWeek > 0 && (
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-surface-300 z-10"
                  style={{ bottom: `${(calorieTarget / maxCalInWeek) * 100}%` }}
                />
              )}
              {weekData.map((day, i) => {
                const heightPercent = maxCalInWeek > 0 ? (day.calories / maxCalInWeek) * 100 : 0;
                const isToday = i === weekData.length - 1;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 z-20">
                    <span className="text-[10px] font-mono text-surface-400">
                      {day.calories > 0 ? Math.round(day.calories) : '—'}
                    </span>
                    <div className="w-full bg-surface-100 rounded-xl overflow-hidden relative" style={{ height: '100px' }}>
                      <div
                        className={`w-full rounded-xl transition-all duration-700 ease-out ${
                          isToday
                            ? 'bg-brand-500'
                            : day.calories > 0
                              ? 'bg-surface-300'
                              : 'bg-surface-100'
                        }`}
                        style={{
                          height: `${Math.max(heightPercent, day.calories > 0 ? 4 : 0)}%`,
                          marginTop: `${100 - Math.max(heightPercent, day.calories > 0 ? 4 : 0)}%`,
                        }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium capitalize ${isToday ? 'text-brand-600 font-semibold' : 'text-surface-400'}`}>
                      {day.date}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="h-px w-6 border-t border-dashed border-surface-400" />
                <span className="text-[10px] text-surface-400">Objetivo: {calorieTarget}</span>
              </div>
              {weekAvg && weekAvg.calories > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-brand-300" />
                  <span className="text-[10px] text-surface-400">Media: {weekAvg.calories}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {weekAvg && (
        <div className="card p-5 mb-4">
          <div className="mb-4">
            <p className="section-label mb-2">Media semanal</p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">Promedio de macros</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calorías', value: weekAvg.calories, target: calorieTarget, unit: '', color: 'text-brand-600' },
              { label: 'Proteína', value: weekAvg.protein, target: profile?.protein_target_g ?? 120, unit: 'g', color: 'text-blue-600' },
              { label: 'Carbos', value: weekAvg.carbs, target: profile?.carbs_target_g ?? 250, unit: 'g', color: 'text-amber-600' },
              { label: 'Grasas', value: weekAvg.fat, target: profile?.fat_target_g ?? 65, unit: 'g', color: 'text-rose-600' },
            ].map((item) => {
              const pct = item.target > 0 ? Math.round((item.value / item.target) * 100) : 0;
              return (
                <div key={item.label} className="metric-tile text-center">
                  <div className={`font-display text-2xl font-bold ${item.color}`}>
                    {item.value}{item.unit}
                  </div>
                  <div className="text-[11px] text-surface-500 uppercase tracking-[0.18em] mt-1">{item.label}</div>
                  <div className={`text-xs font-mono mt-2 ${
                    pct >= 90 && pct <= 110 ? 'text-brand-600' : pct > 110 ? 'text-red-500' : 'text-surface-400'
                  }`}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="section-label mb-2">Micronutrientes</p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">Cobertura esencial</h2>
          </div>
          <span className="status-pill">RDA</span>
        </div>

        <div className="space-y-3">
          {Object.entries(microRda).map(([key, info]) => {
            const microKey = key as keyof typeof summary.micros;
            const micro = summary.micros[microKey];
            const suppAmount = suppContributions[microKey as SupplementNutrientKey] ?? 0;
            const totalValue = (micro?.value ?? 0) + suppAmount;
            const hasSupplement = suppAmount > 0;
            const hasEnoughCoverage = (micro?.coverage ?? 0) >= 0.5 || hasSupplement;

            if (!hasEnoughCoverage) {
              const insight = MICRO_INSIGHTS[key as keyof typeof MICRO_INSIGHTS];
              const pct = info.rda > 0 ? Math.min(((micro?.value ?? 0) + suppAmount) / info.rda * 100, 100) : 0;
              return (
                <div key={key}>
                  <div className="metric-tile py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-surface-500">{info.label}</span>
                        <span className="status-pill text-[10px] py-1 px-2">cobertura baja</span>
                      </div>
                      <span className="text-xs text-surface-400 font-mono">
                        RDA: {info.rda} {info.unit}
                      </span>
                    </div>
                  </div>
                  {insight && insight.condition(pct, hasSupplement) && (
                    <MicroInsightBox text={insight.text} type={insight.type} />
                  )}
                </div>
              );
            }

            const pct = info.rda > 0 ? Math.min((totalValue / info.rda) * 100, 100) : 0;

            if (pct >= 90) {
              const insight = MICRO_INSIGHTS[key as keyof typeof MICRO_INSIGHTS];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-surface-700">{info.label}</span>
                      {hasSupplement && (
                        <span className="text-[10px] text-surface-400 font-medium">supl.</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-brand-600">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full w-full rounded-full bg-brand-400" />
                  </div>
                  {insight && insight.condition(pct, hasSupplement) && (
                    <MicroInsightBox text={insight.text} type={insight.type} />
                  )}
                </div>
              );
            }

            const barColor = pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
            const textColor = pct >= 50 ? 'text-amber-600' : 'text-red-500';
            const insight = MICRO_INSIGHTS[key as keyof typeof MICRO_INSIGHTS];

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {pct < 50 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span className="text-sm text-surface-700">{info.label}</span>
                    {hasSupplement && (
                      <span className="status-pill text-[10px] py-1 px-2 text-brand-600">
                        +{suppAmount}{info.unit}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-mono ${textColor}`}>
                    {totalValue < 10 ? totalValue.toFixed(1) : Math.round(totalValue)} / {info.rda} {info.unit}
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] font-mono ${textColor}`}>{Math.round(pct)}%</span>
                </div>
                {insight && insight.condition(pct, hasSupplement) && (
                  <MicroInsightBox text={insight.text} type={insight.type} />
                )}
              </div>
            );
          })}
        </div>

        {(() => {
          const ironMicro = summary.micros['iron_mg'];
          const ironSupp = suppContributions['iron_mg'] ?? 0;
          const ironTotal = (ironMicro?.value ?? 0) + ironSupp;
          if (ironTotal <= 0) return null;
          const ironAbsorbable = Math.round(ironTotal * IRON_NONHEME_FACTOR * 10) / 10;
          return (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-amber-700 mb-1 uppercase tracking-wide">
                Hierro absorbible estimado
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-xl font-bold text-amber-700">
                  {ironAbsorbable} mg
                </span>
                <span className="text-xs text-amber-600">
                  de {Math.round(ironTotal * 10) / 10} mg totales
                </span>
              </div>
              <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
                El hierro vegetal se absorbe en menor proporción (~12% vs ~25% del animal).
                Combinarlo con vitamina C puede doblar esta cifra.
              </p>
            </div>
          );
        })()}

        <div className="mt-4 rounded-xl border border-surface-100 bg-surface-50 px-4 py-3">
          <p className="text-[11px] text-surface-500 leading-relaxed text-center">
            Los micronutrientes se calculan cuando el fabricante los declara en la etiqueta.
            Para monitorización completa, complementa con <strong className="text-surface-600">analíticas de sangre anuales</strong> — especialmente B12, hierro y vitamina D.
          </p>
        </div>
      </div>

      {isPro ? (
        <MicroTrendsChart />
      ) : (
        <div className="card overflow-hidden mt-4 relative">
          <div className="p-5 filter blur-[3px] pointer-events-none select-none opacity-60">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="section-label mb-2">Tendencias Pro</p>
                <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">
                  Evolución de micros
                </h2>
              </div>
            </div>
            <div className="space-y-3">
              {['Vitamina B12', 'Hierro', 'Vitamina D'].map((micro) => (
                <div key={micro}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-600">{micro}</span>
                    <span className="text-brand-600 font-mono">↑ mejorando</span>
                  </div>
                  <div className="h-12 bg-surface-100 rounded-xl overflow-hidden flex items-end gap-0.5 px-1 pb-1">
                    {[40,55,48,70,65,80,90].map((h, i) => (
                      <div key={i} className="flex-1 bg-brand-300 rounded-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <span className="text-2xl mb-2">📈</span>
            <p className="font-display font-bold text-surface-900 text-base mb-1">
              Tendencias de micronutrientes
            </p>
            <p className="text-xs text-surface-500 mb-4 text-center px-8">
              Visualiza tu evolución de B12, hierro y vitamina D semana a semana
            </p>
            <button
              onClick={() => setShowProModal(true)}
              className="btn-primary text-sm px-5 py-2.5"
            >
              Desbloquear con Pro
            </button>
          </div>
          {showProModal && <ProModal onClose={() => setShowProModal(false)} />}
        </div>
      )}
    </div>
  );
}
