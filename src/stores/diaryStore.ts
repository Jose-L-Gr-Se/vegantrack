import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { FoodLogEntry, NutrientSummary } from '@/types';

interface DiaryState {
  entries: FoodLogEntry[];
  selectedDate: string;
  loading: boolean;
  setDate: (date: string) => void;
  fetchEntries: (userId: string, date: string) => Promise<void>;
  addEntry: (entry: Omit<FoodLogEntry, 'id' | 'created_at'>) => Promise<{ error: string | null }>;
  deleteEntry: (id: string) => Promise<void>;
  getDaySummary: () => NutrientSummary;
}

const today = () => new Date().toISOString().split('T')[0];

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  selectedDate: today(),
  loading: false,

  setDate: (date) => set({ selectedDate: date }),

  fetchEntries: async (userId, date) => {
    set({ loading: true });
    const { data } = await supabase
      .from('food_log')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    set({ entries: (data ?? []) as FoodLogEntry[], loading: false });
  },

  addEntry: async (entry) => {
    const { data, error } = await supabase
      .from('food_log')
      .insert(entry)
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ entries: [...state.entries, data as FoodLogEntry] }));
    }
    return { error: error?.message ?? null };
  },

  deleteEntry: async (id) => {
    await supabase.from('food_log').delete().eq('id', id);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
  },

  getDaySummary: () => {
    const { entries } = get();
    return entries.reduce<NutrientSummary>(
      (acc, e) => ({
        calories: acc.calories + (e.calories || 0),
        protein_g: acc.protein_g + (e.protein_g || 0),
        carbs_g: acc.carbs_g + (e.carbs_g || 0),
        fat_g: acc.fat_g + (e.fat_g || 0),
        fiber_g: acc.fiber_g + (e.fiber_g || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    );
  },
}));
