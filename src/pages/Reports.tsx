import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  BarChart3,
  DollarSign,
  Receipt,
  PieChart,
  Calendar,
  CreditCard,
  Printer,
  Download,
  Percent,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [range, setRange] = useState<'today' | 'weekly' | 'monthly'>('today');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', range],
    queryFn: async () => {
      const res = await api.get(`/reports/sales?range=${range}`);
      return res.data?.data;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-xs text-gray-500">
        Generating financial reports...
      </div>
    );
  }

  const { summary, paymentBreakdown, categoryBreakdown, taxSummary } = data;

  const totalCatSales = categoryBreakdown.reduce((sum: number, c: any) => sum + c.totalSales, 0) || 1;

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial & Sales Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">Z-Reports, category velocity, payment audits & tax reconciliation</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Filter */}
          <div className="bg-gray-200/70 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setRange('today')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                range === 'today' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Today (Daily Z)
            </button>
            <button
              onClick={() => setRange('weekly')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                range === 'weekly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setRange('monthly')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                range === 'monthly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              This Month
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">${summary.grossSales.toFixed(2)}</div>
          <div className="text-[11px] text-gray-400 mt-1">{summary.totalTransactions} paid transactions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Ticket</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">${summary.averageTicket.toFixed(2)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Per seated party</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxes Collected</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">${taxSummary.totalTax.toFixed(2)}</div>
          <div className="text-[11px] text-gray-400 mt-1">VAT & local restaurant tax</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Service Charges</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">${taxSummary.totalServiceCharge.toFixed(2)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Staff tip & service pool</div>
        </div>
      </div>

      {/* Row 2: Category Breakdown & Payment Method Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales by Menu Category */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Sales by Category Velocity</h2>
          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">No sales recorded for this period</div>
            ) : (
              categoryBreakdown.map((cat: any) => {
                const pct = Math.round((cat.totalSales / totalCatSales) * 100);
                return (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-800">{cat.categoryName} ({cat.quantity} sold)</span>
                      <span className="font-bold text-gray-900">${cat.totalSales.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-orange-600 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sales by Payment Method */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Payment Method Reconciliation</h2>
          <div className="space-y-3">
            {paymentBreakdown.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">No settled payments recorded</div>
            ) : (
              paymentBreakdown.map((pm: any) => (
                <div
                  key={pm.method}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold">
                      {pm.method[0]}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{pm.method}</div>
                      <div className="text-[11px] text-gray-400">{pm.count} settlements</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-sm text-gray-900">${pm.total.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tax Audit Summary */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Tax & Reconciliation Audit Statement</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-500">Taxable Net Food & Beverage Sales:</span>
            <div className="text-base font-bold text-gray-900 mt-1">${taxSummary.netSales.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-500">Total Statutory Tax Liability:</span>
            <div className="text-base font-bold text-gray-900 mt-1">${taxSummary.totalTax.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-500">Service Charges / Gratuity:</span>
            <div className="text-base font-bold text-gray-900 mt-1">${taxSummary.totalServiceCharge.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
