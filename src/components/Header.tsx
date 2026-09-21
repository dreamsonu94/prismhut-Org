import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import {
  UtensilsCrossed,
  Wifi,
  WifiOff,
  User,
  LogOut,
  Clock,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { RoleType } from '../types/index.js';
import { PWAInstallButton } from './PWAInstallButton.js';

export const Header: React.FC = () => {
  const { user, logout, login } = useAuth();
  const { isConnected } = useSocket();
  const [time, setTime] = useState<string>('');
  const [roleMenuOpen, setRoleMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const demoRoles: { label: string; username: string; role: RoleType; color: string }[] = [
    { label: 'Admin (Alex)', username: 'admin', role: 'ADMIN', color: 'bg-rose-100 text-rose-800' },
    { label: 'Manager (Maria)', username: 'manager', role: 'MANAGER', color: 'bg-purple-100 text-purple-800' },
    { label: 'Cashier (David)', username: 'cashier', role: 'CASHIER', color: 'bg-amber-100 text-amber-800' },
    { label: 'Waiter (Liam)', username: 'waiter', role: 'WAITER', color: 'bg-blue-100 text-blue-800' },
    { label: 'Kitchen Chef (Gordon)', username: 'kitchen', role: 'KITCHEN', color: 'bg-emerald-100 text-emerald-800' },
    { label: 'Bartender (Sam)', username: 'bar', role: 'BAR', color: 'bg-indigo-100 text-indigo-800' },
  ];

  const handleSwitchRole = async (username: string) => {
    setRoleMenuOpen(false);
    await login(username, 'password123');
  };

  const getRoleBadgeColor = (role?: RoleType) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-700 border-rose-200';
      case 'MANAGER':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'CASHIER':
        return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'WAITER':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'KITCHEN':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'BAR':
        return 'bg-indigo-500/10 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Restaurant */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 tracking-tight text-lg">RESTAURANT SMART POS</span>
            <span className="text-xs bg-orange-100 text-orange-800 font-semibold px-2 py-0.5 rounded-full">v1.0</span>
          </div>
          <p className="text-xs text-gray-500">{user?.restaurant?.name || 'Main Dining & Lounge'}</p>
        </div>
      </div>

      {/* Center Live Clock & Real-time Indicator */}
      <div className="hidden lg:flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{time}</span>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
          isConnected
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3.5 h-3.5" />
              <span>Real-time Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Reconnecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Right User & Quick Switcher */}
      <div className="flex items-center gap-3">
        {/* PWA Install Button for Mobile Waiter / POS */}
        <PWAInstallButton />

        {/* Quick Role Switcher for seamless testing */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg border border-gray-200 transition-colors"
            title="Switch staff account"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Role Switcher</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Quick Login as Staff
              </div>
              {demoRoles.map((dr) => (
                <button
                  key={dr.username}
                  onClick={() => handleSwitchRole(dr.username)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    user?.username === dr.username ? 'bg-orange-50/50 font-bold text-orange-900' : 'text-gray-700'
                  }`}
                >
                  <span>{dr.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${dr.color}`}>
                    {dr.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Active Staff Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</div>
              <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded border font-medium ${getRoleBadgeColor(user.role)}`}>
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
