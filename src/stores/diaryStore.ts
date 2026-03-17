import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { FoodLogEntry, NutrientSummary, RecentFood } from '@/types';

interface DiaryState {
  entries: FoodLogEntry[];
  selectedDate: string;
  loading: boolean;
  recentFoods: RecentFood[];
  setDate: (date: string) => void;
  fetchEntries: (userId: string, date: string) => Promise<void>;
  addEntry: (entry: Omit<FoodLogEntry, 'id' | 'created_at'>) => Promise<{ error: string | null }>;
  deleteEntry: (id: string) => Promise<void>;
  getDaySummary: () => NutrientSummary;
  fetchRecentFoods: (userId: string) => Promise<void>;
  getWeekData: (userId: string) => Promise<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>;
}

const today = () => new Date().toISOString().split('T')[0];

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  selectedDate: today(),
  loading: false,
  recentFoods: [],

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

  fetchRecentFoods: async (userId) => {
    // Get last 50 log entries, deduplicate by food_name, rank by frequency
    const { data } = await supabase
      .from('food_log')
      .select('food_name, barcode, brand, image_url, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, saturated_fat_g, sodium_mg, is_vegan, serving_size_g')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return;

    const foodMap = new Map<string, RecentFood>();
    for (const entry of data) {
      const key = entry.food_name + (entry.barcode || '');
      const existing = foodMap.get(key);
      if (existing) {
        existing.use_count++;
      } else {
        const ratio = entry.serving_size_g > 0 ? 100 / entry.serving_size_g : 1;
        foodMap.set(key, {
          food_name: entry.food_name,
          barcode: entry.barcode,
          brand: entry.brand,
          image_url: entry.image_url,
          calories_per_100g: Math.round(entry.calories * ratio),
          protein_per_100g: Math.round(entry.protein_g * ratio * 10) / 10,
          carbs_per_100g: Math.round(entry.carbs_g * ratio * 10) / 10,
          fat_per_100g: Math.round(entry.fat_g * ratio * 10) / 10,
          fiber_per_100g: Math.round((entry.fiber_g || 0) * ratio * 10) / 10,
          sugar_per_100g: Math.round((entry.sugar_g || 0) * ratio * 10) / 10,
          saturated_fat_per_100g: Math.round((entry.saturated_fat_g || 0) * ratio * 10) / 10,
          sodium_per_100g: Math.round((entry.sodium_mg || 0) * ratio * 10) / 10,
          is_vegan: entry.is_vegan,
          last_serving_g: entry.serving_size_g,
          use_count: 1,
        });
      }
    }

    const sorted = Array.from(foodMap.values()).sort((a, b) => b.use_count - a.use_count);
    set({ recentFoods: sorted.slice(0, 20) });
  },

  getWeekData: async (userId) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const { data } = await supabase
      .from('food_log')
      .select('date, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0]);

    const dayMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();

    // Initialize all 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dayMap.set(dateStr, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }

    // Aggregate
    for (const entry of data || []) {
      const existing = dayMap.get(entry.date);
      if (existing) {
        existing.calories += entry.calories || 0;
        existing.protein += entry.protein_g || 0;
        existing.carbs += entry.carbs_g || 0;
        existing.fat += entry.fat_g || 0;
      }
    }

    return Array.from(dayMap.entries()).map(([date, vals]) => ({
      date: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' }),
      ...vals,
    }));
  },
}));
