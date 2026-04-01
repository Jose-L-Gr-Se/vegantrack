import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useSupplementStore } from '@/stores/supplementStore';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { TrendingUp, Flame, Zap, AlertTriangle, Target } from 'lucide-react';
import type { SupplementNutrientKey } from '@/types';
import { computeVeganScore, getScoreColor, getScoreLabel } from '@/utils/veganScore';

const MICRO_RDA = {
  vitamin_b12_mcg: { label: 'Vitamina B12', rda: 2.4,  unit: 'μg' },
  iron_mg:         { label: 'Hierro',        rda: 18,   unit: 'mg' },
  zinc_mg:         { label: 'Zinc',          rda: 11,   unit: 'mg' },
  calcium_mg:      { label: 'Calcio',        rda: 1000, unit: 'mg' },
  vitamin_d_mcg:   { label: 'Vitamina D',    rda: 15,   unit: 'μg' },
  omega3_g:        { label: 'Omega-3',       rda: 1.6,  unit: 'g'  },
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
  const summary = getDaySummary();
  const { supplements, takenToday, fetchTodayLogs, getTodayContributions } = useSupplementStore();

  useEffect(() => {
    if (user) fetchTodayLogs(user.id, selectedDate);
  }, [user?.id, selectedDate]);

  const suppContributions = getTodayContributions();

  const veganScore = computeVeganScore({
    summary,
    calorieTarget: profile?.calorie_target ?? 2000,
    proteinTarget: profile?.protein_target_g ?? 120,
    streakCount: profile?.streak_count ?? 0,
    suppContributions,
    sex: profile?.sex ?? null,
  });
  // Generation counter: ensures stale/hung requests never overwrite fresh data
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

  // Silent refresh: no skeleton, always clears loading (even if stuck), 10s timeout
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
    // Always clear loading — this is the key: removes any stuck skeleton
    if (gen === loadGenRef.current) setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id, selectedDate]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Immediately clear any stuck skeleton, then refresh data silently
        setLoading(false);
        refreshSilent();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user?.id, selectedDate]);

  const microRda = { ...MICRO_RDA, iron_mg: { ...MICRO_RDA.iron_mg, rda: profile?.sex === 'male' ? 8 : 18 } };

  const calorieTarget = profile?.calorie_target ?? 2000;
  const maxCalInWeek = Math.max(...weekData.map(d => d.calories), calorieTarget);

  // Calculate weekly averages
  const daysWithData = weekData.filter(d => d.calories > 0);
  const weekAvg = daysWithData.length > 0 ? {
    calories: Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length),
    protein: Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length),
    carbs: Math.round(daysWithData.reduce((s, d) => s + d.carbs, 0) / daysWithData.length),
    fat: Math.round(daysWithData.reduce((s, d) => s + d.fat, 0) / daysWithData.length),
  } : null;

  return (
    <div className="pb-28 px-4 pt-6">
      <h1 className="font-display text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-surface-500 mb-6">Tu progreso nutricional</p>

      {/* VeganScore */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">🌱</span>
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">
            VeganScore — Hoy
          </h2>
        </div>

        {!veganScore.hasData ? (
          <div className="text-center py-6">
            <p className="text-surface-400 text-sm">Registra alimentos para calcular tu score</p>
            <p className="text-xs text-surface-300 mt-1">Aparecerá aquí en cuanto añadas algo al diario</p>
          </div>
        ) : (
          <div className="flex items-start gap-5">
            {/* Ring */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative w-[100px] h-[100px]">
                <svg width={100} height={100} className="-rotate-90 absolute inset-0">
                  <circle cx={50} cy={50} r={42} fill="none" stroke="#f1f5f9" strokeWidth={10} />
                  <circle
                    cx={50} cy={50} r={42}
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

            {/* Breakdown */}
            <div className="flex-1 space-y-2.5">
              {([
                { emoji: '🔥', label: 'Calorías', data: veganScore.calories },
                { emoji: '💪', label: 'Proteína', data: veganScore.protein },
                { emoji: '🧬', label: 'Micros',   data: veganScore.micros },
                { emoji: '🌿', label: 'Fibra',    data: veganScore.fiber },
                { emoji: '⚡', label: 'Racha',    data: veganScore.streak },
              ] as const).map(({ emoji, label, data }) => {
                const pct = data.max > 0 ? data.score / data.max : 0;
                const barColor =
                  pct >= 0.9 ? 'bg-brand-500'
                  : pct >= 0.5 ? 'bg-amber-400'
                  : 'bg-red-400';
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">{emoji}</span>
                        <span className="text-xs text-surface-600 font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-surface-400 truncate max-w-[80px] text-right">
                          {data.label}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-surface-700 tabular-nums w-9 text-right">
                          {data.score}/{data.max}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
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

      {/* Today's summary */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Hoy</h2>
        </div>

        <div className="flex items-center gap-5">
          <ProgressRing value={summary.calories} max={calorieTarget} size={110} strokeWidth={9}>
            <span className="font-display text-xl font-bold">{Math.round(summary.calories)}</span>
            <span className="text-[9px] text-surface-400">kcal</span>
          </ProgressRing>

          <div className="flex-1 space-y-3">
            <MacroBar label="Proteína" value={summary.protein_g} target={profile?.protein_target_g ?? 120} color="#3b82f6" />
            <MacroBar label="Carbos" value={summary.carbs_g} target={profile?.carbs_target_g ?? 250} color="#f59e0b" />
            <MacroBar label="Grasas" value={summary.fat_g} target={profile?.fat_target_g ?? 65} color="#ef4444" />
          </div>
        </div>

        {/* Fiber bonus */}
        <div className="mt-3 pt-3 border-t border-surface-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-500">Fibra</span>
            <span className="font-mono text-green-600">{Math.round(summary.fiber_g)}g <span className="text-surface-400">/ 30g</span></span>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Última semana</h2>
          </div>
          {weekAvg && (
            <span className="text-xs text-surface-400 font-mono">
              Ø {weekAvg.calories} kcal/día
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
              {/* Target line */}
              {maxCalInWeek > 0 && (
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-surface-300 z-10"
                  style={{ bottom: `${(calorieTarget / maxCalInWeek) * 100}%` }}
                />
              )}
              {weekData.map((day, i) => {
                const heightPercent = maxCalInWeek > 0 ? (day.calories / maxCalInWeek) * 100 : 0;
                const isToday = i === weekData.length - 1;
                const overTarget = day.calories > calorieTarget;
                const atTarget = day.calories > 0 && Math.abs(day.calories - calorieTarget) < calorieTarget * 0.1;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 z-20">
                    <span className="text-[10px] font-mono text-surface-400">
                      {day.calories > 0 ? Math.round(day.calories) : '—'}
                    </span>
                    <div className="w-full bg-surface-100 rounded-lg overflow-hidden relative" style={{ height: '100px' }}>
                      <div
                        className={`w-full rounded-lg transition-all duration-700 ease-out ${
                          isToday
                            ? 'bg-brand-500'
                            : overTarget
                            ? 'bg-red-400'
                            : atTarget
                            ? 'bg-brand-400'
                            : day.calories > 0
                            ? 'bg-brand-300'
                            : 'bg-surface-200'
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

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 justify-center">
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

      {/* Weekly macro averages */}
      {weekAvg && (
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Media semanal</h2>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Calorías', value: weekAvg.calories, target: calorieTarget, unit: '', color: 'text-brand-600' },
              { label: 'Proteína', value: weekAvg.protein, target: profile?.protein_target_g ?? 120, unit: 'g', color: 'text-blue-600' },
              { label: 'Carbos', value: weekAvg.carbs, target: profile?.carbs_target_g ?? 250, unit: 'g', color: 'text-amber-600' },
              { label: 'Grasas', value: weekAvg.fat, target: profile?.fat_target_g ?? 65, unit: 'g', color: 'text-rose-600' },
            ].map((item) => {
              const pct = item.target > 0 ? Math.round((item.value / item.target) * 100) : 0;
              return (
                <div key={item.label} className="text-center">
                  <div className={`font-display text-lg font-bold ${item.color}`}>
                    {item.value}{item.unit}
                  </div>
                  <div className="text-[10px] text-surface-400">{item.label}</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${
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

      {/* Micronutrient tracking */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Micronutrientes clave</h2>
        </div>

        <div className="space-y-3">
          {Object.entries(microRda).map(([key, info]) => {
            const microKey = key as keyof typeof summary.micros;
            const micro = summary.micros[microKey];
            const suppAmount = suppContributions[microKey as SupplementNutrientKey] ?? 0;
            const totalValue = micro.value + suppAmount;
            const hasSupplement = suppAmount > 0;
            const hasEnoughCoverage = micro.coverage >= 0.5 || hasSupplement;

            if (!hasEnoughCoverage) {
              return (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-surface-500">{info.label}</span>
                    <span className="text-[10px] bg-surface-100 text-surface-400 px-1.5 py-0.5 rounded-full font-medium">
                      {microKey === 'omega3_g' ? 'sin datos suficientes' : 'cobertura insuficiente'}
                    </span>
                  </div>
                  <span className="text-xs text-surface-400 font-mono">
                    RDA: {info.rda} {info.unit}
                  </span>
                </div>
              );
            }

            const pct = info.rda > 0 ? Math.min((totalValue / info.rda) * 100, 100) : 0;

            if (pct >= 90) {
              return (
                <div key={key} className="flex items-center gap-3 py-1.5 px-3 rounded-2xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900">
                  <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-500/30">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                        {info.label}
                      </span>
                      {hasSupplement && (
                        <span className="text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">
                          +💊
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full w-full rounded-full bg-brand-400" />
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-brand-600 flex-shrink-0">
                    {Math.round(pct)}%
                  </span>
                </div>
              );
            }

            const barColor = pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
            const textColor = pct >= 50 ? 'text-amber-600' : 'text-red-500';

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {pct < 50 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span className="text-sm text-surface-700">{info.label}</span>
                    {hasSupplement && (
                      <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">
                        +💊 {suppAmount}{info.unit}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-mono ${textColor}`}>
                    {totalValue < 10 ? totalValue.toFixed(1) : Math.round(totalValue)} / {info.rda} {info.unit}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-end mt-0.5">
                  <span className={`text-[10px] font-mono ${textColor}`}>{Math.round(pct)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-surface-400 mt-3 text-center">
          Los micronutrientes se muestran solo cuando hay datos suficientes del alimento ·{' '}
          <span className="text-surface-300">Algunos productos no incluyen todos los micros</span>
        </p>
      </div>
    </div>
  );
}
