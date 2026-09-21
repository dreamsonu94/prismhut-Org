/**
 * Invoice & Billing View Service
 */
import { apiClient } from '../api/client';
import { Invoice } from '../types';
import { extractArray } from '../utils/normalize';

export const invoiceService = {
  async getInvoices(params?: { date?: string; search?: string }): Promise<Invoice[]> {
    const res = await apiClient<any>('/invoices', {
      method: 'GET',
      params,
    });

    if (!res.success || !res.data) {
      return [];
    }

    const invoices = extractArray<any>(res.data, 'invoices');

    return invoices.map((inv: any): Invoice => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber || '',
      orderId: inv.orderId || '',
      subtotal: Number(inv.subtotal || 0),
      taxAmount: Number(inv.taxAmount ?? inv.tax ?? 0),
      discountAmount: Number(inv.discountAmount ?? inv.discount ?? 0),
      serviceCharge: Number(inv.serviceCharge || 0),
      grandTotal: Number(inv.grandTotal ?? inv.totalAmount ?? 0),
      createdAt: inv.createdAt || new Date().toISOString(),
      customerName: inv.customerName || inv.order?.customer?.name,
      tableName: inv.tableName || inv.order?.table?.tableName || inv.order?.table?.tableNumber,
      waiterName: inv.waiterName || inv.order?.waiter?.name,
    }));
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const res = await apiClient<any>(`/invoices/${id}`, {
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to fetch invoice details');
    }

    const inv = res.data?.data || res.data;
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber || '',
      orderId: inv.orderId || '',
      subtotal: Number(inv.subtotal || 0),
      taxAmount: Number(inv.taxAmount ?? inv.tax ?? 0),
      discountAmount: Number(inv.discountAmount ?? inv.discount ?? 0),
      serviceCharge: Number(inv.serviceCharge || 0),
      grandTotal: Number(inv.grandTotal ?? inv.totalAmount ?? 0),
      createdAt: inv.createdAt || new Date().toISOString(),
      customerName: inv.customerName || inv.order?.customer?.name,
      tableName: inv.tableName || inv.order?.table?.tableName || inv.order?.table?.tableNumber,
      waiterName: inv.waiterName || inv.order?.waiter?.name,
    };
  },
};
