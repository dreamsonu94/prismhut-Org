import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { TableItem, TableStatus } from '../types/index.js';
import {
  Users,
  Utensils,
  PlusCircle,
  CreditCard,
  Sparkles,
  Ban,
  Clock,
  CheckCircle2,
  X,
  Plus,
} from 'lucide-react';

export const Tables: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [activeTableDetail, setActiveTableDetail] = useState<TableItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await api.get('/tables');
      return res.data?.data;
    },
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TableStatus }) => {
      const res = await api.put(`/tables/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setActiveTableDetail(null);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading floor tables...</span>
        </div>
      </div>
    );
  }

  const tables: TableItem[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.tables)
    ? data.tables
    : [];
  const sections: any[] = Array.isArray(data?.sections) ? data.sections : [];

  const filteredTables = tables.filter((tbl) => {
    if (selectedSection === 'ALL') return true;
    return tbl.section?.id === selectedSection;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
          indicator: 'bg-emerald-500',
          label: 'Available',
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-800',
          indicator: 'bg-rose-500',
          label: 'Occupied',
        };
      case 'RESERVED':
        return {
          bg: 'bg-blue-50 border-blue-300 text-blue-800',
          indicator: 'bg-blue-500',
          label: 'Reserved',
        };
      case 'CLEANING':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-800',
          indicator: 'bg-amber-500',
          label: 'Cleaning Needed',
        };
      case 'OUT_OF_SERVICE':
        return {
          bg: 'bg-gray-50 border-gray-300 text-gray-700',
          indicator: 'bg-gray-400',
          label: 'Out of Service',
        };
      default:
        return { bg: 'bg-gray-50 border-gray-200 text-gray-700', indicator: 'bg-gray-300', label: status };
    }
  };

  const handleTableClick = (tbl: TableItem) => {
    if (tbl.status === 'AVAILABLE') {
      // Direct jump to POS order with this table pre-selected
      navigate(`/pos?tableId=${tbl.id}`);
    } else {
      setActiveTableDetail(tbl);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Header with floor controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Floor Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time table occupancy, active tickets & ordering</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-600 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-gray-600 font-medium">Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-gray-600 font-medium">Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-gray-600 font-medium">Cleaning</span>
          </div>
        </div>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setSelectedSection('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedSection === 'ALL'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          All Floor Areas ({tables.length})
        </button>
        {sections.map((sec) => {
          const count = tables.filter((t) => t.section?.id === sec.id).length;
          return (
            <button
              key={sec.id}
              onClick={() => setSelectedSection(sec.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSection === sec.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {sec.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map((tbl) => {
          const badge = getStatusBadge(tbl.status);
          const hasOrder = !!tbl.activeOrder;

          return (
            <div
              key={tbl.id}
              onClick={() => handleTableClick(tbl)}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md flex flex-col justify-between min-h-[160px] relative ${badge.bg}`}
            >
              {/* Card Top */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base font-black tracking-tight">{tbl.tableNumber}</span>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${badge.indicator} animate-pulse`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{badge.label}</span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-gray-800 truncate">{tbl.tableName}</div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                  <Users className="w-3 h-3" />
                  <span>Up to {tbl.capacity} guests</span>
                </div>
              </div>

              {/* Card Bottom / Active Order Info */}
              <div className="pt-3 border-t border-black/5 mt-2">
                {hasOrder && tbl.activeOrder ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-gray-600">{tbl.activeOrder.orderNumber}</span>
                      <span className="font-bold text-gray-900">${tbl.activeOrder.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{tbl.activeOrder.waiterName}</span>
                      <span className="bg-black/10 px-1.5 py-0.2 rounded font-medium">
                        {tbl.activeOrder.status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-center font-medium text-gray-500 py-1 flex items-center justify-center gap-1">
                    <Plus className="w-3 h-3" />
                    <span>Tap to Seat & Order</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Detail / Action Modal */}
      {activeTableDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {activeTableDetail.tableNumber} — {activeTableDetail.tableName}
                </h3>
                <span className="text-xs text-gray-500">
                  Capacity: {activeTableDetail.capacity} guests • Section: {activeTableDetail.section?.name || 'General'}
                </span>
              </div>
              <button
                onClick={() => setActiveTableDetail(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Order Details if present */}
            {activeTableDetail.activeOrder ? (
              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-950">
                    Order {activeTableDetail.activeOrder.orderNumber}
                  </span>
                  <span className="text-xs font-extrabold text-orange-900">
                    Total: ${activeTableDetail.activeOrder.grandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 flex justify-between">
                  <span>Server: {activeTableDetail.activeOrder.waiterName}</span>
                  <span>Guests: {activeTableDetail.activeOrder.guestCount}</span>
                </div>

                {/* Tickets status */}
                <div className="pt-2 border-t border-orange-200/60 flex items-center gap-2 text-[11px]">
                  {activeTableDetail.activeOrder.kotStatus.length > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium">
                      KOT: {activeTableDetail.activeOrder.kotStatus.map((k) => k.status).join(', ')}
                    </span>
                  )}
                  {activeTableDetail.activeOrder.botStatus.length > 0 && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-medium">
                      BOT: {activeTableDetail.activeOrder.botStatus.map((b) => b.status).join(', ')}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className={`pt-3 ${hasRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER']) ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}`}>
                  <button
                    onClick={() => {
                      navigate(`/pos?tableId=${activeTableDetail.id}`);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-orange-200 hover:bg-orange-100/50 rounded-xl text-xs font-bold text-orange-900 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add More Items</span>
                  </button>
                  {hasRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER']) ? (
                    <button
                      onClick={() => {
                        navigate(`/billing?orderId=${activeTableDetail.activeOrder?.id}`);
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white shadow-xs transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Settle Bill</span>
                    </button>
                  ) : (
                    <div className="text-center py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium">
                      Table order active — bill settlement managed at Cashier
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-600 mb-3">No active order for this table.</p>
                <button
                  onClick={() => navigate(`/pos?tableId=${activeTableDetail.id}`)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Open POS & Take Order</span>
                </button>
              </div>
            )}

            {/* Quick Status Modifiers */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Change Table Floor Status
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateTableStatusMutation.mutate({ id: activeTableDetail.id, status: 'AVAILABLE' })}
                  className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available</span>
                </button>
                <button
                  onClick={() => updateTableStatusMutation.mutate({ id: activeTableDetail.id, status: 'CLEANING' })}
                  className="py-2 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 transition-colors flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cleaning</span>
                </button>
                <button
                  onClick={() => updateTableStatusMutation.mutate({ id: activeTableDetail.id, status: 'RESERVED' })}
                  className="py-2 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 transition-colors flex items-center justify-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Reserved</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
