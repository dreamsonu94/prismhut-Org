/**
 * Menu & Category Service
 */
import { apiClient } from '../api/client';
import { MenuCategory, MenuItem } from '../types';
import { extractArray } from '../utils/normalize';

export const menuService = {
  async getCategories(): Promise<MenuCategory[]> {
    const res = await apiClient<any>('/menu/categories', {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      return [];
    }

    return extractArray<MenuCategory>(res.data, 'categories');
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

    if (!res.success || !res.data) {
      return [];
    }

    const items = extractArray<any>(res.data, 'items');

    return items.map((item: any): MenuItem => ({
      id: item?.id || String(Math.random()),
      name: item?.name || 'Unnamed Item',
      description: item?.description,
      price: Number(item?.price || 0),
      costPrice: item?.costPrice ? Number(item.costPrice) : undefined,
      taxRate: Number(item?.taxRate ?? item?.taxPercent ?? 10),
      preparationTime: Number(item?.preparationTime || 15),
      isAvailable: item?.isAvailable !== false,
      isVeg: Boolean(item?.isVeg || item?.isVegetarian),
      imageUrl: item?.imageUrl || null,
      department: item?.department || 'KITCHEN',
      categoryId: item?.categoryId || '',
      category: item?.category,
    }));
  },
};
