/**
 * Table & Floor Management Service
 */
import { apiClient } from '../api/client';
import { Table, TableStatus } from '../types';

export const tableService = {
  async getTables(): Promise<Table[]> {
    const res = await apiClient<any>('/tables', {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch restaurant tables');
    }

    // Backend returns { success: true, data: { tables: [...], sections: [...] } } or direct array
    let rawTables: any[] = [];
    if (Array.isArray(res.data)) {
      rawTables = res.data;
    } else if (res.data && Array.isArray(res.data.tables)) {
      rawTables = res.data.tables;
    } else if (res.data && Array.isArray(res.data.data)) {
      rawTables = res.data.data;
    } else if (res.data?.data && Array.isArray(res.data.data.tables)) {
      rawTables = res.data.data.tables;
    }

    return rawTables.map((t: any): Table => ({
      id: t.id,
      tableNumber: t.tableNumber || t.tableName || '',
      tableName: t.tableName || (t.tableNumber ? `Table ${t.tableNumber}` : 'Table'),
      capacity: Number(t.capacity || 4),
      status: t.status || 'AVAILABLE',
      sectionId: t.sectionId || t.section?.id || null,
      section: t.section
        ? {
            id: t.section.id,
            name: t.section.name,
            description: t.section.description,
          }
        : null,
      activeOrder: t.activeOrder
        ? {
            id: t.activeOrder.id,
            orderNumber: t.activeOrder.orderNumber || '',
            waiterName: t.activeOrder.waiterName || t.activeOrder.waiter?.name || 'Staff',
            guestCount: Number(t.activeOrder.guestCount || 1),
            totalAmount: Number(t.activeOrder.totalAmount ?? t.activeOrder.grandTotal ?? 0),
            grandTotal: Number(t.activeOrder.grandTotal ?? t.activeOrder.totalAmount ?? 0),
            status: t.activeOrder.status || 'DRAFT',
            kots: Array.isArray(t.activeOrder.kots) ? t.activeOrder.kots : [],
            bots: Array.isArray(t.activeOrder.bots) ? t.activeOrder.bots : [],
            createdAt: t.activeOrder.createdAt,
          }
        : null,
    }));
  },

  async getTablesWithSections(): Promise<{ tables: Table[]; sections: any[] }> {
    const res = await apiClient<any>('/tables', {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch restaurant tables');
    }

    let rawTables: any[] = [];
    let rawSections: any[] = [];

    if (Array.isArray(res.data)) {
      rawTables = res.data;
    } else if (res.data && typeof res.data === 'object') {
      rawTables = Array.isArray(res.data.tables) ? res.data.tables : [];
      rawSections = Array.isArray(res.data.sections) ? res.data.sections : [];
    }

    const tables: Table[] = rawTables.map((t: any): Table => ({
      id: t.id,
      tableNumber: t.tableNumber || t.tableName || '',
      tableName: t.tableName || (t.tableNumber ? `Table ${t.tableNumber}` : 'Table'),
      capacity: Number(t.capacity || 4),
      status: t.status || 'AVAILABLE',
      sectionId: t.sectionId || t.section?.id || null,
      section: t.section
        ? {
            id: t.section.id,
            name: t.section.name,
            description: t.section.description,
          }
        : null,
      activeOrder: t.activeOrder
        ? {
            id: t.activeOrder.id,
            orderNumber: t.activeOrder.orderNumber || '',
            waiterName: t.activeOrder.waiterName || t.activeOrder.waiter?.name || 'Staff',
            guestCount: Number(t.activeOrder.guestCount || 1),
            totalAmount: Number(t.activeOrder.totalAmount ?? t.activeOrder.grandTotal ?? 0),
            grandTotal: Number(t.activeOrder.grandTotal ?? t.activeOrder.totalAmount ?? 0),
            status: t.activeOrder.status || 'DRAFT',
            kots: Array.isArray(t.activeOrder.kots) ? t.activeOrder.kots : [],
            bots: Array.isArray(t.activeOrder.bots) ? t.activeOrder.bots : [],
            createdAt: t.activeOrder.createdAt,
          }
        : null,
    }));

    return { tables, sections: rawSections };
  },

  async getTableById(id: string): Promise<Table> {
    const res = await apiClient<any>(`/tables/${id}`, {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch table details');
    }

    const t = res.data?.data || res.data;
    return {
      id: t.id,
      tableNumber: t.tableNumber || t.tableName || '',
      tableName: t.tableName || (t.tableNumber ? `Table ${t.tableNumber}` : 'Table'),
      capacity: Number(t.capacity || 4),
      status: t.status || 'AVAILABLE',
      sectionId: t.sectionId || t.section?.id || null,
      section: t.section
        ? {
            id: t.section.id,
            name: t.section.name,
            description: t.section.description,
          }
        : null,
      activeOrder: t.activeOrder
        ? {
            id: t.activeOrder.id,
            orderNumber: t.activeOrder.orderNumber || '',
            waiterName: t.activeOrder.waiterName || t.activeOrder.waiter?.name || 'Staff',
            guestCount: Number(t.activeOrder.guestCount || 1),
            totalAmount: Number(t.activeOrder.totalAmount ?? t.activeOrder.grandTotal ?? 0),
            grandTotal: Number(t.activeOrder.grandTotal ?? t.activeOrder.totalAmount ?? 0),
            status: t.activeOrder.status || 'DRAFT',
            kots: Array.isArray(t.activeOrder.kots) ? t.activeOrder.kots : [],
            bots: Array.isArray(t.activeOrder.bots) ? t.activeOrder.bots : [],
            createdAt: t.activeOrder.createdAt,
          }
        : null,
    };
  },

  async updateTableStatus(id: string, status: TableStatus): Promise<Table> {
    const res = await apiClient<any>(`/tables/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to update table status');
    }

    const t = res.data?.data || res.data;
    return {
      id: t.id,
      tableNumber: t.tableNumber || t.tableName || '',
      tableName: t.tableName || (t.tableNumber ? `Table ${t.tableNumber}` : 'Table'),
      capacity: Number(t.capacity || 4),
      status: t.status || status,
      sectionId: t.sectionId || t.section?.id || null,
      section: t.section
        ? {
            id: t.section.id,
            name: t.section.name,
            description: t.section.description,
          }
        : null,
      activeOrder: t.activeOrder
        ? {
            id: t.activeOrder.id,
            orderNumber: t.activeOrder.orderNumber || '',
            waiterName: t.activeOrder.waiterName || t.activeOrder.waiter?.name || 'Staff',
            guestCount: Number(t.activeOrder.guestCount || 1),
            totalAmount: Number(t.activeOrder.totalAmount ?? t.activeOrder.grandTotal ?? 0),
            grandTotal: Number(t.activeOrder.grandTotal ?? t.activeOrder.totalAmount ?? 0),
            status: t.activeOrder.status || 'DRAFT',
            kots: Array.isArray(t.activeOrder.kots) ? t.activeOrder.kots : [],
            bots: Array.isArray(t.activeOrder.bots) ? t.activeOrder.bots : [],
            createdAt: t.activeOrder.createdAt,
          }
        : null,
    };
  },
};
