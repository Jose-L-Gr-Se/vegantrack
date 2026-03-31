import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { TrendingUp, Flame, Zap, AlertTriangle, Target } from 'lucide-react';

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

  const calorieTarget = profile?.calorie_target || 2000;
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
            <MacroBar label="Proteína" value={summary.protein_g} target={profile?.protein_target_g || 120} color="#3b82f6" />
            <MacroBar label="Carbos" value={summary.carbs_g} target={profile?.carbs_target_g || 250} color="#f59e0b" />
            <MacroBar label="Grasas" value={summary.fat_g} target={profile?.fat_target_g || 65} color="#ef4444" />
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
              { label: 'Proteína', value: weekAvg.protein, target: profile?.protein_target_g || 120, unit: 'g', color: 'text-blue-600' },
              { label: 'Carbos', value: weekAvg.carbs, target: profile?.carbs_target_g || 250, unit: 'g', color: 'text-amber-600' },
              { label: 'Grasas', value: weekAvg.fat, target: profile?.fat_target_g || 65, unit: 'g', color: 'text-rose-600' },
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
          {Object.entries(MICRO_RDA).map(([key, info]) => {
            const microKey = key as keyof typeof summary.micros;

            // Omega-3: no reliable data in OFF for now
            if (microKey === 'omega3_g') {
              return (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-surface-500">{info.label}</span>
                    <span className="text-[10px] bg-surface-100 text-surface-400 px-1.5 py-0.5 rounded-full font-medium">
                      sin datos suficientes
                    </span>
                  </div>
                  <span className="text-xs text-surface-400 font-mono">
                    RDA: {info.rda} {info.unit}
                  </span>
                </div>
              );
            }

            const micro = summary.micros[microKey];
            const hasEnoughCoverage = micro.coverage >= 0.5;

            if (!hasEnoughCoverage) {
              return (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-surface-500">{info.label}</span>
                    <span className="text-[10px] bg-surface-100 text-surface-400 px-1.5 py-0.5 rounded-full font-medium">
                      cobertura insuficiente
                    </span>
                  </div>
                  <span className="text-xs text-surface-400 font-mono">
                    RDA: {info.rda} {info.unit}
                  </span>
                </div>
              );
            }

            const value = micro.value;
            const pct = info.rda > 0 ? Math.min((value / info.rda) * 100, 100) : 0;
            const barColor = pct >= 90 ? 'bg-brand-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
            const textColor = pct >= 90 ? 'text-brand-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {pct < 50 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span className="text-sm text-surface-700">{info.label}</span>
                  </div>
                  <span className={`text-xs font-mono ${textColor}`}>
                    {value < 10 ? value.toFixed(1) : Math.round(value)} / {info.rda} {info.unit}
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
