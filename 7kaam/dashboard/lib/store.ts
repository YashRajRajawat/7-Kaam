import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin } from '@/types';

interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (admin: Admin, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (admin, accessToken, refreshToken) => {
        localStorage.setItem('7kaam_access_token', accessToken);
        localStorage.setItem('7kaam_refresh_token', refreshToken);
        set({ admin, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('7kaam_access_token');
        localStorage.removeItem('7kaam_refresh_token');
        set({ admin: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setAccessToken: (token) => {
        localStorage.setItem('7kaam_access_token', token);
        set({ accessToken: token });
      },
    }),
    {
      name: '7kaam-auth',
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
