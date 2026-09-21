/**
 * Waiter Ordering Cart Context
 * Handles item selections, modifiers, guest counts, and totals calculation.
 */
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { CartItem, MenuItem } from '../types';

interface CartContextType {
  tableId: string | null;
  guestCount: number;
  orderNotes: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  setTableContext: (tableId: string | null, guestCount?: number) => void;
  setGuestCount: (count: number) => void;
  setOrderNotes: (notes: string) => void;
  addItem: (item: MenuItem, notes?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateItemNotes: (menuItemId: string, notes: string) => void;
  getItemQuantity: (menuItemId: string) => number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tableId, setTableId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [items, setItems] = useState<CartItem[]>([]);

  const setTableContext = useCallback((id: string | null, count: number = 1) => {
    setTableId((prev) => {
      // If switching to a new table, clear previous cart
      if (prev && id && prev !== id) {
        setItems([]);
        setOrderNotes('');
      }
      return id;
    });
    setGuestCount(count > 0 ? count : 1);
  }, []);

  const addItem = useCallback((menuItem: MenuItem, notes?: string) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.menuItem.id === menuItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
          notes: notes !== undefined ? notes : updated[existingIndex].notes,
        };
        return updated;
      }
      return [...prev, { menuItem, quantity: 1, notes: notes || '' }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menuItem.id !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.menuItem.id !== menuItemId);
      }
      return prev.map((i) =>
        i.menuItem.id === menuItemId ? { ...i, quantity } : i
      );
    });
  }, []);

  const updateItemNotes = useCallback((menuItemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((i) => (i.menuItem.id === menuItemId ? { ...i, notes } : i))
    );
  }, []);

  const getItemQuantity = useCallback(
    (menuItemId: string): number => {
      const found = items.find((i) => i.menuItem.id === menuItemId);
      return found ? found.quantity : 0;
    },
    [items]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setOrderNotes('');
  }, []);

  const { itemCount, subtotal, taxAmount, total } = useMemo(() => {
    let count = 0;
    let sub = 0;
    let tax = 0;

    items.forEach((item) => {
      count += item.quantity;
      const lineSubtotal = item.menuItem.price * item.quantity;
      sub += lineSubtotal;
      const rate = (item.menuItem.taxRate || 0) / 100;
      tax += lineSubtotal * rate;
    });

    return {
      itemCount: count,
      subtotal: sub,
      taxAmount: tax,
      total: sub + tax,
    };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        tableId,
        guestCount,
        orderNotes,
        items,
        itemCount,
        subtotal,
        taxAmount,
        total,
        setTableContext,
        setGuestCount,
        setOrderNotes,
        addItem,
        removeItem,
        updateQuantity,
        updateItemNotes,
        getItemQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
};
