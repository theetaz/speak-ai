import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { type Profile } from '@/types/database';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<void>;
  createProfile: (profile: Omit<Profile, 'created_at' | 'updated_at'>) => Promise<void>;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,

  fetchProfile: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    set({ profile: data, loading: false });
  },

  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    set({ profile: data });
  },

  createProfile: async (profile) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    if (error) throw error;
    set({ profile: data });
  },

  clear: () => set({ profile: null }),
}));
