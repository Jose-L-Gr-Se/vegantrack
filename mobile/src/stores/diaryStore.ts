import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import type { FoodLogEntry, MealGroup, NutrientSummary, MicroAggregate } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function emptyMicro(): MicroAggregate {
  return { value: 0, knownEntries: 0, totalEntries: 0, coverage: 0 };
}

function emptySummary(): NutrientSummary {
  return {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    micros: {
      vitamin_b12_mcg: emptyMicro(),
      iron_mg: emptyMicro(),
      zinc_mg: emptyMicro(),
      calcium_mg: emptyMicro(),
      omega3_g: emptyMicro(),
      vitamin_d_mcg: emptyMicro(),
    },
  };
}

const MEAL_META: Record<FoodLogEntry['meal_type'], { label: string; icon: string; order: number }> = {
  breakfast: { label: 'Desayuno', icon: '🌅', order: 0 },
  lunch:     { label: 'Comida',   icon: '☀️', order: 1 },
  dinner:    { label: 'Cena',     icon: '🌙', order: 2 },
  snack:     { label: 'Snacks',   icon: '🍎', order: 3 },
};

// ─── store ───────────────────────────────────────────────────────────────────

interface DiaryState {
  entries: FoodLogEntry[];
  selectedDate: string;
  loading: boolean;
  error: string | null;

  // actions
  fetchEntries: (userId: string) => Promise<void>;
  setDate: (date: string) => void;
  goToPrevDay: (userId: string) => void;
  goToNextDay: (userId: string) => void;
  deleteEntry: (entryId: string) => Promise<void>;

  // computed (called by components, not stored — avoids stale data)
  getMealGroups: () => MealGroup[];
  getDaySummary: () => NutrientSummary;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  selectedDate: today(),
  loading: false,
  error: null,

  fetchEntries: async (userId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('food_log')
      .select('*')
      .eq('user_id', userId)
      .eq('date', get().selectedDate)
      .order('created_at', { ascending: true });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ entries: data ?? [], loading: false });
  },

  setDate: (date) => set({ selectedDate: date, entries: [] }),

  goToPrevDay: (userId) => {
    const current = new Date(get().selectedDate);
    current.setDate(current.getDate() - 1);
    const newDate = current.toISOString().split('T')[0];
    set({ selectedDate: newDate, entries: [] });
    get().fetchEntries(userId);
  },

  goToNextDay: (userId) => {
    const current = new Date(get().selectedDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // don't navigate past tomorrow
    if (current >= tomorrow) return;
    current.setDate(current.getDate() + 1);
    const newDate = current.toISOString().split('T')[0];
    set({ selectedDate: newDate, entries: [] });
    get().fetchEntries(userId);
  },

  deleteEntry: async (entryId) => {
    // optimistic: remove from local state immediately
    set(state => ({ entries: state.entries.filter(e => e.id !== entryId) }));
    const { error } = await supabase
      .from('food_log')
      .delete()
      .eq('id', entryId);
    // on error: refetch to restore correct state
    if (error) {
      const { data } = await supabase.auth.getUser();
      if (data.user) get().fetchEntries(data.user.id);
    }
  },

  getMealGroups: () => {
    const { entries } = get();
    const groups: Record<string, FoodLogEntry[]> = {
      breakfast: [], lunch: [], dinner: [], snack: [],
    };
    for (const entry of entries) {
      groups[entry.meal_type].push(entry);
    }

    return (Object.keys(MEAL_META) as FoodLogEntry['meal_type'][])
      .sort((a, b) => MEAL_META[a].order - MEAL_META[b].order)
      .map(type => {
        const mealEntries = groups[type];
        return {
          type,
          label: MEAL_META[type].label,
          icon: MEAL_META[type].icon,
          entries: mealEntries,
          totals: summarize(mealEntries),
        };
      });
  },

  getDaySummary: () => summarize(get().entries),
}));

// ─── pure calculation (no side effects) ──────────────────────────────────────

function summarize(entries: FoodLogEntry[]): NutrientSummary {
  if (entries.length === 0) return emptySummary();

  const result = emptySummary();

  for (const e of entries) {
    result.calories  += e.calories;
    result.protein_g += e.protein_g;
    result.carbs_g   += e.carbs_g;
    result.fat_g     += e.fat_g;
    result.fiber_g   += e.fiber_g;

    accumulateMicro(result.micros.vitamin_b12_mcg, e.vitamin_b12_mcg, e.vitamin_b12_known);
    accumulateMicro(result.micros.iron_mg,         e.iron_mg,         e.iron_known);
    accumulateMicro(result.micros.zinc_mg,         e.zinc_mg,         e.zinc_known);
    accumulateMicro(result.micros.calcium_mg,      e.calcium_mg,      e.calcium_known);
    accumulateMicro(result.micros.omega3_g,        e.omega3_g,        e.omega3_known);
    accumulateMicro(result.micros.vitamin_d_mcg,   e.vitamin_d_mcg,   e.vitamin_d_known);
  }

  // round to 1 decimal
  result.calories  = Math.round(result.calories);
  result.protein_g = Math.round(result.protein_g * 10) / 10;
  result.carbs_g   = Math.round(result.carbs_g   * 10) / 10;
  result.fat_g     = Math.round(result.fat_g     * 10) / 10;
  result.fiber_g   = Math.round(result.fiber_g   * 10) / 10;

  return result;
}

function accumulateMicro(
  agg: MicroAggregate,
  value: number | null,
  known: boolean
): void {
  agg.totalEntries += 1;
  if (known && value !== null) {
    agg.value += value;
    agg.knownEntries += 1;
  }
  agg.coverage = agg.knownEntries / agg.totalEntries;
}
