/**
 * Safe array and data normalization utilities for Mobile Client
 * Ensures that API responses, Socket.IO event payloads, and cached data
 * are always transformed into strictly typed, non-null, non-undefined arrays.
 */
import { Table, TableStatus, Order, MenuItem, MenuCategory, TableSection, Invoice } from '../types';

export function extractArray<T = any>(input: unknown, preferredKey?: string): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as T[];

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, any>;

    // 1. Check preferred key on top level
    if (preferredKey && Array.isArray(obj[preferredKey])) {
      return obj[preferredKey] as T[];
    }

    // 2. Check obj.data
    if (Array.isArray(obj.data)) {
      return obj.data as T[];
    }
    if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
      if (preferredKey && Array.isArray(obj.data[preferredKey])) {
        return obj.data[preferredKey] as T[];
      }
      if (Array.isArray(obj.data.tables)) return obj.data.tables as T[];
      if (Array.isArray(obj.data.orders)) return obj.data.orders as T[];
      if (Array.isArray(obj.data.items)) return obj.data.items as T[];
      if (Array.isArray(obj.data.categories)) return obj.data.categories as T[];
      if (Array.isArray(obj.data.sections)) return obj.data.sections as T[];
      if (Array.isArray(obj.data.invoices)) return obj.data.invoices as T[];
      if (Array.isArray(obj.data.data)) return obj.data.data as T[];
    }

    // 3. Check common known top-level keys
    if (Array.isArray(obj.tables)) return obj.tables as T[];
    if (Array.isArray(obj.orders)) return obj.orders as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.categories)) return obj.categories as T[];
    if (Array.isArray(obj.sections)) return obj.sections as T[];
    if (Array.isArray(obj.invoices)) return obj.invoices as T[];
  }

  return [];
}

/**
 * Robust Table Normalizer
 * Guaranteed to return an array of Table objects under any response shape, null, undefined, or error.
 */
export function normalizeTables(input: unknown): Table[] {
  console.log('[TABLES API RAW]', input);
  const rawList = extractArray<any>(input, 'tables');

  const normalized: Table[] = rawList.map((t: any, index: number): Table => {
    if (!t || typeof t !== 'object') {
      return {
        id: `table-fallback-${index}`,
        tableNumber: String(index + 1),
        tableName: `Table ${index + 1}`,
        capacity: 4,
        status: 'AVAILABLE' as TableStatus,
        sectionId: null,
        section: null,
        activeOrder: null,
      };
    }

    const tableId = t.id || `table-${index}`;
    const tableNum = String(t.tableNumber || t.tableName || index + 1);
    const tableName = t.tableName || (t.tableNumber ? `Table ${t.tableNumber}` : `Table ${index + 1}`);
    const capacity = Number(t.capacity) > 0 ? Number(t.capacity) : 4;
    const status: TableStatus = t.status || 'AVAILABLE';

    let section = null;
    if (t.section && typeof t.section === 'object') {
      section = {
        id: t.section.id || '',
        name: t.section.name || 'Main Area',
        description: t.section.description || '',
      };
    }

    let activeOrder = null;
    if (t.activeOrder && typeof t.activeOrder === 'object') {
      activeOrder = {
        id: t.activeOrder.id || '',
        orderNumber: t.activeOrder.orderNumber || '',
        waiterName: t.activeOrder.waiterName || t.activeOrder.waiter?.name || 'Staff',
        guestCount: Number(t.activeOrder.guestCount || 1),
        totalAmount: Number(t.activeOrder.totalAmount ?? t.activeOrder.grandTotal ?? 0),
        grandTotal: Number(t.activeOrder.grandTotal ?? t.activeOrder.totalAmount ?? 0),
        status: t.activeOrder.status || 'DRAFT',
        kots: Array.isArray(t.activeOrder.kots) ? t.activeOrder.kots : [],
        bots: Array.isArray(t.activeOrder.bots) ? t.activeOrder.bots : [],
        createdAt: t.activeOrder.createdAt || new Date().toISOString(),
      };
    }

    return {
      id: tableId,
      tableNumber: tableNum,
      tableName: tableName,
      capacity: capacity,
      status: status,
      sectionId: t.sectionId || t.section?.id || null,
      section: section,
      activeOrder: activeOrder,
    };
  });

  console.log('[TABLES NORMALIZED]', normalized);
  return normalized;
}

/**
 * Robust Order Normalizer
 */
export function normalizeOrders(input: unknown): Order[] {
  const rawList = extractArray<any>(input, 'orders');

  return rawList.map((o: any, index: number): Order => {
    if (!o || typeof o !== 'object') {
      return {
        id: `order-fallback-${index}`,
        orderNumber: `ORD-${index + 1}`,
        status: 'DRAFT',
        orderType: 'DINE_IN',
        guestCount: 1,
        totalAmount: 0,
        grandTotal: 0,
        subtotal: 0,
        taxAmount: 0,
        tax: 0,
        discountAmount: 0,
        discount: 0,
        serviceCharge: 0,
        items: [],
        kots: [],
        bots: [],
        invoices: [],
        payments: [],
        createdAt: new Date().toISOString(),
      };
    }

    return {
      ...o,
      id: o.id || `order-${index}`,
      orderNumber: o.orderNumber || `ORD-${index + 1}`,
      status: o.status || 'DRAFT',
      orderType: o.orderType || 'DINE_IN',
      guestCount: Number(o.guestCount ?? 1),
      items: Array.isArray(o.items) ? o.items : [],
      kots: Array.isArray(o.kots) ? o.kots : [],
      bots: Array.isArray(o.bots) ? o.bots : [],
      invoices: Array.isArray(o.invoices) ? o.invoices : [],
      payments: Array.isArray(o.payments) ? o.payments : [],
      totalAmount: Number(o.totalAmount ?? o.grandTotal ?? 0),
      grandTotal: Number(o.grandTotal ?? o.totalAmount ?? 0),
      taxAmount: Number(o.taxAmount ?? o.tax ?? 0),
      tax: Number(o.tax ?? o.taxAmount ?? 0),
      discountAmount: Number(o.discountAmount ?? o.discount ?? 0),
      discount: Number(o.discount ?? o.discountAmount ?? 0),
      subtotal: Number(o.subtotal ?? 0),
      serviceCharge: Number(o.serviceCharge ?? 0),
      createdAt: o.createdAt || new Date().toISOString(),
    };
  });
}

/**
 * Robust Category Normalizer
 */
export function normalizeCategories(input: unknown): MenuCategory[] {
  const rawList = extractArray<any>(input, 'categories');

  return rawList.map((c: any, index: number): MenuCategory => {
    if (!c || typeof c !== 'object') {
      return {
        id: `cat-fallback-${index}`,
        name: 'General',
        description: '',
        sortOrder: index,
        _count: { items: 0 },
      };
    }

    return {
      id: c.id || `cat-${index}`,
      name: c.name || 'General',
      description: c.description || '',
      sortOrder: Number(c.sortOrder ?? index),
      _count: c._count ? { items: Number(c._count.items || 0) } : undefined,
    };
  });
}

/**
 * Robust Menu Item Normalizer
 */
export function normalizeMenuItems(input: unknown): MenuItem[] {
  const rawList = extractArray<any>(input, 'items');

  return rawList.map((item: any, index: number): MenuItem => {
    if (!item || typeof item !== 'object') {
      return {
        id: `item-fallback-${index}`,
        name: 'Menu Item',
        description: '',
        price: 0,
        taxRate: 10,
        preparationTime: 15,
        isAvailable: true,
        isVeg: false,
        imageUrl: null,
        department: 'KITCHEN',
        categoryId: '',
      };
    }

    return {
      id: item.id || `item-${index}`,
      name: item.name || 'Menu Item',
      description: item.description || '',
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
    };
  });
}

