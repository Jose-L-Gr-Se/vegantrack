import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Supplement, SupplementNutrientKey } from '@/types';

interface SupplementState {
  supplements: Supplement[];
  takenToday: Set<string>;
  loading: boolean;
  fetchSupplements: (userId: string) => Promise<void>;
  fetchTodayLogs: (userId: string, date: string) => Promise<void>;
  createSupplement: (
    userId: string,
    data: Pick<Supplement, 'name' | 'nutrient_key' | 'dose_amount' | 'dose_unit'>
  ) => Promise<void>;
  updateSupplement: (id: string, data: Partial<Supplement>) => Promise<void>;
  deleteSupplement: (id: string) => Promise<void>;
  toggleTaken: (userId: string, supplementId: string, date: string) => Promise<void>;
  getTodayContributions: () => Partial<Record<SupplementNutrientKey, number>>;
}

export const useSupplementStore = create<SupplementState>((set, get) => ({
  supplements: [],
  takenToday: new Set(),
  loading: false,

  fetchSupplements: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('supplements')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error) set({ supplements: (data ?? []) as Supplement[] });
    set({ loading: false });
  },

  fetchTodayLogs: async (userId, date) => {
    const { data } = await supabase
      .from('supplement_logs')
      .select('supplement_id')
      .eq('user_id', userId)
      .eq('date', date);

    set({ takenToday: new Set((data ?? []).map((r: any) => r.supplement_id)) });
  },

  createSupplement: async (userId, data) => {
    const { supplements } = get();
    const { data: row, error } = await supabase
      .from('supplements')
      .insert({
        user_id: userId,
        ...data,
        frequency: 'daily',
        is_active: true,
        sort_order: supplements.length,
      })
      .select()
      .single();

    if (!error && row) {
      set((s) => ({ supplements: [...s.supplements, row as Supplement] }));
    }
  },

  updateSupplement: async (id, data) => {
    const { error } = await supabase
      .from('supplements')
      .update(data)
      .eq('id', id);

    if (!error) {
      set((s) => ({
        supplements: s.supplements.map((sup) =>
          sup.id === id ? { ...sup, ...data } : sup
        ),
      }));
    }
  },

  deleteSupplement: async (id) => {
    await supabase.from('supplements').delete().eq('id', id);
    set((s) => ({ supplements: s.supplements.filter((sup) => sup.id !== id) }));
  },

  toggleTaken: async (userId, supplementId, date) => {
    const { takenToday } = get();
    const isTaken = takenToday.has(supplementId);

    // Optimistic update
    const next = new Set(takenToday);
    isTaken ? next.delete(supplementId) : next.add(supplementId);
    set({ takenToday: next });

    if (isTaken) {
      const { error } = await supabase
        .from('supplement_logs')
        .delete()
        .eq('user_id', userId)
        .eq('supplement_id', supplementId)
        .eq('date', date);
      if (error) set({ takenToday }); // revert on error
    } else {
      const { error } = await supabase
        .from('supplement_logs')
        .upsert(
          { user_id: userId, supplement_id: supplementId, date },
          { onConflict: 'user_id,supplement_id,date' }
        );
      if (error) set({ takenToday }); // revert on error
    }
  },

  getTodayContributions: () => {
    const { supplements, takenToday } = get();
    const result: Partial<Record<SupplementNutrientKey, number>> = {};
    for (const sup of supplements) {
      if (sup.is_active && takenToday.has(sup.id)) {
        const k = sup.nutrient_key;
        result[k] = (result[k] ?? 0) + sup.dose_amount;
      }
    }
    return result;
  },
}));
