import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { CustomFood } from '@/types';

interface CustomFoodState {
  customFoods: CustomFood[];
  loading: boolean;
  fetchCustomFoods: (userId: string) => Promise<void>;
  searchCustomFoods: (query: string) => CustomFood[];
  createCustomFood: (food: Omit<CustomFood, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data: CustomFood | null; error: string | null }>;
  updateCustomFood: (id: string, food: Partial<Omit<CustomFood, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<{ error: string | null }>;
  deleteCustomFood: (id: string) => Promise<{ error: string | null }>;
}

export const useCustomFoodStore = create<CustomFoodState>((set, get) => ({
  customFoods: [],
  loading: false,

  fetchCustomFoods: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('custom_foods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error) {
      set({ customFoods: (data ?? []) as CustomFood[], loading: false });
    } else {
      set({ loading: false });
    }
  },

  searchCustomFoods: (query) => {
    const { customFoods } = get();
    if (!query.trim()) return customFoods;
    const lower = query.toLowerCase();
    return customFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(lower) ||
        (f.brand && f.brand.toLowerCase().includes(lower))
    );
  },

  createCustomFood: async (food) => {
    const { data, error } = await supabase
      .from('custom_foods')
      .insert(food)
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ customFoods: [data as CustomFood, ...state.customFoods] }));
      return { data: data as CustomFood, error: null };
    }
    return { data: null, error: error?.message ?? 'Error al crear alimento' };
  },

  updateCustomFood: async (id, food) => {
    const { data, error } = await supabase
      .from('custom_foods')
      .update(food)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      set((state) => ({
        customFoods: state.customFoods.map((f) => (f.id === id ? (data as CustomFood) : f)),
      }));
    }
    return { error: error?.message ?? null };
  },

  deleteCustomFood: async (id) => {
    const { error } = await supabase.from('custom_foods').delete().eq('id', id);

    if (!error) {
      set((state) => ({ customFoods: state.customFoods.filter((f) => f.id !== id) }));
    }
    return { error: error?.message ?? null };
  },
}));
