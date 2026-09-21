/**
 * Authentication Service for Waiter App
 */
import { apiClient } from '../api/client';
import { tokenStorage } from '../storage/tokenStorage';
import { User, Restaurant } from '../types';

export interface LoginResponse {
  user: User & { restaurant?: Restaurant };
  token: string;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Invalid username or password');
    }

    const { user, token } = res.data;

    // Verify role permissions - only WAITER, MANAGER, ADMIN, SUPER_ADMIN can operate waiter mobile
    const allowedRoles = ['WAITER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      throw new Error(`Access restricted: User role ${user.role} is not authorized for the Waiter App.`);
    }

    await tokenStorage.setToken(token);
    await tokenStorage.setUser(user);

    return res.data;
  },

  async getProfile(): Promise<User> {
    const res = await apiClient<User>('/auth/me', {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch user profile');
    }

    await tokenStorage.setUser(res.data);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network failure on logout
    } finally {
      await tokenStorage.clearAll();
    }
  },
};
