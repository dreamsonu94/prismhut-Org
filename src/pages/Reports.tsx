import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Percent,
  Calendar,
  Download,
  Printer,
  ShoppingBag,
  Users,
  Grid2X2,
  Ban,
  Clock,
  ArrowUpDown,
  Search,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'thisweek'
  | 'thismonth'
  | 'lastmonth'
  | 'custom';

type ReportTab =
  | 'overview'
  | 'sales'
  | 'payments'
  | 'products'
  | 'waiters'
  | 'tables'
  | 'cancellations';

export const Reports: React.FC = () => {
  const { user, hasRole } = useAuth();

  // Date Filter States
  const [range, setRange] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // View state
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  // Product sorting & filtering
  const [productSort, setProductSort] = useState<'qty' | 'revenue'>('revenue');
  const [topItemsLimit, setTopItemsLimit] = useState<number>(10);

  // Sales report search
  const [salesSearch, setSalesSearch] = useState('');

  // Fetch Dashboard Overview & Aggregates
  const {
    data: dashboardData,
    isLoading: isDashLoading,
    refetch: refetchDash,
    isRefetching: isDashRefetching,
  } = useQuery({
    queryKey: ['reports-dashboard', range, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', range);
      if (range === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/reports/dashboard?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Fetch Detailed Sales Report
  const {
    data: salesData,
    isLoading: isSalesLoading,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ['reports-sales', range, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', range);
      if (range === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/reports/sales?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Fetch Payments Breakdown & Transactions
  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
  } = useQuery({
    queryKey: ['reports-payments', range, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', range);
      if (range === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/reports/payments?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Fetch Menu / Product Performance
  const {
    data: productsData,
    isLoading: isProductsLoading,
  } = useQuery({
    queryKey: ['reports-products', range, startDate, endDate, productSort],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', range);
      params.append('sortBy', productSort === 'qty' ? 'quantity' : 'revenue');
      if (range === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/reports/products?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Fetch Waiter Performance
  const {
    data: waitersData,
    isLoading: isWaitersLoading,
  } = useQuery({
    queryKey: ['reports-waiters', range, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', range);
      if (range === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/reports/waiters?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Fetch Table Performance
  const {
    data: tablesData,
    isLoading: isTablesLoading,
  } = useQuery({
    queryKey: ['reports-tables', range, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', range);
      if (range === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/reports/tables?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Fetch Cancellations Report
  const {
    data: cancellationsData,
    isLoading: isCancellationsLoading,
  } = useQuery({
    queryKey: ['reports-cancellations', range, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', range);
      if (range === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/reports/cancellations?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Export CSV Handler
  const handleExportCsv = (reportType: string) => {
    const params = new URLSearchParams();
    params.append('range', range);
    params.append('exportFormat', 'csv');
    if (range === 'custom') {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }
    const token = localStorage.getItem('pos_token') || '';
    const url = `/api/v1/reports/${reportType}?${params.toString()}`;

    // Trigger download with auth token
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${reportType}-report-${range}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch((err) => {
        console.error('CSV Export failed:', err);
      });
  };

  const isCashierOnly = user?.role === 'CASHIER';

  // Filtered sales rows for search
  const filteredSalesRows = (salesData?.rows || []).filter((r: any) => {
    if (!salesSearch) return true;
    const q = salesSearch.toLowerCase();
    return (
      r.orderNumber?.toLowerCase().includes(q) ||
      r.invoiceNumber?.toLowerCase().includes(q) ||
      r.tableName?.toLowerCase().includes(q) ||
      r.server?.toLowerCase().includes(q) ||
      r.paymentMethod?.toLowerCase().includes(q)
    );
  });

  const summary = dashboardData?.summary || {
    grossSales: 0,
    netSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    cashSales: 0,
    cardSales: 0,
    qrSales: 0,
    transferSales: 0,
    totalTax: 0,
    totalServiceCharge: 0,
    totalDiscount: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    refundedOrders: 0,
  };

  const paymentBreakdown = dashboardData?.paymentBreakdown || [];
  const hourlySales = dashboardData?.hourlySales || [];
  const dailySales = dashboardData?.dailySales || [];

  // Calculate max sales for SVG scaling
  const maxHourlySales = Math.max(...hourlySales.map((h: any) => h.sales), 1);
  const maxDailySales = Math.max(...dailySales.map((d: any) => d.sales), 1);

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full print:p-0 print:max-w-none">
      {/* Top Header & Date Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-5 print:border-b-2 print:border-black">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Reports & Analytics
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              PostgreSQL Verified
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time financial audits, payment reconciliation, sales velocity & product performance
          </p>
        </div>

        {/* Date Presets & Custom Range Controls */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Preset Buttons */}
          <div className="bg-gray-100 p-1 rounded-xl flex flex-wrap items-center gap-1 text-xs border border-gray-200/70">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7days', label: 'Last 7 Days' },
                { id: 'thisweek', label: 'This Week' },
                { id: 'thismonth', label: 'This Month' },
                { id: 'lastmonth', label: 'Last Month' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setRange(p.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  range === p.id
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refetchDash();
                refetchSales();
              }}
              title="Refresh Data"
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isDashRefetching ? 'animate-spin text-orange-600' : ''}`}
              />
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Print Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (visible when 'custom' is selected) */}
      {range === 'custom' && (
        <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl flex flex-wrap items-center gap-4 text-xs print:hidden animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-orange-950">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span>Custom Date Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-semibold">Start:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-semibold">End:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <span className="text-[11px] text-orange-700 font-medium ml-auto">
            Recalculating all metrics across chosen window
          </span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-1 text-xs font-bold print:hidden">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Executive Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'sales'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sales Report</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'payments'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Menu & Products</span>
        </button>

        {!isCashierOnly && (
          <>
            <button
              onClick={() => setActiveTab('waiters')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'waiters'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Waiters / Staff</span>
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'tables'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Grid2X2 className="w-4 h-4" />
              <span>Table Velocity</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('cancellations')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'cancellations'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Ban className="w-4 h-4 text-rose-500" />
          <span>Cancelled Orders</span>
          {summary.cancelledOrders > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-rose-100 text-rose-800 rounded-full font-bold">
              {summary.cancelledOrders}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE DASHBOARD TAB */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || window.matchMedia('print').matches) && (
        <div className="space-y-6">
          {/* Section 1: Core Financial KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Today's / Period Gross Sales */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Gross Sales
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                ${summary.grossSales.toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 font-medium">
                {summary.completedOrders} completed & paid orders
              </div>
            </div>

            {/* Today's / Period Net Sales */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Net Sales
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-900 tracking-tight">
                ${summary.netSales.toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 font-medium">
                Subtotal before taxes & gratuities
              </div>
            </div>

            {/* Number of Orders & Average Order Value */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Average Ticket (AOV)
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-950 tracking-tight">
                ${summary.averageOrderValue.toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 font-medium">
                Across {summary.completedOrders} orders settled
              </div>
            </div>

            {/* Taxes & Service Charges */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Taxes & Charges
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-950 tracking-tight">
                ${(summary.totalTax + summary.totalServiceCharge).toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 font-medium">
                Tax: ${summary.totalTax.toFixed(2)} | Svc: ${summary.totalServiceCharge.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Section 2: Specific Payment Method Breakdown Cards */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Settled Payment Channels (PostgreSQL Reconciled)
                </h2>
                <p className="text-[11px] text-gray-500">
                  Real payment settlements linked 1:1 with completed orders
                </p>
              </div>
              <button
                onClick={() => handleExportCsv('payments')}
                className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200/60 print:hidden"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Payments CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* Cash Sales */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-900">Cash Sales</span>
                  <span className="w-6 h-6 rounded-md bg-emerald-200/70 text-emerald-800 flex items-center justify-center text-[10px] font-black">
                    $
                  </span>
                </div>
                <div className="text-xl font-black text-emerald-900">
                  ${summary.cashSales.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  {paymentBreakdown.find((p: any) => p.method === 'CASH')?.count || 0} settlements (
                  {paymentBreakdown.find((p: any) => p.method === 'CASH')?.percentage || 0}%)
                </div>
              </div>

              {/* Card Sales */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-900">Card Sales</span>
                  <span className="w-6 h-6 rounded-md bg-blue-200/70 text-blue-800 flex items-center justify-center text-[10px] font-black">
                    💳
                  </span>
                </div>
                <div className="text-xl font-black text-blue-900">
                  ${summary.cardSales.toFixed(2)}
                </div>
                <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                  {paymentBreakdown.find((p: any) => p.method === 'CARD')?.count || 0} settlements (
                  {paymentBreakdown.find((p: any) => p.method === 'CARD')?.percentage || 0}%)
                </div>
              </div>

              {/* QR Sales */}
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-900">QR / Digital</span>
                  <span className="w-6 h-6 rounded-md bg-indigo-200/70 text-indigo-800 flex items-center justify-center text-[10px] font-black">
                    📱
                  </span>
                </div>
                <div className="text-xl font-black text-indigo-900">
                  ${summary.qrSales.toFixed(2)}
                </div>
                <div className="text-[11px] text-indigo-700 font-medium mt-0.5">
                  {paymentBreakdown.find((p: any) => p.method === 'QR')?.count || 0} settlements (
                  {paymentBreakdown.find((p: any) => p.method === 'QR')?.percentage || 0}%)
                </div>
              </div>

              {/* Bank Transfer Sales */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-900">Bank Transfer</span>
                  <span className="w-6 h-6 rounded-md bg-amber-200/70 text-amber-800 flex items-center justify-center text-[10px] font-black">
                    🏛️
                  </span>
                </div>
                <div className="text-xl font-black text-amber-900">
                  ${summary.transferSales.toFixed(2)}
                </div>
                <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                  {paymentBreakdown.find((p: any) => p.method === 'BANK_TRANSFER')?.count || 0}{' '}
                  settlements (
                  {paymentBreakdown.find((p: any) => p.method === 'BANK_TRANSFER')?.percentage || 0}
                  %)
                </div>
              </div>
            </div>

            {/* Order Counts Audit Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-gray-100">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 font-medium">Completed & Paid Orders:</span>
                <span className="font-extrabold text-gray-900">{summary.completedOrders}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-rose-50/60 rounded-xl border border-rose-100">
                <span className="text-rose-700 font-medium">Cancelled Orders (Excluded):</span>
                <span className="font-extrabold text-rose-800">{summary.cancelledOrders}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 font-medium">Refunded Orders:</span>
                <span className="font-extrabold text-gray-900">{summary.refundedOrders}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Visual Analytics (Hourly Velocity & Daily Sales Trend) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Sales Chart */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span>Hourly Sales Velocity (24 Hours)</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Order volume and dollar revenue distribution by hour of day
                  </p>
                </div>
              </div>

              <div className="h-48 w-full pt-4 flex items-end gap-1.5 border-b border-gray-200 overflow-x-auto">
                {hourlySales.map((h: any) => {
                  const heightPct = Math.max(
                    h.sales > 0 ? Math.round((h.sales / maxHourlySales) * 100) : 4,
                    h.orders > 0 ? 8 : 2
                  );
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 z-20 pointer-events-none bg-gray-900 text-white text-[10px] p-1.5 rounded-md shadow-md whitespace-nowrap text-center">
                        <div className="font-bold">{h.hour}</div>
                        <div>${h.sales.toFixed(2)}</div>
                        <div className="text-gray-300">{h.orders} orders</div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          h.sales > 0
                            ? 'bg-orange-500 group-hover:bg-orange-600'
                            : 'bg-gray-100'
                        }`}
                      />
                      <span className="text-[9px] text-gray-400 transform -rotate-45 origin-left pt-1">
                        {h.hour.slice(0, 2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                <span>Peak operational throughput</span>
                <span className="font-bold text-orange-600">
                  Max peak: ${maxHourlySales.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Daily Sales Trend Chart */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Daily Sales Trend</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Day-by-day revenue velocity for the active date filter
                  </p>
                </div>
              </div>

              {dailySales.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-gray-400">
                  No completed orders in this window
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-48 w-full pt-4 flex items-end gap-3 border-b border-gray-200 overflow-x-auto">
                    {dailySales.map((d: any) => {
                      const heightPct = Math.max(
                        Math.round((d.sales / maxDailySales) * 100),
                        8
                      );
                      return (
                        <div
                          key={d.date}
                          className="flex-1 min-w-[32px] flex flex-col items-center gap-1 group relative"
                        >
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 z-20 pointer-events-none bg-gray-900 text-white text-[10px] p-1.5 rounded-md shadow-md whitespace-nowrap text-center">
                            <div className="font-bold">{d.date}</div>
                            <div className="text-emerald-300 font-bold">${d.sales.toFixed(2)}</div>
                            <div className="text-gray-300">{d.orders} orders</div>
                          </div>

                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-emerald-500 group-hover:bg-emerald-600 rounded-t-sm transition-all"
                          />
                          <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">
                            {d.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span>Aggregated across active days</span>
                    <span className="font-bold text-emerald-700">
                      Top day: ${maxDailySales.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Top Selling Items Quick Overview */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                  <span>Top Selling Menu Items</span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  Calculated exclusively from completed, non-cancelled orders
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 font-bold">
                  <button
                    onClick={() => setProductSort('revenue')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      productSort === 'revenue'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500'
                    }`}
                  >
                    By Revenue
                  </button>
                  <button
                    onClick={() => setProductSort('qty')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      productSort === 'qty'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500'
                    }`}
                  >
                    By Quantity
                  </button>
                </div>

                <select
                  value={topItemsLimit}
                  onChange={(e) => setTopItemsLimit(Number(e.target.value))}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 font-semibold text-gray-700 text-xs"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Avg Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(productSort === 'revenue'
                    ? dashboardData?.topSellingByRevenue || []
                    : dashboardData?.topSellingByQty || []
                  )
                    .slice(0, topItemsLimit)
                    .map((item: any, idx: number) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-extrabold text-gray-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{item.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                          ${item.avgPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                          ${item.grossSales.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DETAILED SALES REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Detailed Sales Ledger</h2>
              <p className="text-xs text-gray-500">
                Itemized completed orders, tax liability, service charge, and payment status
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by Order, Invoice, Table..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                onClick={() => handleExportCsv('sales')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Order #</th>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Table/Mode</th>
                  <th className="py-3 px-3">Server</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Tax</th>
                  <th className="py-3 px-3 text-right">Service</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isSalesLoading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-gray-400">
                      Loading real PostgreSQL sales ledger...
                    </td>
                  </tr>
                ) : filteredSalesRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-gray-400">
                      No sales records match criteria
                    </td>
                  </tr>
                ) : (
                  filteredSalesRows.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                        {r.date} <span className="text-[10px] text-gray-400">{r.time}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                        {r.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-600">
                        {r.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{r.tableName}</td>
                      <td className="py-2.5 px-3 text-gray-700">{r.server}</td>
                      <td className="py-2.5 px-3 text-gray-500">{r.cashier}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-gray-800">
                        ${r.subtotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600">
                        ${r.tax.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600">
                        ${r.serviceCharge.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900">
                        ${r.grandTotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
                          {r.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {r.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Required Sticky Summary Bar */}
              {salesData?.totals && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-extrabold text-gray-900">
                  <tr>
                    <td colSpan={6} className="py-3 px-3 text-right uppercase text-[11px]">
                      Totals ({salesData.totals.orderCount} Completed Orders):
                    </td>
                    <td className="py-3 px-3 text-right">
                      ${salesData.totals.netSales.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      ${salesData.totals.totalTax.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      ${salesData.totals.totalServiceCharge.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800 text-sm">
                      ${salesData.totals.totalSales.toFixed(2)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-emerald-700 text-xs">
                      Collected: ${salesData.totals.totalCollected.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PAYMENT BREAKDOWN TAB */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Payment Method Breakdown</h2>
                <p className="text-xs text-gray-500">
                  Channel reconciliation, percentage of sales volume, and transaction audits
                </p>
              </div>
              <button
                onClick={() => handleExportCsv('payments')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Breakdown Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-center">Transactions</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">% of Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(paymentsData?.breakdown || []).map((b: any) => (
                    <tr key={b.method} className="hover:bg-gray-50/80">
                      <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs">
                          {b.method[0]}
                        </span>
                        {b.method}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{b.count}</td>
                      <td className="py-3 px-4 text-right font-black text-gray-900">
                        ${b.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-orange-600">
                        {b.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-black text-gray-900">
                  <tr>
                    <td className="py-3 px-4 uppercase text-[11px]">Grand Total Collections:</td>
                    <td className="py-3 px-4 text-center">
                      {paymentsData?.totalTransactions || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-800 text-sm">
                      ${(paymentsData?.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Detailed Payment Audit Log */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Payment Audit Transactions</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Table</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Reference #</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(paymentsData?.transactions || []).map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50/80">
                      <td className="py-2 px-3 text-gray-600">
                        {t.date} <span className="text-[10px] text-gray-400">{t.time}</span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-gray-900">
                        {t.orderNumber}
                      </td>
                      <td className="py-2 px-3 font-mono text-orange-600 font-bold">
                        {t.invoiceNumber}
                      </td>
                      <td className="py-2 px-3 text-gray-800 font-medium">{t.tableName}</td>
                      <td className="py-2 px-3 font-bold text-gray-800">{t.method}</td>
                      <td className="py-2 px-3 text-right font-black text-gray-900">
                        ${t.amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-gray-500">
                        {t.referenceNumber}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRODUCT / MENU PERFORMANCE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Menu Item & Category Velocity
              </h2>
              <p className="text-xs text-gray-500">
                Performance derived from settled order items; excludes cancelled orders
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 font-bold">
                <button
                  onClick={() => setProductSort('revenue')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    productSort === 'revenue'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Sort by Revenue
                </button>
                <button
                  onClick={() => setProductSort('qty')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    productSort === 'qty'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Sort by Quantity
                </button>
              </div>

              <button
                onClick={() => handleExportCsv('products')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3 text-right">Quantity Sold</th>
                  <th className="py-3 px-3 text-right">Avg Selling Price</th>
                  <th className="py-3 px-3 text-right">Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(productsData?.items || []).map((p: any, idx: number) => (
                  <tr key={p.id} className="hover:bg-gray-50/80">
                    <td className="py-2.5 px-3 font-extrabold text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-900">{p.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{p.department}</td>
                    <td className="py-2.5 px-3 text-right font-black text-gray-900">
                      {p.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                      ${p.avgPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                      ${p.grossSales.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-black text-gray-900">
                <tr>
                  <td colSpan={4} className="py-3 px-3 uppercase text-[11px]">
                    Total Menu Sales:
                  </td>
                  <td className="py-3 px-3 text-right">
                    {productsData?.totalQuantity || 0} units
                  </td>
                  <td className="py-3 px-3 text-right text-gray-500">—</td>
                  <td className="py-3 px-3 text-right text-emerald-800 text-sm">
                    ${(productsData?.totalSales || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SERVER / WAITER PERFORMANCE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'waiters' && !isCashierOnly && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Server & Waiter Performance</h2>
              <p className="text-xs text-gray-500">
                Orders handled, total revenue generated, and average order value per server
              </p>
            </div>
            <button
              onClick={() => handleExportCsv('waiters')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Server Name</th>
                  <th className="py-3 px-4 text-center">Orders Handled</th>
                  <th className="py-3 px-4 text-right">Sales Generated</th>
                  <th className="py-3 px-4 text-right">Average Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(waitersData || []).map((w: any) => (
                  <tr key={w.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-black text-xs">
                        {w.name[0]}
                      </div>
                      {w.name}
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-gray-800">
                      {w.orderCount}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">
                      ${w.sales.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-700">
                      ${w.averageOrderValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TABLE VELOCITY & PERFORMANCE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'tables' && !isCashierOnly && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Table Turnover & Revenue</h2>
            <p className="text-xs text-gray-500">
              Active/unpaid tables are excluded from revenue; only completed dining bills count
            </p>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4 text-center">Completed Orders</th>
                  <th className="py-3 px-4 text-right">Revenue Generated</th>
                  <th className="py-3 px-4 text-right">Average Bill</th>
                  <th className="py-3 px-4 text-center">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(tablesData || []).map((t: any) => (
                  <tr key={t.tableId} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {t.tableName} <span className="text-gray-400">({t.tableNumber})</span>
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-gray-800">
                      {t.ordersCount}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">
                      ${t.revenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-700">
                      ${t.averageBill.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : t.status === 'OCCUPIED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : t.status === 'RESERVED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CANCELLED ORDERS AUDIT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'cancellations' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-rose-900">
                Cancellation Audit Policy Enforced
              </h3>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Cancelled orders do <strong>NOT</strong> contribute to gross sales, net sales, or
                collected payments. They are recorded exclusively for loss-prevention and operational
                review.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Cancelled Orders Log</h2>
            <button
              onClick={() => handleExportCsv('cancellations')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Cancellations CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Table</th>
                  <th className="py-3 px-3 text-right">Amount Voided</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(cancellationsData || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No orders were cancelled in this date window
                    </td>
                  </tr>
                ) : (
                  (cancellationsData || []).map((c: any) => (
                    <tr key={c.id} className="hover:bg-rose-50/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-900">
                        {c.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">{c.date}</td>
                      <td className="py-2.5 px-3 text-gray-500">{c.time}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-800">{c.tableName}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-700">
                        ${c.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 italic">"{c.reason}"</td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{c.user}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
