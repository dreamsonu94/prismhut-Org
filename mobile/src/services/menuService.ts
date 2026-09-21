/**
 * Menu & Category Service
 */
import { apiClient } from '../api/client';
import { MenuCategory, MenuItem } from '../types';

export const menuService = {
  async getCategories(): Promise<MenuCategory[]> {
    const res = await apiClient<any>('/menu/categories', {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch menu categories');
    }

    let categories: any[] = [];
    if (Array.isArray(res.data)) {
      categories = res.data;
    } else if (res.data && Array.isArray(res.data.categories)) {
      categories = res.data.categories;
    } else if (res.data && Array.isArray(res.data.data)) {
      categories = res.data.data;
    }

    return categories;
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
      throw new Error(res.error?.message || 'Failed to fetch menu items');
    }

    let items: any[] = [];
    if (Array.isArray(res.data)) {
      items = res.data;
    } else if (res.data && Array.isArray(res.data.items)) {
      items = res.data.items;
    } else if (res.data && Array.isArray(res.data.data)) {
      items = res.data.data;
    }

    return items.map((item: any): MenuItem => ({
      id: item.id,
      name: item.name || 'Unnamed Item',
      description: item.description,
      price: Number(item.price || 0),
      costPrice: item.costPrice ? Number(item.costPrice) : undefined,
      taxRate: Number(item.taxRate ?? item.taxPercent ?? 10),
      preparationTime: Number(item.preparationTime || 15),
      isAvailable: item.isAvailable !== false,
      isVeg: Boolean(item.isVeg || item.isVegetarian),
      imageUrl: item.imageUrl || null,
      department: item.department || 'KITCHEN',
      categoryId: item.categoryId || '',
      category: item.category,
    }));
  },
};
