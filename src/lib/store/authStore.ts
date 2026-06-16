import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';

interface AuthState {
  user: User | null;
  profile: { username: string; is_approved?: boolean } | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: { username: string; is_approved?: boolean } | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  initialize: async () => {
    if (get().initialized) return;
    
    set({ loading: true });
    const supabase = createClient();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user });
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, is_approved')
          .eq('id', session.user.id)
          .single();
          
        if (profileData) {
          set({ profile: profileData });
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
    
    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        set({ user: session.user });
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, is_approved')
          .eq('id', session.user.id)
          .single();
        if (profileData) {
          set({ profile: profileData });
        }
      } else {
        set({ user: null, profile: null });
      }
      set({ loading: false });
    });
  },
  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  }
}));
