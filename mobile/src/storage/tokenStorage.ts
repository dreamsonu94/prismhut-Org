/**
 * Secure Token Storage for Waiter Mobile Application
 * Supports React Native, Expo, and Web environments safely.
 */
import { APP_CONFIG } from '../constants/config';
import { User } from '../types';

class MemoryStorage {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // Fallback to memory
      }
    }
    return this.store.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(APP_CONFIG.tokenStorageKey);
        window.localStorage.removeItem(APP_CONFIG.userStorageKey);
      } catch (e) {}
    }
    this.store.clear();
  }
}

const storage = new MemoryStorage();

export const tokenStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await storage.getItem(APP_CONFIG.tokenStorageKey);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await storage.setItem(APP_CONFIG.tokenStorageKey, token);
    } catch (e) {
      console.error('Failed to store auth token', e);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await storage.removeItem(APP_CONFIG.tokenStorageKey);
    } catch (e) {
      console.error('Failed to remove auth token', e);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const data = await storage.getItem(APP_CONFIG.userStorageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      await storage.setItem(APP_CONFIG.userStorageKey, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to store user profile', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await storage.clear();
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  },
};
