import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { WeightLog } from '@/types';

interface ChartPoint {
  date: string;
  displayDate: string;
  weight: number | null;
  avg7: number | null;
}

interface WeightStats {
  current: number | null;
  start: number | null;
  min: number | null;
  max: number | null;
  change: number | null;
}

interface WeightState {
  logs: WeightLog[];
  loading: boolean;
  fetchLogs: (userId: string) => Promise<void>;
  addLog: (userId: string, date: string, weight_kg: number, note?: string) => Promise<{ error: string | null }>;
  deleteLog: (id: string) => Promise<void>;
  getChartData: (days: number) => ChartPoint[];
  getStats: () => WeightStats;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  logs: [],
  loading: false,

  fetchLogs: async (userId) => {
    set({ loading: true });
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);

    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!error) {
      set({ logs: (data ?? []) as WeightLog[], loading: false });
    } else {
      set({ loading: false });
    }
  },

  addLog: async (userId, date, weight_kg, note) => {
    const { data, error } = await supabase
      .from('weight_logs')
      .upsert(
        { user_id: userId, date, weight_kg, note: note ?? null },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (!error && data) {
      set((state) => {
        const filtered = state.logs.filter((l) => l.date !== date);
        return {
          logs: [...filtered, data as WeightLog].sort((a, b) =>
            a.date.localeCompare(b.date)
          ),
        };
      });

      // Sincronizar peso actual en perfil — fire and forget
      supabase
        .from('profiles')
        .update({ weight_kg })
        .eq('id', userId)
        .then(async () => {
          const { useAuthStore } = await import('@/stores/authStore');
          await useAuthStore.getState().fetchProfile();
        });
    }

    return { error: error?.message ?? null };
  },

  deleteLog: async (id) => {
    await supabase.from('weight_logs').delete().eq('id', id);
    set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
  },

  getChartData: (days) => {
    const { logs } = get();
    const today = new Date();
    const points: ChartPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = logs.find((l) => l.date === dateStr);
      points.push({
        date: dateStr,
        displayDate: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        weight: entry?.weight_kg ?? null,
        avg7: null,
      });
    }

    // Media móvil de 7 días (mínimo 2 puntos)
    for (let i = 0; i < points.length; i++) {
      const window = points.slice(Math.max(0, i - 6), i + 1);
      const withData = window.filter((p) => p.weight !== null);
      if (withData.length >= 2) {
        points[i].avg7 =
          Math.round(
            (withData.reduce((s, p) => s + p.weight!, 0) / withData.length) * 10
          ) / 10;
      }
    }

    // Recortar días vacíos iniciales
    const firstIdx = points.findIndex((p) => p.weight !== null);
    if (firstIdx < 0) return [];
    return points.slice(Math.max(0, firstIdx - 1));
  },

  getStats: () => {
    const { logs } = get();
    if (logs.length === 0) {
      return { current: null, start: null, min: null, max: null, change: null };
    }
    const weights = logs.map((l) => l.weight_kg);
    const current = logs[logs.length - 1].weight_kg;
    const start = logs[0].weight_kg;
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const change = Math.round((current - start) * 10) / 10;
    return { current, start, min, max, change };
  },
}));
