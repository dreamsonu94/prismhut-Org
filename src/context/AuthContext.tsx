import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleType } from '../types/index.js';
import { api } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (roles: RoleType[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pos_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success && res.data?.data?.user) {
          setUser(res.data.data.user);
          localStorage.setItem('pos_user', JSON.stringify(res.data.data.user));
        }
      } catch (err) {
        console.warn('Session verification failed, logging out');
        setUser(null);
        setToken(null);
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
      } finally {
        setIsLoading(false);
      }
    };

    verifyMe();
  }, [token]);

  const login = async (username: string, password = 'password123'): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data?.success && res.data?.data) {
        const { user: loggedInUser, token: authToken } = res.data.data;
        setUser(loggedInUser);
        setToken(authToken);
        localStorage.setItem('pos_token', authToken);
        localStorage.setItem('pos_user', JSON.stringify(loggedInUser));
        return true;
      }
      return false;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        console.warn('Authentication rejected: invalid credentials');
      } else {
        console.error('Login error:', err);
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      // Ignore logout errors
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
    }
  };

  const hasRole = (allowedRoles: RoleType[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
