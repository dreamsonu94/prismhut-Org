import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Order, Invoice } from '../types/index.js';
import { ReceiptModal } from '../components/ReceiptModal.js';
import {
  FileText,
  Search,
  Printer,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Calendar,
  Filter,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  Download,
  X,
  RefreshCw,
  Utensils,
  ChevronRight,
} from 'lucide-react';

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export const OrdersInvoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'ORDERS'>('INVOICES');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Compute date range boundary timestamps based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'YESTERDAY') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // start on Monday
      const start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'CUSTOM') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
    }
    return null;
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch all orders
  const {
    data: orders,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders', datePreset, customStartDate, customEndDate],
    queryFn: async () => {
      const params: any = {};
      if (dateRange) {
        params.startDate = dateRange.start.toISOString();
        params.endDate = dateRange.end.toISOString();
      }
      const res = await api.get('/orders', { params });
      return (res.data?.data || []) as Order[];
    },
  });

  // Fetch all invoices
  const {
    data: invoices,
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['invoices', datePreset, customStartDate, customEndDate],
    queryFn: async () => {
      const params: any = {};
      if (dateRange) {
        params.startDate = dateRange.start.toISOString();
        params.endDate = dateRange.end.toISOString();
      }
      const res = await api.get('/invoices', { params });
      return (res.data?.data || []) as Invoice[];
    },
  });

  // Filter invoices client-side for immediate responsive search and date refinement
  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
      // Date filter check
      if (dateRange) {
        const invTime = new Date(inv.createdAt).getTime();
        if (invTime < dateRange.start.getTime() || invTime > dateRange.end.getTime()) {
          return false;
        }
      }

      // Search query check: order number, invoice number, table, customer, server/cashier
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchInvoiceNo = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchOrderNo = inv.order?.orderNumber?.toLowerCase().includes(q);
      const matchTable = inv.tableName?.toLowerCase().includes(q);
      const matchCustomer = inv.customerName?.toLowerCase().includes(q);
      const matchWaiter = inv.waiterName?.toLowerCase().includes(q);
      const matchMethod = inv.paymentMethod?.toLowerCase().includes(q);

      return (
        matchInvoiceNo ||
        matchOrderNo ||
        matchTable ||
        matchCustomer ||
        matchWaiter ||
        matchMethod
      );
    });
  }, [invoices, searchQuery, dateRange]);

  // Filter floor orders client-side
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      // Date filter check
      if (dateRange) {
        const ordTime = new Date(o.createdAt).getTime();
        if (ordTime < dateRange.start.getTime() || ordTime > dateRange.end.getTime()) {
          return false;
        }
      }

      // Search query check: order number, invoice number, table, customer, server
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchOrderNo = o.orderNumber?.toLowerCase().includes(q);
      const matchTable =
        o.table?.tableName?.toLowerCase().includes(q) ||
        o.table?.tableNumber?.toLowerCase().includes(q);
      const matchWaiter = o.waiter?.name?.toLowerCase().includes(q);
      const matchCustomer = o.customer?.name?.toLowerCase().includes(q);
      const matchInvoiceNo = o.invoices?.some((inv) =>
        inv.invoiceNumber?.toLowerCase().includes(q)
      );

      return (
        matchOrderNo ||
        matchTable ||
        matchWaiter ||
        matchCustomer ||
        Boolean(matchInvoiceNo)
      );
    });
  }, [orders, searchQuery, dateRange]);

  // View existing invoice for an order without creating anything
  const handleViewOrderInvoice = (order: Order) => {
    // Check if order has invoices attached directly
    if (order.invoices && order.invoices.length > 0) {
      const inv = order.invoices[0];
      // Attach order reference if missing
      const fullInvoice: Invoice = {
        ...inv,
        order: {
          ...order,
          payments: order.payments,
        },
      };
      setSelectedInvoice(fullInvoice);
      return;
    }

    // Otherwise find in invoices list
    const found = invoices?.find((inv) => inv.orderId === order.id);
    if (found) {
      setSelectedInvoice(found);
    } else {
      setSelectedOrderDetails(order);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
      case 'CARD':
        return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
      case 'QR':
      case 'UPI':
        return <QrCode className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <DollarSign className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-orange-600" />
            <span>Orders & Receipts</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Historical settlement records, verified PostgreSQL invoices & 80mm thermal receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchOrders();
              refetchInvoices();
            }}
            className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Refresh records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Tab Switcher */}
          <div className="bg-gray-200/70 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'INVOICES' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Settled Invoices ({filteredInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'ORDERS' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Floor Orders ({filteredOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar: Search & Date Ranges */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, invoice #, table, customer, server..."
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1 hidden sm:block" />
            {(
              [
                { id: 'ALL', label: 'All Time' },
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'THIS_WEEK', label: 'This Week' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'CUSTOM', label: 'Custom' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {datePreset === 'CUSTOM' && (
          <div className="pt-2 border-t border-gray-100 flex items-center gap-3 flex-wrap text-xs">
            <span className="text-gray-500 font-medium">Date Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-gray-400">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-400">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-orange-600 hover:underline text-xs"
              >
                Reset Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {activeTab === 'INVOICES' ? (
          /* ============================================================ */
          /* SETTLED INVOICES TAB                                         */
          /* ============================================================ */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Invoice & Order</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Table / Guest</th>
                  <th className="px-4 py-3">Server / Cashier</th>
                  <th className="px-4 py-3">Items Summary</th>
                  <th className="px-4 py-3">Subtotal / Tax</th>
                  <th className="px-4 py-3">Grand Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isInvoicesLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      Loading settled invoices from PostgreSQL...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText className="w-8 h-8 text-gray-300" />
                        <p className="text-gray-500 font-medium">No settled invoices match your criteria</p>
                        <p className="text-[11px] text-gray-400">
                          Try adjusting your search terms or date range filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const paidAmt =
                      inv.order?.payments && inv.order.payments.length > 0
                        ? inv.order.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
                        : inv.grandTotal;

                    const itemsList = inv.order?.items || [];
                    const itemsSummary =
                      itemsList.length > 0
                        ? itemsList.map((i) => `${i.quantity}x ${i.menuItem?.name}`).join(', ')
                        : 'Settled Order';

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Invoice & Order Number */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-gray-900 text-xs flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span>{inv.invoiceNumber}</span>
                          </div>
                          {inv.order?.orderNumber && (
                            <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                              {inv.order.orderNumber}
                            </div>
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <div>
                            {new Date(inv.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {new Date(inv.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Table / Guest */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{inv.tableName || 'Dine-In'}</div>
                          <div className="text-[11px] text-gray-500">{inv.customerName || 'Guest'}</div>
                        </td>

                        {/* Server / Cashier */}
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {inv.waiterName || 'Staff'}
                        </td>

                        {/* Items Summary */}
                        <td className="px-4 py-3 max-w-[220px]">
                          <div
                            className="text-gray-600 truncate text-[11px]"
                            title={itemsSummary}
                          >
                            {itemsSummary}
                          </div>
                          {itemsList.length > 0 && (
                            <div className="text-[10px] text-gray-400">
                              {itemsList.length} item{itemsList.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>

                        {/* Subtotal / Tax */}
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-[11px]">
                          <div>Sub: ${inv.subtotal.toFixed(2)}</div>
                          <div className="text-gray-400">
                            Tax: ${inv.tax.toFixed(2)}
                            {inv.serviceCharge > 0 && ` | Svc: $${inv.serviceCharge.toFixed(2)}`}
                          </div>
                        </td>

                        {/* Grand Total */}
                        <td className="px-4 py-3 font-extrabold text-gray-900 text-sm whitespace-nowrap">
                          ${inv.grandTotal.toFixed(2)}
                        </td>

                        {/* Payment Method & Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {getMethodIcon(inv.paymentMethod)}
                            <span className="font-semibold text-gray-800">{inv.paymentMethod}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {inv.paidStatus}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              ${paidAmt.toFixed(2)}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="View Invoice & Receipt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                              title="Print 80mm Thermal Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>80mm</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ============================================================ */
          /* FLOOR ORDERS TAB                                             */
          /* ============================================================ */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Type / Table</th>
                  <th className="px-4 py-3">Server</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Grand Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isOrdersLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      Loading floor orders from PostgreSQL...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const linkedInvoice =
                      ord.invoices && ord.invoices.length > 0
                        ? ord.invoices[0]
                        : invoices?.find((i) => i.orderId === ord.id);

                    return (
                      <tr
                        key={ord.id}
                        className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                        onClick={() => handleViewOrderInvoice(ord)}
                      >
                        {/* Order Number */}
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">
                          {ord.orderNumber}
                        </td>

                        {/* Invoice Number */}
                        <td className="px-4 py-3">
                          {linkedInvoice ? (
                            <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                              {linkedInvoice.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px] italic">Not settled</span>
                          )}
                        </td>

                        {/* Type / Table */}
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {ord.table ? `${ord.table.tableNumber} - ${ord.table.tableName}` : 'Takeaway'}
                        </td>

                        {/* Server */}
                        <td className="px-4 py-3 text-gray-600">{ord.waiter?.name || 'Staff'}</td>

                        {/* Items */}
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                          {ord.items.map((i) => `${i.quantity}x ${i.menuItem?.name}`).join(', ')}
                        </td>

                        {/* Grand Total */}
                        <td className="px-4 py-3 font-extrabold text-gray-900">
                          ${ord.grandTotal.toFixed(2)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              ord.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status === 'COMPLETED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {ord.status}
                          </span>
                        </td>

                        {/* Created At */}
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(ord.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {linkedInvoice ? (
                            <button
                              onClick={() => setSelectedInvoice(linkedInvoice)}
                              className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                              title="View Verified Receipt"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedOrderDetails(ord)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Details</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal (for viewing full itemized breakdown) */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Order Details — {selectedOrderDetails.orderNumber}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Retrieved from PostgreSQL record
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400">Table:</span>
                  <div className="font-semibold text-gray-800">
                    {selectedOrderDetails.table?.tableName || 'Takeaway'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Server:</span>
                  <div className="font-semibold text-gray-800">
                    {selectedOrderDetails.waiter?.name || 'Staff'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {selectedOrderDetails.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <div className="text-gray-700">
                    {new Date(selectedOrderDetails.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Ordered Items</h4>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {selectedOrderDetails.items.map((item) => (
                    <div key={item.id} className="p-2.5 flex justify-between items-center bg-white">
                      <div>
                        <div className="font-semibold text-gray-900">{item.menuItem?.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {item.quantity} x ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-bold text-gray-900">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 p-3 rounded-xl space-y-1.5 font-mono">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${selectedOrderDetails.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrderDetails.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-${selectedOrderDetails.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span>${selectedOrderDetails.tax.toFixed(2)}</span>
                </div>
                {selectedOrderDetails.serviceCharge > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Service Charge:</span>
                    <span>${selectedOrderDetails.serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-1 flex justify-between font-bold text-gray-900 text-sm">
                  <span>Grand Total:</span>
                  <span>${selectedOrderDetails.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview & Printing Modal */}
      <ReceiptModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
};
