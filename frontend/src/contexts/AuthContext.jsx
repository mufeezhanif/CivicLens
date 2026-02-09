/**
 * AuthContext
 * Global authentication state management
 */

import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '../services/api';
import { ROLES, ROLE_HIERARCHY } from '../constants/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');

        if (storedUser && accessToken) {
          // Verify token is still valid by fetching user profile
          try {
            const userData = await authApi.getMe();
            setUser(userData.user || userData);
            localStorage.setItem('user', JSON.stringify(userData.user || userData));
          } catch {
            // Token expired or invalid
            console.warn('Session expired, clearing auth state');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(credentials);
      setUser(response.user);
      return response;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.register(userData);
      // Auto-login after registration if tokens are returned
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
      }
      return response;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data) => {
    const response = await authApi.updateProfile(data);
    const updatedUser = response.user || response;
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return response;
  }, []);

  /**
   * Check if user has required role
   */
  const hasRole = useCallback((requiredRole) => {
    if (!user?.role) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
  }, [user]);

  /**
   * Check if user has exact role
   */
  const isRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  /**
   * Get dashboard path based on user role
   */
  const getDashboardPath = useCallback(() => {
    if (!user?.role) return '/login';
    const paths = {
      website_admin: '/admin/dashboard',
      mayor: '/mayor/dashboard',
      town_chairman: '/official/dashboard',
      uc_chairman: '/official/dashboard',
    };
    return paths[user.role] || '/citizen/dashboard';
  }, [user]);

  /**
   * Get login path based on role type
   */
  const getLoginPath = useCallback((roleType = 'citizen') => {
    switch (roleType) {
      case 'official':
        return '/official/login';
      case 'admin':
        return '/sudo/admin';
      default:
        return '/login';
    }
  }, []);

  // Memoize context value
  const value = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    hasRole,
    isRole,
    getDashboardPath,
    getLoginPath,
    clearError: () => setError(null),
  }), [user, loading, error, login, register, logout, updateProfile, hasRole, isRole, getDashboardPath, getLoginPath]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
