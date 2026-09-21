/**
 * Auth Context & State Provider
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Restaurant } from '../types';
import { authService } from '../services/authService';
import { tokenStorage } from '../storage/tokenStorage';
import { setOnUnauthorizedCallback } from '../api/client';

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore
    } finally {
      setUser(null);
      setRestaurant(null);
      setToken(null);
    }
  }, []);

  const loadStoredSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await tokenStorage.getToken();
      const storedUser = await tokenStorage.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        if (storedUser.restaurant) {
          setRestaurant(storedUser.restaurant);
        }

        // Verify token against /auth/me in background
        try {
          const freshUser = await authService.getProfile();
          setUser(freshUser);
          if (freshUser.restaurant) {
            setRestaurant(freshUser.restaurant);
          }
        } catch {
          // If profile fails due to 401, handleLogout will be triggered
        }
      }
    } catch (e) {
      console.error('Session restore failed', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredSession();
    setOnUnauthorizedCallback(() => {
      handleLogout();
    });
  }, [loadStoredSession, handleLogout]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(username, password);
      setUser(res.user);
      setToken(res.token);
      if (res.user.restaurant) {
        setRestaurant(res.user.restaurant);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const freshUser = await authService.getProfile();
      setUser(freshUser);
      if (freshUser.restaurant) {
        setRestaurant(freshUser.restaurant);
      }
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurant,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout: handleLogout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
