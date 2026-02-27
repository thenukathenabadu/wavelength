import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;          // true while onAuthStateChanged fires on startup
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,             // starts as true — we don't know yet
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

// Selector helpers
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useAuthLoading = () => useAuthStore((s) => s.loading);
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
