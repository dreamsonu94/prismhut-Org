/**
 * Order & KOT Service
 * Implements strict Idempotency Key protection to eliminate duplicate tickets.
 */
import { apiClient } from '../api/client';
import { Order, OrderStatus, OrderType } from '../types';

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

    return res.data;
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

    return res.data;
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
      throw new Error(res.error?.message || 'Failed to fetch orders');
    }

    let ordersList: any[] = [];
    if (Array.isArray(res.data)) {
      ordersList = res.data;
    } else if (res.data && Array.isArray(res.data.orders)) {
      ordersList = res.data.orders;
    } else if (res.data && Array.isArray(res.data.data)) {
      ordersList = res.data.data;
    }

    return ordersList.map((o: any): Order => ({
      ...o,
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
      guestCount: Number(o.guestCount ?? 1),
    }));
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await apiClient<any>(`/orders/${id}`, {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch order details');
    }

    const o = res.data?.data || res.data;
    return {
      ...o,
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
      guestCount: Number(o.guestCount ?? 1),
    };
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
