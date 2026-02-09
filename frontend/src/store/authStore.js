/**
 * Auth Store - Zustand store for authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const ROLE_HIERARCHY = {
  citizen: 1,
  uc_chairman: 2,
  town_chairman: 3,
  mayor: 4,
  website_admin: 5,
};

const DASHBOARD_PATHS = {
  website_admin: '/admin/dashboard',
  mayor: '/mayor/dashboard',
  town_chairman: '/official/dashboard',
  uc_chairman: '/official/dashboard',
  citizen: '/citizen/dashboard',
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user, loading: false }),

      setToken: (token) => {
        token ? localStorage.setItem('accessToken', token) : localStorage.removeItem('accessToken');
        set({ token });
      },

      setLoading: (loading) => set({ loading }),

      login: (user, token, refreshToken) => {
        localStorage.setItem('accessToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, loading: false });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false, loading: false });
      },

      updateUser: (updates) => {
        const updatedUser = { ...get().user, ...updates };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      },

      initializeAuth: () => {
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({ user, token, isAuthenticated: true, loading: false });
            return true;
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
          }
        }
        set({ loading: false });
        return false;
      },

      hasRole: (requiredRole) => {
        const user = get().user;
        if (!user?.role) return false;
        return (ROLE_HIERARCHY[user.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
      },

      isRole: (role) => get().user?.role === role,

      getDashboardPath: () => DASHBOARD_PATHS[get().user?.role] || '/login',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
