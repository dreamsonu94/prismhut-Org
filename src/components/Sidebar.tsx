import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  Grid2X2,
  ShoppingBag,
  ChefHat,
  Wine,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import { RoleType } from '../types/index.js';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: RoleType[];
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { hasRole } = useAuth();

  const navItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      to: '/tables',
      label: 'Table Floor',
      icon: Grid2X2,
    },
    {
      to: '/pos',
      label: 'POS Order',
      icon: ShoppingBag,
    },
    {
      to: '/kitchen',
      label: 'Kitchen (KDS)',
      icon: ChefHat,
    },
    {
      to: '/bar',
      label: 'Bar (BDS)',
      icon: Wine,
    },
    {
      to: '/billing',
      label: 'Billing / Cashier',
      icon: CreditCard,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      to: '/orders',
      label: 'Orders & Receipts',
      icon: FileText,
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      to: '/settings',
      label: 'Menu & Settings',
      icon: Settings,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    },
  ];

  return (
    <aside className="w-18 md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 select-none">
      <div className="py-4 px-3">
        <div className="hidden md:block px-3 pb-3 mb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.roles && !hasRole(item.roles)) {
              return null;
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
                title={item.label}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-800 hidden md:block">
        <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
            <span>Status</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </span>
          </div>
          <div className="text-[11px] text-slate-500">PostgreSQL Ready • Mobile Waiter API</div>
        </div>
      </div>
    </aside>
  );
};
