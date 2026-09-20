import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { MenuItem, MenuCategory, User } from '../types/index.js';
import {
  Settings as SettingsIcon,
  Utensils,
  Wine,
  Plus,
  Edit2,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Building,
  Key,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'RESTAURANT' | 'MENU' | 'STAFF' | 'API'>('MENU');

  // Menu item modal state
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemDept, setItemDept] = useState<'KITCHEN' | 'BAR'>('KITCHEN');
  const [itemDesc, setItemDesc] = useState('');
  const [isVeg, setIsVeg] = useState(false);

  // Fetch restaurant settings
  const { data: restaurant } = useQuery({
    queryKey: ['settings-restaurant'],
    queryFn: async () => {
      const res = await api.get('/settings/restaurant');
      return res.data?.data;
    },
  });

  // Fetch menu items
  const { data: menuItems, isLoading: isMenuLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const res = await api.get('/menu/items');
      return res.data?.data as MenuItem[];
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: async () => {
      const res = await api.get('/menu/categories');
      return res.data?.data as MenuCategory[];
    },
  });

  // Fetch staff users
  const { data: staffList } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data?.data as User[];
    },
  });

  // Toggle Item Availability
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const res = await api.put(`/menu/items/${id}`, { isAvailable });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });

  // Create Menu Item
  const createItemMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/menu/items', {
        name: itemName,
        price: parseFloat(itemPrice),
        categoryId: itemCategory || categories?.[0]?.id,
        department: itemDept,
        description: itemDesc,
        isVegetarian: isVeg,
      });
      return res.data;
    },
    onSuccess: () => {
      setIsAddMenuOpen(false);
      setItemName('');
      setItemPrice('');
      setItemDesc('');
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System & Menu Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Configure restaurant profile, culinary menu, staff & Mobile Waiter API</p>
        </div>

        {/* Tab Controls */}
        <div className="bg-gray-200/70 p-1 rounded-xl flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('MENU')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'MENU' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
            }`}
          >
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab('RESTAURANT')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'RESTAURANT' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
            }`}
          >
            Restaurant Profile
          </button>
          <button
            onClick={() => setActiveTab('STAFF')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'STAFF' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
            }`}
          >
            Staff & Roles
          </button>
          <button
            onClick={() => setActiveTab('API')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'API' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
            }`}
          >
            Mobile Waiter API
          </button>
        </div>
      </div>

      {/* Tab: Menu Management */}
      {activeTab === 'MENU' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Food & Drinks Catalog</h2>
              <p className="text-xs text-gray-500">Live items served across POS and Waiter app</p>
            </div>
            <button
              onClick={() => setIsAddMenuOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Tax %</th>
                  <th className="px-4 py-3">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {menuItems?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div>{item.name}</div>
                      {item.description && <div className="text-[11px] text-gray-400 font-normal">{item.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] ${
                        item.department === 'BAR' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.department === 'BAR' ? <Wine className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                        {item.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.category?.name}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">${item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{item.taxPercent}%</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAvailabilityMutation.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {item.isAvailable ? 'In Stock (Active)' : 'Sold Out (86ed)'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Restaurant Profile */}
      {activeTab === 'RESTAURANT' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-2xl space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <Building className="w-6 h-6 text-orange-600" />
            <div>
              <h2 className="text-base font-bold text-gray-900">{restaurant?.name || 'Restaurant Smart POS'}</h2>
              <p className="text-xs text-gray-500">Official legal entity & billing header</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-500 block">Restaurant Name</label>
              <input
                type="text"
                readOnly
                value={restaurant?.name || 'Restaurant Smart POS'}
                className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 block">Address</label>
                <input
                  type="text"
                  readOnly
                  value={restaurant?.address || '128 Gourmet Boulevard'}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="text-gray-500 block">Phone</label>
                <input
                  type="text"
                  readOnly
                  value={restaurant?.phone || '+1 (555) 839-2041'}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-500 block">Currency</label>
                <input
                  type="text"
                  readOnly
                  value={restaurant?.currency || 'USD ($)'}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="text-gray-500 block">Tax Rate</label>
                <input
                  type="text"
                  readOnly
                  value={`${restaurant?.taxRate || 10}%`}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="text-gray-500 block">Service Charge</label>
                <input
                  type="text"
                  readOnly
                  value={`${restaurant?.serviceChargeRate || 5}%`}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Staff Accounts */}
      {activeTab === 'STAFF' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Registered Staff & Role Permissions</h2>
              <p className="text-xs text-gray-500">Strict Role-Based Access Control (RBAC) enforced</p>
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffList?.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{s.username}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 font-bold text-[10px] rounded-full">
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Mobile Waiter App Integration API */}
      {activeTab === 'API' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-3xl space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <Smartphone className="w-6 h-6 text-orange-600" />
            <div>
              <h2 className="text-base font-bold text-gray-900">React Native Mobile Waiter API Contract</h2>
              <p className="text-xs text-gray-500">Configured for mobile app connectivity on LAN and production</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-gray-700">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-mono space-y-1">
              <div className="text-gray-400">// Base REST API URL:</div>
              <div className="font-bold text-gray-900">http://&lt;POS-SERVER-IP&gt;:3000/api/v1</div>
              <div className="text-gray-400 mt-2">// Socket.IO Live WebSocket URL:</div>
              <div className="font-bold text-gray-900">ws://&lt;POS-SERVER-IP&gt;:3000/socket.io</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="font-bold text-emerald-900">Authentication & Security</div>
                <p className="text-[11px] text-emerald-800 mt-1">
                  Mobile Waiters authenticate via <code>/api/v1/auth/login</code> and send Bearer tokens.
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="font-bold text-blue-900">Order Idempotency</div>
                <p className="text-[11px] text-blue-800 mt-1">
                  Supports <code>x-idempotency-key</code> header to prevent double orders during network hiccups.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 pt-2">
              Full API documentation is versioned in <code>docs/API.md</code>.
            </p>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {isAddMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Add New Menu Item</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Item Name</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Wagyu Beef Sliders"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="18.50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Department</label>
                  <select
                    value={itemDept}
                    onChange={(e) => setItemDept(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white"
                  >
                    <option value="KITCHEN">Kitchen (Food)</option>
                    <option value="BAR">Bar (Drink)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white"
                >
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Description</label>
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Short description of ingredients..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="veg"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="veg" className="text-gray-700 font-medium">
                  Vegetarian Friendly
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddMenuOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => createItemMutation.mutate()}
                disabled={!itemName || !itemPrice || createItemMutation.isPending}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
              >
                Save Menu Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
