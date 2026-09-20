import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Order, PaymentMethod, Invoice } from '../types/index.js';
import { ReceiptModal } from '../components/ReceiptModal.js';
import {
  CreditCard,
  DollarSign,
  QrCode,
  Building2,
  Receipt,
  CheckCircle2,
  Users,
  Search,
  Printer,
  Sparkles,
} from 'lucide-react';

export const BillingCashier: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(searchParams.get('orderId') || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Guest');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Invoice modal
  const [settledInvoice, setSettledInvoice] = useState<Invoice | null>(null);

  // Fetch active unpaid orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'unpaid'],
    queryFn: async () => {
      const res = await api.get('/orders');
      const allOrders = res.data?.data as Order[];
      return allOrders.filter((o) =>
        ['CONFIRMED', 'PREPARING', 'READY', 'SERVED'].includes(o.status)
      );
    },
    refetchInterval: 5000,
  });

  const selectedOrder = orders?.find((o) => o.id === selectedOrderId);

  useEffect(() => {
    const oId = searchParams.get('orderId');
    if (oId) setSelectedOrderId(oId);
  }, [searchParams]);

  useEffect(() => {
    if (selectedOrder) {
      setReceivedAmount(selectedOrder.grandTotal.toFixed(2));
      setCustomerName(selectedOrder.customer?.name || 'Walk-in Guest');
    }
  }, [selectedOrder]);

  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error('No order selected');

      const res = await api.post('/payments', {
        orderId: selectedOrder.id,
        amount: Number(receivedAmount) || selectedOrder.grandTotal,
        method: paymentMethod,
        referenceNumber: referenceNumber || undefined,
        customerName: customerName || 'Valued Guest',
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setSettledInvoice(data.invoice);
      setSelectedOrderId('');
      setReferenceNumber('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

  const changeDue = selectedOrder
    ? Math.max(0, (Number(receivedAmount) || 0) - selectedOrder.grandTotal)
    : 0;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-100">
      {/* Left Column: Unpaid Orders Queue */}
      <div className="w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-600" />
              <span>Pending Bills</span>
            </h2>
            <span className="text-xs bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
              {filteredOrders.length} to settle
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table, order #, server..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Order Cards */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">
              Loading active orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-xs text-gray-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
              <span>All table bills are settled!</span>
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isSelected = ord.id === selectedOrderId;
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-gray-900">{ord.orderNumber}</span>
                    <span className="text-sm font-black text-gray-900">${ord.grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="font-semibold text-gray-800">
                      {ord.table ? `${ord.table.tableNumber} - ${ord.table.tableName}` : 'Takeaway'}
                    </span>
                    <span>{ord.waiter ? ord.waiter.name : 'Staff'}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{ord.items.length} items</span>
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded font-medium">
                      {ord.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Checkout & Billing Settlement */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto max-w-4xl mx-auto w-full">
        {!selectedOrder ? (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-xs">
            <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-900">Select an Order to Settle</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Choose an active bill from the left list to review items, calculate change, and process payment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-gray-900">{selectedOrder.orderNumber}</span>
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    Awaiting Payment
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Table: <strong className="text-gray-800">{selectedOrder.table?.tableName || 'Takeaway'}</strong> •
                  Server: <strong className="text-gray-800">{selectedOrder.waiter?.name || 'Staff'}</strong> •
                  Time: {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-400">Total Payable</div>
                <div className="text-2xl font-black text-orange-600">
                  ${selectedOrder.grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Bill Details Breakdown & Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Items */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Consolidated Items ({selectedOrder.items.length})
                </h3>
                <div className="space-y-2.5 max-h-64 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-900">{item.menuItem?.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-bold text-gray-900">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Tax */}
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount:</span>
                      <span>-${selectedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (VAT/GST):</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span>${selectedOrder.serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Grand Total:</span>
                    <span>${selectedOrder.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Entry Form */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Payment Method
                  </h3>

                  {/* Payment Method Selector Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        paymentMethod === 'CASH'
                          ? 'border-orange-500 bg-orange-50 text-orange-950'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Cash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        paymentMethod === 'CARD'
                          ? 'border-orange-500 bg-orange-50 text-orange-950'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Credit Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('QR')}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        paymentMethod === 'QR'
                          ? 'border-orange-500 bg-orange-50 text-orange-950'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR Pay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BANK_TRANSFER')}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        paymentMethod === 'BANK_TRANSFER'
                          ? 'border-orange-500 bg-orange-50 text-orange-950'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Transfer</span>
                    </button>
                  </div>

                  {/* Cash Amount Tendered & Change Calculation */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Amount Tendered / Received ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        className="w-full text-base font-bold px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-900"
                      />
                    </div>

                    {paymentMethod === 'CASH' && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-900">Change Due to Guest:</span>
                        <span className="text-base font-black text-emerald-800">
                          ${changeDue.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Guest / Invoice Name
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Guest Name (Optional)"
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Transaction Reference / Auth Code
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="e.g. CARD-AUTH-90412"
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Settle Action Button */}
                <button
                  onClick={() => processPaymentMutation.mutate()}
                  disabled={processPaymentMutation.isPending || (Number(receivedAmount) || 0) < selectedOrder.grandTotal}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  {processPaymentMutation.isPending ? (
                    <span>Settling in PostgreSQL & Generating Invoice...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Payment & Print Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thermal Receipt Modal after Settlement */}
      <ReceiptModal
        invoice={settledInvoice}
        onClose={() => setSettledInvoice(null)}
      />
    </div>
  );
};
