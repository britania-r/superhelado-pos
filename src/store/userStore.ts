// src/store/userStore.ts
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { supabase } from '../config/supabaseClient';

interface UserState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setUserAndProfile: (user: User | null, profile: Profile | null) => void;
  setIsLoading: (loading: boolean) => void;
  clearUser: () => void;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUserAndProfile: (user, profile) => set({ user, profile, isLoading: false }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearUser: () => set({ user: null, profile: null, isLoading: false }),
  
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      throw new Error("No se pudo cerrar sesión");
    }
    get().clearUser();
  },
}));