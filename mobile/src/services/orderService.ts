/**
 * Order & KOT Service
 * Implements strict Idempotency Key protection to eliminate duplicate tickets.
 */
import { apiClient } from '../api/client';
import { Order, OrderStatus, OrderType } from '../types';
import { normalizeOrders, extractArray } from '../utils/normalize';

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  tableId?: string;
  customerId?: string;
  guestCount?: number;
  orderType?: OrderType;
  items: CreateOrderItemInput[];
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateOrderResponse {
  order: Order;
  isDuplicate?: boolean;
}

// Generates a robust UUIDv4 for mobile idempotency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const orderService = {
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
    const idempotencyKey = input.idempotencyKey || `waiter-${Date.now()}-${generateUUID()}`;

    const res = await apiClient<CreateOrderResponse>('/orders', {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({
        ...input,
        idempotencyKey,
        orderType: input.orderType || 'DINE_IN',
        guestCount: input.guestCount || 1,
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to submit order');
    }

    const rawOrder = (res.data as any)?.order || res.data;
    const normalizedOrders = normalizeOrders([rawOrder]);

    return {
      order: normalizedOrders[0],
      isDuplicate: (res.data as any)?.isDuplicate || false,
    };
  },

  async addItemsToOrder(orderId: string, items: CreateOrderItemInput[]): Promise<Order> {
    const idempotencyKey = `waiter-add-${orderId}-${Date.now()}-${generateUUID()}`;

    const res = await apiClient<Order>(`/orders/${orderId}/items`, {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({ items }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to append items to order');
    }

    const rawOrder = (res.data as any)?.order || res.data;
    const normalizedOrders = normalizeOrders([rawOrder]);
    return normalizedOrders[0];
  },

  async getOrders(params?: {
    status?: OrderStatus;
    tableId?: string;
    date?: string;
    search?: string;
  }): Promise<Order[]> {
    const res = await apiClient<any>('/orders', {
      method: 'GET',
      params,
    });

    if (!res.success || !res.data) {
      console.warn('[Dashboard] Fetch orders returned unsuccessful response:', res);
      return [];
    }

    return normalizeOrders(res);
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await apiClient<any>(`/orders/${id}`, {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch order details');
    }

    const raw = (res.data as any)?.data || res.data;
    const normalized = normalizeOrders([raw]);
    return normalized[0];
  },

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const res = await apiClient<Order>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Cancelled by Waiter' }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to cancel order');
    }

    return res.data;
  },
};
