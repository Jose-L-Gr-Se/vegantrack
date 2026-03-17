import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { ChevronLeft, ChevronRight, Plus, Trash2, Leaf } from 'lucide-react';
import type { FoodLogEntry, MealType } from '@/types';

const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { type: 'lunch', label: 'Comida', icon: '☀️' },
  { type: 'dinner', label: 'Cena', icon: '🌙' },
  { type: 'snack', label: 'Snacks', icon: '🍎' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Hoy';
  if (date.getTime() === yesterday.getTime()) return 'Ayer';

  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function DiaryPage() {
  const { user, profile } = useAuthStore();
  const { entries, selectedDate, setDate, fetchEntries, deleteEntry, getDaySummary } = useDiaryStore();

  useEffect(() => {
    if (user) fetchEntries(user.id, selectedDate);
  }, [user, selectedDate]);

  const summary = getDaySummary();
  const calorieTarget = profile?.calorie_target || 2000;

  const getEntriesForMeal = (type: MealType) => entries.filter((e) => e.meal_type === type);

  return (
    <div className="pb-28 px-4 pt-6">
      {/* Date selector */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setDate(shiftDate(selectedDate, -1))}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-surface-500" />
        </button>
        <div className="text-center">
          <h1 className="font-display text-xl font-bold capitalize">{formatDate(selectedDate)}</h1>
          <p className="text-xs text-surface-400">{selectedDate}</p>
        </div>
        <button
          onClick={() => setDate(shiftDate(selectedDate, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-surface-500" />
        </button>
      </div>

      {/* Summary card */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-5">
          <ProgressRing value={summary.calories} max={calorieTarget} size={120} strokeWidth={10}>
            <span className="font-display text-2xl font-bold">{Math.round(summary.calories)}</span>
            <span className="text-[10px] text-surface-500 -mt-0.5">/ {calorieTarget}</span>
            <span className="text-[10px] text-surface-400">kcal</span>
          </ProgressRing>

          <div className="flex-1 space-y-3">
            <MacroBar
              label="Proteína"
              value={summary.protein_g}
              target={profile?.protein_target_g || 120}
              color="#3b82f6"
            />
            <MacroBar
              label="Carbos"
              value={summary.carbs_g}
              target={profile?.carbs_target_g || 250}
              color="#f59e0b"
            />
            <MacroBar
              label="Grasas"
              value={summary.fat_g}
              target={profile?.fat_target_g || 65}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Remaining calories */}
        {calorieTarget - summary.calories > 0 && (
          <p className="text-center text-sm text-surface-500 mt-3">
            Te quedan <span className="font-semibold text-brand-600">{Math.round(calorieTarget - summary.calories)} kcal</span>
          </p>
        )}
      </div>

      {/* Meal sections */}
      <div className="space-y-4">
        {MEALS.map((meal) => {
          const mealEntries = getEntriesForMeal(meal.type);
          const mealCalories = mealEntries.reduce((sum, e) => sum + (e.calories || 0), 0);

          return (
            <div key={meal.type} className="card overflow-hidden">
              {/* Meal header */}
              <div className="flex items-center justify-between px-4 py-3 bg-surface-50/80 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{meal.icon}</span>
                  <span className="font-semibold text-surface-800">{meal.label}</span>
                  {mealEntries.length > 0 && (
                    <span className="text-xs text-surface-400 font-mono">{Math.round(mealCalories)} kcal</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    // Navigate to search with meal_type preset
                    window.dispatchEvent(new CustomEvent('navigate-search', { detail: meal.type }));
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* Entries */}
              {mealEntries.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-surface-400">
                  Sin alimentos registrados
                </div>
              ) : (
                <div className="divide-y divide-surface-50">
                  {mealEntries.map((entry) => (
                    <FoodEntry key={entry.id} entry={entry} onDelete={deleteEntry} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FoodEntry({ entry, onDelete }: { entry: FoodLogEntry; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Thumbnail or placeholder */}
      {entry.image_url ? (
        <img src={entry.image_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-100" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-brand-400" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-surface-800 truncate">{entry.food_name}</p>
          {entry.is_vegan && (
            <span className="flex-shrink-0 w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
              <Leaf className="w-2.5 h-2.5 text-brand-600" />
            </span>
          )}
        </div>
        <p className="text-xs text-surface-400">
          {entry.serving_size_g}g
          {entry.brand && ` · ${entry.brand}`}
        </p>
      </div>

      {/* Macros mini */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold font-mono tabular-nums">{Math.round(entry.calories)}</p>
        <p className="text-[10px] text-surface-400 font-mono tabular-nums">
          P{Math.round(entry.protein_g)} C{Math.round(entry.carbs_g)} G{Math.round(entry.fat_g)}
        </p>
      </div>

      {/* Delete */}
      {confirming ? (
        <button
          onClick={() => { onDelete(entry.id); setConfirming(false); }}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-red-600 bg-red-50 transition-all flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          onBlur={() => setTimeout(() => setConfirming(false), 2000)}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-surface-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
