import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { supabase } from '@/lib/supabase';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { ChevronLeft, ChevronRight, Plus, Trash2, Leaf, X, Save, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
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
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function DiaryPage() {
  const { user, profile } = useAuthStore();
  const { entries, selectedDate, setDate, fetchEntries, deleteEntry, getDaySummary } = useDiaryStore();
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [showMacroDetail, setShowMacroDetail] = useState(false);

  useEffect(() => {
    if (user) fetchEntries(user.id, selectedDate);
  }, [user?.id, selectedDate]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchEntries(user.id, selectedDate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user?.id, selectedDate]);

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

      {/* Summary card — clickable for detail */}
      <button
        onClick={() => setShowMacroDetail(true)}
        className="card p-5 mb-5 w-full text-left"
      >
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

        {/* Remaining / over */}
        <div className="flex items-center justify-center gap-1 mt-3">
          {calorieTarget - summary.calories > 0 ? (
            <p className="text-sm text-surface-500">
              Te quedan <span className="font-semibold text-brand-600">{Math.round(calorieTarget - summary.calories)} kcal</span>
            </p>
          ) : summary.calories > 0 ? (
            <p className="text-sm text-red-500">
              Excedido por <span className="font-semibold">{Math.round(summary.calories - calorieTarget)} kcal</span>
            </p>
          ) : null}
          <Info className="w-3 h-3 text-surface-300" />
        </div>
      </button>

      {/* Macro detail modal */}
      {showMacroDetail && (
        <MacroDetailModal
          summary={summary}
          profile={profile}
          entries={entries}
          onClose={() => setShowMacroDetail(false)}
        />
      )}

      {/* Edit entry modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            if (user) fetchEntries(user.id, selectedDate);
          }}
        />
      )}

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
                    <FoodEntry
                      key={entry.id}
                      entry={entry}
                      onDelete={deleteEntry}
                      onEdit={setEditingEntry}
                    />
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

// ==================== FOOD ENTRY (clickable to edit) ====================
function FoodEntry({
  entry,
  onDelete,
  onEdit,
}: {
  entry: FoodLogEntry;
  onDelete: (id: string) => void;
  onEdit: (entry: FoodLogEntry) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Thumbnail or placeholder — tapping opens edit */}
      <button onClick={() => onEdit(entry)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        {entry.image_url ? (
          <img src={entry.image_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-100" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Leaf className="w-4 h-4 text-brand-400" />
          </div>
        )}

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
      </button>

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

// ==================== EDIT ENTRY MODAL ====================
function EditEntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: FoodLogEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Recalculate from the per-100g values
  const originalRatio = entry.serving_size_g / 100;
  const caloriesPer100g = originalRatio > 0 ? entry.calories / originalRatio : 0;
  const proteinPer100g = originalRatio > 0 ? entry.protein_g / originalRatio : 0;
  const carbsPer100g = originalRatio > 0 ? entry.carbs_g / originalRatio : 0;
  const fatPer100g = originalRatio > 0 ? entry.fat_g / originalRatio : 0;
  const fiberPer100g = originalRatio > 0 ? entry.fiber_g / originalRatio : 0;
  const sugarPer100g = originalRatio > 0 ? entry.sugar_g / originalRatio : 0;
  const satFatPer100g = originalRatio > 0 ? entry.saturated_fat_g / originalRatio : 0;
  const sodiumPer100g = originalRatio > 0 ? entry.sodium_mg / originalRatio : 0;

  const [gramsInput, setGramsInput] = useState(String(entry.serving_size_g));
  const [saving, setSaving] = useState(false);

  const grams = Math.max(1, parseInt(gramsInput) || 0);
  const ratio = grams / 100;

  const handleSave = async () => {
    if (grams <= 0) return;
    setSaving(true);

    const { error } = await supabase
      .from('food_log')
      .update({
        serving_size_g: grams,
        calories: Math.round(caloriesPer100g * ratio),
        protein_g: Math.round(proteinPer100g * ratio * 10) / 10,
        carbs_g: Math.round(carbsPer100g * ratio * 10) / 10,
        fat_g: Math.round(fatPer100g * ratio * 10) / 10,
        fiber_g: Math.round(fiberPer100g * ratio * 10) / 10,
        sugar_g: Math.round(sugarPer100g * ratio * 10) / 10,
        saturated_fat_g: Math.round(satFatPer100g * ratio * 10) / 10,
        sodium_mg: Math.round(sodiumPer100g * ratio),
      })
      .eq('id', entry.id);

    setSaving(false);
    if (!error) onSaved();
  };

  return (
<div className="fixed inset-0 z-[60] bg-black/40 flex items-stretch justify-center" onClick={onClose}>
      <div
        className="bg-white w-full mt-8 rounded-t-3xl overflow-y-auto pb-24"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white rounded-t-3xl">
          <div className="w-10 h-1 bg-surface-300 rounded-full" />
        </div>
        <div className="px-5 pb-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {entry.image_url ? (
                <img src={entry.image_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-100" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-brand-400" />
                </div>
              )}
              <div>
                <h3 className="font-display font-bold text-surface-900">{entry.food_name}</h3>
                {entry.brand && <p className="text-xs text-surface-400">{entry.brand}</p>}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100">
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>

          {/* Grams editor */}
          <div>
            <label className="label">Cantidad (gramos)</label>
            <input
              type="number"
              value={gramsInput}
              onChange={(e) => setGramsInput(e.target.value)}
              onBlur={() => {
                if (!gramsInput || parseInt(gramsInput) <= 0) setGramsInput(String(entry.serving_size_g));
              }}
              className="input font-mono"
              inputMode="numeric"
            />
            <div className="flex gap-2 mt-2">
              {[50, 100, 150, 200].map((g) => (
                <button
                  key={g}
                  onClick={() => setGramsInput(String(g))}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    grams === g
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-surface-200 text-surface-500'
                  }`}
                >
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {/* Updated nutrients preview */}
          <div className="bg-surface-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Calorías</span>
              <span className="font-mono">{Math.round(caloriesPer100g * ratio)} kcal</span>
            </div>
            <div className="h-px bg-surface-200" />
            {[
              { label: 'Proteínas', val: proteinPer100g, color: 'text-blue-600' },
              { label: 'Carbohidratos', val: carbsPer100g, color: 'text-amber-600' },
              { label: 'Grasas', val: fatPer100g, color: 'text-rose-600' },
              { label: 'Fibra', val: fiberPer100g, color: 'text-green-600' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span>{item.label}</span>
                <span className={`font-mono ${item.color}`}>{(item.val * ratio).toFixed(1)}g</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || grams <= 0}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? <Spinner className="text-white" /> : <><Save className="w-4 h-4" /> Guardar cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MACRO DETAIL MODAL ====================
function MacroDetailModal({
  summary,
  profile,
  entries,
  onClose,
}: {
  summary: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };
  profile: any;
  entries: FoodLogEntry[];
  onClose: () => void;
}) {
  const calorieTarget = profile?.calorie_target || 2000;
  const proteinTarget = profile?.protein_target_g || 120;
  const carbsTarget = profile?.carbs_target_g || 250;
  const fatTarget = profile?.fat_target_g || 65;

  const pct = (val: number, target: number) => target > 0 ? Math.round((val / target) * 100) : 0;

  // Calorie breakdown by meal
  const mealBreakdown = MEALS.map((meal) => {
    const mealEntries = entries.filter((e) => e.meal_type === meal.type);
    return {
      ...meal,
      calories: mealEntries.reduce((s, e) => s + (e.calories || 0), 0),
      protein: mealEntries.reduce((s, e) => s + (e.protein_g || 0), 0),
      count: mealEntries.length,
    };
  }).filter(m => m.count > 0);

  return (
<div className="fixed inset-0 z-[60] bg-black/40 flex items-stretch justify-center" onClick={onClose}>
      <div
        className="bg-white w-full mt-8 rounded-t-3xl overflow-y-auto pb-24"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white rounded-t-3xl">
          <div className="w-10 h-1 bg-surface-300 rounded-full" />
        </div>
        <div className="px-5 pb-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Detalle nutricional</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100">
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>

          {/* Calories */}
          <div className="text-center">
            <ProgressRing value={summary.calories} max={calorieTarget} size={140} strokeWidth={12}>
              <span className="font-display text-3xl font-bold">{Math.round(summary.calories)}</span>
              <span className="text-xs text-surface-400">/ {calorieTarget} kcal</span>
            </ProgressRing>
          </div>

          {/* Macro grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Proteína', val: summary.protein_g, target: proteinTarget, unit: 'g', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Carbos', val: summary.carbs_g, target: carbsTarget, unit: 'g', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Grasas', val: summary.fat_g, target: fatTarget, unit: 'g', color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Fibra', val: summary.fiber_g, target: 30, unit: 'g', color: 'text-green-600', bg: 'bg-green-50' },
            ].map((m) => (
              <div key={m.label} className={`${m.bg} rounded-2xl p-3 text-center`}>
                <div className={`font-display text-lg font-bold ${m.color}`}>
                  {Math.round(m.val)}{m.unit}
                </div>
                <div className="text-[10px] text-surface-500 mt-0.5">{m.label}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${
                  pct(m.val, m.target) >= 90 && pct(m.val, m.target) <= 110 ? 'text-brand-600 font-semibold' :
                  pct(m.val, m.target) > 110 ? 'text-red-500' : 'text-surface-400'
                }`}>
                  {pct(m.val, m.target)}% del objetivo
                </div>
              </div>
            ))}
          </div>

          {/* Calorie distribution by meal */}
          {mealBreakdown.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-surface-600 mb-2">Distribución por comida</h4>
              <div className="space-y-2">
                {mealBreakdown.map((meal) => {
                  const pctCal = summary.calories > 0 ? Math.round((meal.calories / summary.calories) * 100) : 0;
                  return (
                    <div key={meal.type} className="flex items-center gap-3">
                      <span className="text-base">{meal.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-surface-700">{meal.label}</span>
                          <span className="font-mono text-surface-600">{Math.round(meal.calories)} kcal</span>
                        </div>
                        <div className="h-1.5 bg-surface-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pctCal}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-surface-400 w-8 text-right font-mono">{pctCal}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Macro ratios */}
          {summary.calories > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-surface-600 mb-2">Ratio de macros</h4>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div className="bg-blue-400" style={{ width: `${Math.round((summary.protein_g * 4 / summary.calories) * 100)}%` }} />
                <div className="bg-amber-400" style={{ width: `${Math.round((summary.carbs_g * 4 / summary.calories) * 100)}%` }} />
                <div className="bg-rose-400" style={{ width: `${Math.round((summary.fat_g * 9 / summary.calories) * 100)}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-blue-600 font-mono">{Math.round((summary.protein_g * 4 / summary.calories) * 100)}% P</span>
                <span className="text-[10px] text-amber-600 font-mono">{Math.round((summary.carbs_g * 4 / summary.calories) * 100)}% C</span>
                <span className="text-[10px] text-rose-600 font-mono">{Math.round((summary.fat_g * 9 / summary.calories) * 100)}% G</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}