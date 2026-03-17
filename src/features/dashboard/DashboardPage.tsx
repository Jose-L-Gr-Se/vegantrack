import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { supabase } from '@/lib/supabase';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { TrendingUp, Flame, Droplets, Zap, AlertTriangle } from 'lucide-react';
import type { FoodLogEntry, NutrientSummary } from '@/types';

// Micronutrient RDA values for adults
const MICRO_RDA = {
  vitamin_b12_mcg: { label: 'Vitamina B12', rda: 2.4, unit: 'μg', critical: true },
  iron_mg: { label: 'Hierro', rda: 18, unit: 'mg', critical: true },
  zinc_mg: { label: 'Zinc', rda: 11, unit: 'mg', critical: true },
  calcium_mg: { label: 'Calcio', rda: 1000, unit: 'mg', critical: true },
  omega3_g: { label: 'Omega-3', rda: 1.6, unit: 'g', critical: true },
  vitamin_d_mcg: { label: 'Vitamina D', rda: 15, unit: 'μg', critical: true },
};

interface DayData {
  date: string;
  calories: number;
}

export function DashboardPage() {
  const { user, profile } = useAuthStore();
  const { getDaySummary } = useDiaryStore();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const summary = getDaySummary();

  useEffect(() => {
    if (!user) return;
    loadWeekData();
  }, [user]);

  const loadWeekData = async () => {
    if (!user) return;
    const today = new Date();
    const days: DayData[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('food_log')
        .select('calories')
        .eq('user_id', user.id)
        .eq('date', dateStr);

      const totalCals = (data || []).reduce((sum: number, e: any) => sum + (e.calories || 0), 0);
      days.push({
        date: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        calories: totalCals,
      });
    }
    setWeekData(days);
  };

  const calorieTarget = profile?.calorie_target || 2000;
  const maxCalInWeek = Math.max(...weekData.map(d => d.calories), calorieTarget);

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
      </div>

      {/* Weekly chart (simple bar chart) */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Última semana</h2>
        </div>

        {weekData.length > 0 ? (
          <div className="flex items-end gap-1.5 h-32">
            {weekData.map((day, i) => {
              const heightPercent = maxCalInWeek > 0 ? (day.calories / maxCalInWeek) * 100 : 0;
              const isToday = i === weekData.length - 1;
              const atTarget = day.calories > 0 && Math.abs(day.calories - calorieTarget) < calorieTarget * 0.1;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-surface-400">
                    {day.calories > 0 ? Math.round(day.calories) : '—'}
                  </span>
                  <div className="w-full bg-surface-100 rounded-lg overflow-hidden" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isToday ? 'bg-brand-500' : atTarget ? 'bg-brand-300' : 'bg-surface-300'
                      }`}
                      style={{
                        height: `${heightPercent}%`,
                        marginTop: `${100 - heightPercent}%`,
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium capitalize ${isToday ? 'text-brand-600' : 'text-surface-400'}`}>
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-surface-400">
            Cargando datos de la semana...
          </div>
        )}

        {/* Target line label */}
        <div className="flex items-center gap-2 mt-3 justify-center">
          <div className="h-px w-8 bg-surface-300 border-t border-dashed border-surface-400" />
          <span className="text-[10px] text-surface-400">Objetivo: {calorieTarget} kcal</span>
        </div>
      </div>

      {/* Micronutrient alerts (placeholder until Phase 3) */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Micronutrientes clave</h2>
        </div>

        <div className="space-y-3">
          {Object.entries(MICRO_RDA).map(([key, info]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {info.critical && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                <span className="text-sm text-surface-700">{info.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-amber-400 rounded-full" />
                </div>
                <span className="text-xs text-surface-400 font-mono w-16 text-right">
                  0 / {info.rda} {info.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-surface-400 mt-3 text-center">
          El tracking detallado de micros se activará en la Fase 3
        </p>
      </div>
    </div>
  );
}
