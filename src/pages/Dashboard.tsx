import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Wine,
  Grid2X2,
  TrendingUp,
  ArrowRight,
  Flame,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data?.data;
    },
    refetchInterval: 10000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading live restaurant statistics...</span>
        </div>
      </div>
    );
  }

  const { overview, tables, tickets, charts, recentOrders } = data;

  const maxHourly = Math.max(...charts.hourlySales.map((h: any) => h.sales), 10);

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Restaurant Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">Live PostgreSQL telemetry & operational metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>New POS Order</span>
          </button>
          <button
            onClick={() => navigate('/tables')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Grid2X2 className="w-4 h-4" />
            <span>View Floor Map</span>
          </button>
        </div>
      </div>

      {/* Row 1: Core Revenue & Order Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">${overview.todaySales.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Revenue settled</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{overview.todayOrders}</div>
          <div className="text-[11px] text-gray-500 mt-1">Recorded today</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Orders</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{overview.pendingOrders}</div>
          <div className="text-[11px] text-amber-700 mt-1">In kitchen / on floor</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{overview.completedOrders}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Paid & settled</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cancelled</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600">{overview.cancelledOrders}</div>
          <div className="text-[11px] text-gray-400 mt-1">Voided tickets</div>
        </div>
      </div>

      {/* Row 2: Live Operational Status (Tables, KDS, BDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Table Floor Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Grid2X2 className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-bold text-gray-900">Floor Status</h2>
            </div>
            <button
              onClick={() => navigate('/tables')}
              className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="text-xl font-bold text-emerald-700">{tables.available}</div>
              <div className="text-[11px] font-medium text-emerald-800 mt-0.5">Available</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="text-xl font-bold text-amber-700">{tables.occupied}</div>
              <div className="text-[11px] font-medium text-amber-800 mt-0.5">Occupied</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="text-xl font-bold text-blue-700">{tables.reserved}</div>
              <div className="text-[11px] font-medium text-blue-800 mt-0.5">Reserved</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Total {tables.total} dining tables configured
          </div>
        </div>

        {/* Kitchen KOT Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-gray-900">Kitchen Display (KOT)</h2>
            </div>
            <button
              onClick={() => navigate('/kitchen')}
              className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Open KDS</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="text-xl font-bold text-red-700">{tickets.pendingKot}</div>
              <div className="text-[11px] font-medium text-red-800 mt-0.5">Pending</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="text-xl font-bold text-amber-700">{tickets.preparingKot}</div>
              <div className="text-[11px] font-medium text-amber-800 mt-0.5">Cooking</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="text-xl font-bold text-emerald-700">{tickets.readyKot}</div>
              <div className="text-[11px] font-medium text-emerald-800 mt-0.5">Ready</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Kitchen orders automatically filtered & routed
          </div>
        </div>

        {/* Bar BOT Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wine className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-900">Bar Display (BOT)</h2>
            </div>
            <button
              onClick={() => navigate('/bar')}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Open BDS</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="text-xl font-bold text-red-700">{tickets.pendingBot}</div>
              <div className="text-[11px] font-medium text-red-800 mt-0.5">Pending</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="text-xl font-bold text-amber-700">{tickets.preparingBot}</div>
              <div className="text-[11px] font-medium text-amber-800 mt-0.5">Mixing</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="text-xl font-bold text-emerald-700">{tickets.readyBot}</div>
              <div className="text-[11px] font-medium text-emerald-800 mt-0.5">Ready</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Drinks tickets routed in atomic transaction
          </div>
        </div>
      </div>

      {/* Row 3: Hourly Sales Chart & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Sales Visualizer */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Today's Hourly Sales Velocity</h2>
              <p className="text-xs text-gray-400">Revenue distributed by hour</p>
            </div>
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              8:00 AM - 11:00 PM
            </span>
          </div>

          {/* Bar representation */}
          <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-gray-100">
            {charts.hourlySales.map((h: any, i: number) => {
              const heightPct = Math.max(8, Math.round((h.sales / maxHourly) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20">
                    ${h.sales.toFixed(2)} ({h.count} orders)
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      h.sales > 0 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-100'
                    }`}
                  />
                  <span className="text-[9px] text-gray-400 mt-1.5 font-mono truncate w-full text-center">
                    {h.hour.split(':')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-gray-900">Top Selling Products</h2>
            </div>
            <span className="text-[11px] text-gray-400">Volume</span>
          </div>

          <div className="space-y-3 flex-1 pt-1">
            {charts.topSellingProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No products sold yet today
              </div>
            ) : (
              charts.topSellingProducts.map((p: any, idx: number) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-gray-400">{p.category}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className="font-bold text-gray-900">${p.totalSales.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-400">{p.quantity} sold</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Recent Floor Orders</h2>
          <button
            onClick={() => navigate('/orders')}
            className="text-xs text-orange-600 font-semibold hover:underline"
          >
            View All Orders
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Server</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No orders registered yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{o.orderNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{o.tableName}</td>
                    <td className="px-4 py-3 text-gray-600">{o.waiterName}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">${o.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        o.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(o.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
