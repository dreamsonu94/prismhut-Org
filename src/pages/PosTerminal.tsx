import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { MenuItem, MenuCategory, TableItem } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Utensils,
  Wine,
  Leaf,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export const PosTerminal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'KITCHEN' | 'BAR'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegOnly, setVegOnly] = useState<boolean>(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>(searchParams.get('tableId') || '');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [discountCode, setDiscountCode] = useState<string>('');

  // Post-order success banner
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<any>(null);

  // Fetch Menu Items
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const res = await api.get('/menu/items');
      return res.data?.data as MenuItem[];
    },
  });

  // Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: async () => {
      const res = await api.get('/menu/categories');
      return res.data?.data as MenuCategory[];
    },
  });

  // Fetch Tables
  const { data: tablesRaw } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await api.get('/tables');
      return res.data?.data;
    },
  });

  const tablesData: TableItem[] = useMemo(() => {
    if (Array.isArray(tablesRaw)) return tablesRaw;
    if (Array.isArray(tablesRaw?.tables)) return tablesRaw.tables;
    return [];
  }, [tablesRaw]);

  useEffect(() => {
    const tId = searchParams.get('tableId');
    if (tId) setSelectedTableId(tId);
  }, [searchParams]);

  // Add Item to Cart
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((ci) => {
          if (ci.menuItem.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((ci) => (ci.menuItem.id === itemId ? { ...ci, notes } : ci))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.menuItem.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderNotes('');
    setDiscountCode('');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const tax = Math.round(
    cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity * (item.menuItem.taxPercent / 100), 0) * 100
  ) / 100;
  const serviceCharge = orderType === 'DINE_IN' ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  const grandTotal = Math.round((subtotal + tax + serviceCharge) * 100) / 100;

  // Submit Order Mutation (With Idempotency Key!)
  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = uuidv4();
      const payload = {
        tableId: orderType === 'DINE_IN' ? selectedTableId || undefined : undefined,
        guestCount,
        orderType,
        items: cart.map((ci) => ({
          menuItemId: ci.menuItem.id,
          quantity: ci.quantity,
          notes: ci.notes || undefined,
        })),
        notes: orderNotes || undefined,
        discountCode: discountCode || undefined,
        idempotencyKey,
      };

      const res = await api.post('/orders', payload, {
        headers: {
          'x-idempotency-key': idempotencyKey,
        },
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setLastSubmittedOrder(data.order);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kot'] });
      queryClient.invalidateQueries({ queryKey: ['bot'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Filtered menu items
  const filteredItems = (menuData || []).filter((item) => {
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (departmentFilter !== 'ALL' && item.department !== departmentFilter) return false;
    if (vegOnly && !item.isVegetarian) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-100">
      {/* Left Column: Menu Catalog (60-65% width) */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        {/* Search, Departments & Filters Bar */}
        <div className="p-3 md:p-4 bg-white border-b border-gray-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food, cocktails, beverages, SKU..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Department Quick Filter */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setDepartmentFilter('ALL')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  departmentFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDepartmentFilter('KITCHEN')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  departmentFilter === 'KITCHEN' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Kitchen</span>
              </button>
              <button
                onClick={() => setDepartmentFilter('BAR')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  departmentFilter === 'BAR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-700'
                }`}
              >
                <Wine className="w-3.5 h-3.5" />
                <span>Bar</span>
              </button>
            </div>

            {/* Veg toggle */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                vegOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>Veg Only</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              All Categories
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-3 md:p-4 overflow-y-auto">
          {isMenuLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-gray-500">
              Loading menu catalog...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-gray-400">
              <Utensils className="w-8 h-8 text-gray-300 mb-2" />
              <span>No menu items match current search or filters</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white rounded-2xl border border-gray-200 p-3 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer flex flex-col justify-between group active:scale-98 select-none"
                >
                  <div>
                    {/* Image / Department Badge */}
                    <div className="relative h-24 rounded-xl overflow-hidden bg-gray-100 mb-2.5">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {item.department === 'BAR' ? (
                            <Wine className="w-8 h-8 text-indigo-300" />
                          ) : (
                            <Utensils className="w-8 h-8 text-amber-300" />
                          )}
                        </div>
                      )}

                      {/* Tag Department */}
                      <span className={`absolute top-2 left-2 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs ${
                        item.department === 'BAR'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {item.department}
                      </span>

                      {/* Veg indicator */}
                      {item.isVegetarian && (
                        <span className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 p-1 rounded-full shadow-xs">
                          <Leaf className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-gray-900 text-xs leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                    {item.description && (
                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Price & Add Button */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm font-black text-gray-900">
                      ${item.price.toFixed(2)}
                    </span>
                    <button className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Order Cart & Submission (35-40% width) */}
      <div className="w-full lg:w-96 bg-white flex flex-col justify-between shrink-0 shadow-xl z-10">
        {/* Order Setup Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Active Order Ticket</h3>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="text-xs text-red-600 hover:text-red-700 font-semibold disabled:opacity-40"
            >
              Clear Cart
            </button>
          </div>

          {/* Dine in vs Takeaway */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-200/70 rounded-xl">
            <button
              onClick={() => setOrderType('DINE_IN')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                orderType === 'DINE_IN' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Dine-in Table
            </button>
            <button
              onClick={() => setOrderType('TAKEAWAY')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                orderType === 'TAKEAWAY' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Takeaway / Direct
            </button>
          </div>

          {/* Table & Guest Count Selector */}
          {orderType === 'DINE_IN' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Assigned Table
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 bg-white border border-gray-300 rounded-xl font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select table...</option>
                  {tablesData?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tableNumber} - {t.tableName} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Guests
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs py-2 px-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 divide-y divide-gray-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 py-12">
              <Utensils className="w-8 h-8 text-gray-300 mb-2" />
              <span>Your order ticket is empty</span>
              <span className="text-[11px] text-gray-400 mt-1">Tap items from the menu to add</span>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.menuItem.id} className="pt-2 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        item.menuItem.department === 'BAR' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.menuItem.department}
                      </span>
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {item.menuItem.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      ${item.menuItem.price.toFixed(2)} each
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-gray-900">
                      ${(item.menuItem.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Notes Input */}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItemNotes(item.menuItem.id, e.target.value)}
                    placeholder="Item notes (e.g. no ice, extra spicy)"
                    className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 flex-1 text-gray-700 focus:bg-white focus:outline-none"
                  />

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.menuItem.id, -1)}
                      className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItem.id, 1)}
                      className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.menuItem.id)}
                      className="w-6 h-6 rounded-md text-red-500 hover:bg-red-50 flex items-center justify-center ml-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Order Calculations & Submit */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/80 space-y-3">
          {/* General Notes or Discount */}
          <div className="flex gap-2">
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="General table/kitchen instructions..."
              className="w-full text-[11px] px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl"
            />
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Promo code"
              className="w-24 uppercase text-[11px] px-2 py-1.5 bg-white border border-gray-200 rounded-xl"
            />
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (VAT/GST):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between">
                <span>Service Charge (5%):</span>
                <span>${serviceCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-gray-900 pt-1.5 border-t border-gray-200">
              <span>Grand Total:</span>
              <span className="text-orange-600">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Critical KOT/BOT Notice */}
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />
            <span>Food routes to KOT (Kitchen) & Drinks to BOT (Bar) automatically.</span>
          </div>

          {/* Action Button */}
          <button
            onClick={() => submitOrderMutation.mutate()}
            disabled={
              cart.length === 0 ||
              submitOrderMutation.isPending ||
              (orderType === 'DINE_IN' && !selectedTableId)
            }
            className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition-all"
          >
            {submitOrderMutation.isPending ? (
              <span>Submitting to Database & Tickets...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirm & Send to Kitchen / Bar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Post Submission Success Notification Modal */}
      {lastSubmittedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Order Sent Successfully!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Order #{lastSubmittedOrder.orderNumber} recorded in PostgreSQL with atomic tickets.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Order Number:</span>
                <span className="font-bold">{lastSubmittedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Table:</span>
                <span className="font-semibold">{lastSubmittedOrder.table?.tableName || 'Takeaway'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Grand Total:</span>
                <span className="font-extrabold text-orange-600">${lastSubmittedOrder.grandTotal.toFixed(2)}</span>
              </div>

              {/* Tickets generated */}
              <div className="pt-2 border-t border-gray-200 space-y-1">
                {lastSubmittedOrder.kots?.map((k: any) => (
                  <div key={k.id} className="flex justify-between text-emerald-700 font-semibold">
                    <span>🍳 Kitchen KOT Generated:</span>
                    <span>{k.kotNumber}</span>
                  </div>
                ))}
                {lastSubmittedOrder.bots?.map((b: any) => (
                  <div key={b.id} className="flex justify-between text-indigo-700 font-semibold">
                    <span>🍸 Bar BOT Generated:</span>
                    <span>{b.botNumber}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setLastSubmittedOrder(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold"
              >
                Take Another Order
              </button>
              <button
                onClick={() => navigate('/kitchen')}
                className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold"
              >
                View in KDS Kitchen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
