/**
 * Table & Floor Management Service
 */
import { apiClient } from '../api/client';
import { Table, TableStatus } from '../types';
import { normalizeTables, extractArray } from '../utils/normalize';

export const tableService = {
  async getTables(): Promise<Table[]> {
    const res = await apiClient<any>('/tables', {
      method: 'GET',
    });

    console.log(
      '[Dashboard] RAW TABLES RESPONSE:',
      JSON.stringify(res, null, 2)
    );

    if (!res.success || !res.data) {
      console.warn('[Dashboard] Fetch tables returned unsuccessful response:', res);
      return [];
    }

    return normalizeTables(res);
  },

  async getTablesWithSections(): Promise<{ tables: Table[]; sections: any[] }> {
    const res = await apiClient<any>('/tables', {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      return { tables: [], sections: [] };
    }

    const tables = normalizeTables(res);
    const rawSections = extractArray<any>(res.data, 'sections');

    return { tables, sections: rawSections };
  },

  async getTableById(id: string): Promise<Table> {
    const res = await apiClient<any>(`/tables/${id}`, {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch table details');
    }

    const raw = (res.data as any)?.data || res.data;
    const normalized = normalizeTables([raw]);
    return normalized[0];
  },

  async updateTableStatus(id: string, status: TableStatus): Promise<Table> {
    const res = await apiClient<any>(`/tables/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to update table status');
    }

    const raw = (res.data as any)?.data || res.data;
    const normalized = normalizeTables([raw]);
    return normalized[0];
  },
};
