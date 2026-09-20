import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Ticket, TicketStatus } from '../types/index.js';
import {
  Wine,
  Clock,
  CheckCircle2,
  Sparkles,
  GlassWater,
  Check,
} from 'lucide-react';

export const BarBds: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const { data: bots, isLoading } = useQuery({
    queryKey: ['bot', filter],
    queryFn: async () => {
      const res = await api.get(`/bot?${filter === 'ACTIVE' ? 'active=true' : ''}`);
      return res.data?.data as Ticket[];
    },
    refetchInterval: 5000,
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'start' | 'ready' | 'served' }) => {
      const res = await api.post(`/bot/${id}/${action}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const getElapsedMinutes = (createdAt: string) => {
    const diffMs = now - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const getStatusStyle = (status: TicketStatus) => {
    if (status === 'READY') {
      return {
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        card: 'border-emerald-300 bg-emerald-50/20',
        label: 'DRINKS READY',
      };
    }
    if (status === 'PREPARING') {
      return {
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        card: 'border-indigo-300 bg-indigo-50/20',
        label: 'MIXING / POURING',
      };
    }
    return {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      card: 'border-gray-200 bg-white',
      label: 'NEW BOT TICKET',
    };
  };

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* BDS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-4 md:p-5 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">
            <Wine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Bar Display System (BDS)</h1>
            <p className="text-xs text-slate-400">Live beverage queue, cocktail bar & tap station</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ACTIVE' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Active Tickets ({bots?.filter((b) => b.status !== 'SERVED' && b.status !== 'CANCELLED').length || 0})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ALL' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Tickets
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-xs text-gray-400">
          Loading bar beverage tickets...
        </div>
      ) : !bots || bots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">Bar Station All Clear!</h3>
          <p className="text-xs text-gray-500 mt-1">No pending beverage tickets in queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => {
            const elapsed = getElapsedMinutes(bot.createdAt);
            const style = getStatusStyle(bot.status);

            return (
              <div
                key={bot.id}
                className={`rounded-2xl border-2 shadow-xs flex flex-col justify-between overflow-hidden transition-all ${style.card}`}
              >
                {/* Ticket Top Header */}
                <div className="p-4 border-b border-gray-200 bg-white/80">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-gray-900 tracking-tight">
                      {bot.botNumber}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                    <div className="font-bold text-gray-900">Table: {bot.tableNumber}</div>
                    <div>Server: {bot.waiterName}</div>
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-[11px] font-mono font-bold text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Elapsed: {elapsed} mins ago</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-3 flex-1 bg-white/40 divide-y divide-gray-100">
                  {bot.items.map((item) => (
                    <div key={item.id} className="pt-2 first:pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-gray-900">{item.name}</span>
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs">
                          x{item.quantity}
                        </span>
                      </div>
                      {item.notes && (
                        <div className="mt-1 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5 font-medium italic">
                          Bar Note: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status Action Buttons */}
                <div className="p-3 border-t border-gray-200 bg-white/90">
                  {bot.status === 'PENDING' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => transitionMutation.mutate({ id: bot.id, action: 'accept' })}
                        className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept BOT</span>
                      </button>
                      <button
                        onClick={() => transitionMutation.mutate({ id: bot.id, action: 'start' })}
                        className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Start Mixing</span>
                      </button>
                    </div>
                  )}

                  {bot.status === 'ACCEPTED' && (
                    <button
                      onClick={() => transitionMutation.mutate({ id: bot.id, action: 'start' })}
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Mixing</span>
                    </button>
                  )}

                  {bot.status === 'PREPARING' && (
                    <button
                      onClick={() => transitionMutation.mutate({ id: bot.id, action: 'ready' })}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Ready (Notify Server)</span>
                    </button>
                  )}

                  {bot.status === 'READY' && (
                    <button
                      onClick={() => transitionMutation.mutate({ id: bot.id, action: 'served' })}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Mark Drinks Served</span>
                    </button>
                  )}

                  {bot.status === 'SERVED' && (
                    <div className="text-center py-1 text-xs text-gray-500 font-medium">
                      ✓ Served to guest
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
