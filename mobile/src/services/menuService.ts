/**
 * Menu & Category Service
 */
import { apiClient } from '../api/client';
import { MenuCategory, MenuItem } from '../types';
import { normalizeCategories, normalizeMenuItems } from '../utils/normalize';

export const menuService = {
  async getCategories(): Promise<MenuCategory[]> {
    const res = await apiClient<any>('/menu/categories', {
      method: 'GET',
    });

    return normalizeCategories(res);
  },

  async getMenuItems(params?: {
    categoryId?: string;
    department?: 'KITCHEN' | 'BAR';
    available?: boolean;
    search?: string;
  }): Promise<MenuItem[]> {
    const res = await apiClient<any>('/menu/items', {
      method: 'GET',
      params,
    });

    return normalizeMenuItems(res);
  },
};
