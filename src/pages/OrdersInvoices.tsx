import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Order, Invoice } from '../types/index.js';
import { ReceiptModal } from '../components/ReceiptModal.js';
import {
  FileText,
  Search,
  Printer,
  ChevronRight,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';

export const OrdersInvoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'INVOICES'>('ORDERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch all orders
  const { data: orders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data?.data as Order[];
    },
  });

  // Fetch all invoices
  const { data: invoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/invoices');
      return res.data?.data as Invoice[];
    },
  });

  const filteredOrders = (orders || []).filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.table && o.table.tableName.toLowerCase().includes(q)) ||
      (o.waiter && o.waiter.name.toLowerCase().includes(q))
    );
  });

  const filteredInvoices = (invoices || []).filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.tableName.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders & Invoices</h1>
          <p className="text-xs text-gray-500 mt-0.5">Historical records, thermal receipts & audit trail</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="bg-gray-200/70 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'ORDERS' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Floor Orders ({orders?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'INVOICES' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Tax Invoices ({invoices?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'ORDERS' ? 'Search order #, table, server...' : 'Search invoice #, customer...'}
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {activeTab === 'ORDERS' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Type / Table</th>
                  <th className="px-4 py-3">Server</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Tickets (KOT/BOT)</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isOrdersLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{ord.orderNumber}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {ord.table ? `${ord.table.tableNumber} - ${ord.table.tableName}` : 'Takeaway'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ord.waiter?.name || 'Staff'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {ord.items.map((i) => `${i.quantity}x ${i.menuItem?.name}`).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ord.kots?.map((k) => (
                            <span key={k.id} className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.2 rounded">
                              {k.kotNumber} ({k.status})
                            </span>
                          ))}
                          {ord.bots?.map((b) => (
                            <span key={b.id} className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.2 rounded">
                              {b.botNumber} ({b.status})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-extrabold text-gray-900">${ord.grandTotal.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          ord.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(ord.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Table / Customer</th>
                  <th className="px-4 py-3">Cashier / Waiter</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Grand Total</th>
                  <th className="px-4 py-3 text-right">Receipt Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isInvoicesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Loading invoices...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No invoices recorded yet
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(inv.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{inv.tableName}</div>
                        <div className="text-[11px] text-gray-500">{inv.customerName}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{inv.waiterName}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{inv.paymentMethod}</td>
                      <td className="px-4 py-3 font-black text-gray-900">${inv.grandTotal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Print 80mm Thermal Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>80mm</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Thermal Receipt Preview Modal */}
      <ReceiptModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
};
