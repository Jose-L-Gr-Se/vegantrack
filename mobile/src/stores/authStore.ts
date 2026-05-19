import { create } from 'zustand';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
}

function navigateByState(user: User | null, profile: Profile | null) {
  if (!user) {
    router.replace('/(auth)/login');
    return;
  }
  if (!profile?.calorie_target) {
    router.replace('/(onboarding)');
    return;
  }
  router.replace('/(tabs)/diary');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    let profile: Profile | null = null;

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = data ?? null;
    }

    set({ user, profile, initialized: true });
    navigateByState(user, profile);

    supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      let currentProfile: Profile | null = null;

      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        currentProfile = data ?? null;
      }

      set({ user: currentUser, profile: currentProfile });

      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login');
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No se pudo obtener el usuario' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    set({ user, profile: profile ?? null });
    navigateByState(user, profile ?? null);
    return { error: null };
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'No se pudo crear el usuario' };

    set({ user: data.user, profile: null });
    router.replace('/(onboarding)');
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    set({ profile: data ?? null });
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: 'No autenticado' };

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) return { error: error.message };
    set({ profile: data });
    return { error: null };
  },
}));
