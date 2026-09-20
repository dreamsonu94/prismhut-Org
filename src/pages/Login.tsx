import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { UtensilsCrossed, Lock, User, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { RoleType } from '../types/index.js';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const ok = await login(username, password);
      if (ok) {
        navigate('/tables');
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const quickStaffAccounts: { name: string; username: string; role: RoleType; color: string }[] = [
    { name: 'Alex Harrison', username: 'admin', role: 'ADMIN', color: 'border-rose-300 bg-rose-50 text-rose-900' },
    { name: 'Maria Santos', username: 'manager', role: 'MANAGER', color: 'border-purple-300 bg-purple-50 text-purple-900' },
    { name: 'David Kim', username: 'cashier', role: 'CASHIER', color: 'border-amber-300 bg-amber-50 text-amber-900' },
    { name: 'Liam Walker', username: 'waiter', role: 'WAITER', color: 'border-blue-300 bg-blue-50 text-blue-900' },
    { name: 'Chef Gordon', username: 'kitchen', role: 'KITCHEN', color: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
    { name: 'Bartender Sam', username: 'bar', role: 'BAR', color: 'border-indigo-300 bg-indigo-50 text-indigo-900' },
  ];

  const handleQuickLogin = async (u: string) => {
    setUsername(u);
    setPassword('password123');
    setError(null);
    setLoading(true);
    const ok = await login(u, 'password123');
    setLoading(false);
    if (ok) {
      if (u === 'kitchen') navigate('/kitchen');
      else if (u === 'bar') navigate('/bar');
      else if (u === 'cashier') navigate('/billing');
      else navigate('/tables');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-orange-600/30 mb-4">
          <UtensilsCrossed className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          RESTAURANT SMART POS
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to your restaurant terminal or select your staff profile
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Username or Staff ID
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  placeholder="e.g. cashier or waiter"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                PIN or Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Unlock Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Selection */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                Quick Staff Demo Accounts
              </span>
              <span className="text-[10px] text-gray-400">Password: password123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickStaffAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleQuickLogin(acc.username)}
                  className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${acc.color}`}
                >
                  <span className="text-xs font-bold truncate">{acc.name}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-mono opacity-80">{acc.username}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-white/60 px-1 py-0.2 rounded">
                      {acc.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          PostgreSQL Database Connected • Cloud & LAN Ready • Mobile Waiter API Enabled
        </p>
      </div>
    </div>
  );
};
