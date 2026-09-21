/**
 * TypeScript Definitions for Waiter Mobile Application
 * Strict alignment with PostgreSQL / Prisma backend models
 */

export type RoleType =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'WAITER'
  | 'KITCHEN'
  | 'BAR';

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'CLEANING'
  | 'OUT_OF_SERVICE';

export type Department = 'KITCHEN' | 'BAR';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TicketStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'QR'
  | 'MIXED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
  taxRate?: number;
  serviceCharge?: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: RoleType;
  restaurantId?: string;
  restaurant?: Restaurant;
}

export interface TableSection {
  id: string;
  name: string;
  description?: string;
}

export interface ActiveOrderSummary {
  id: string;
  orderNumber: string;
  waiterName?: string;
  guestCount?: number;
  totalAmount?: number;
  grandTotal?: number;
  status: OrderStatus;
  kots?: Array<{ id: string; status: TicketStatus; kotNumber: string }>;
  bots?: Array<{ id: string; status: TicketStatus; botNumber: string }>;
  createdAt?: string;
}

export interface Table {
  id: string;
  tableNumber: string;
  tableName: string;
  capacity: number;
  status: TableStatus;
  sectionId?: string | null;
  section?: TableSection | null;
  activeOrder?: ActiveOrderSummary | null;
}

export interface TablesResponseData {
  tables: Table[];
  sections: TableSection[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
  _count?: {
    items: number;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  taxRate: number;
  preparationTime?: number;
  isAvailable: boolean;
  isVeg: boolean;
  imageUrl?: string | null;
  department: Department;
  categoryId: string;
  category?: MenuCategory;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  notes?: string | null;
  department: Department;
}

export interface KOTItem {
  id: string;
  orderItemId: string;
  quantity: number;
  notes?: string | null;
  menuItem?: MenuItem;
}

export interface KOT {
  id: string;
  kotNumber: string;
  orderId: string;
  status: TicketStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: KOTItem[];
}

export interface BOT {
  id: string;
  botNumber: string;
  orderId: string;
  status: TicketStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: KOTItem[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  serviceCharge: number;
  grandTotal: number;
  createdAt: string;
  customerName?: string | null;
  tableName?: string | null;
  waiterName?: string | null;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId?: string | null;
  table?: Table | null;
  waiterId?: string | null;
  waiter?: { id: string; name: string; username: string } | null;
  guestCount: number;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  taxAmount?: number;
  tax?: number;
  discountAmount?: number;
  discount?: number;
  serviceCharge: number;
  totalAmount?: number;
  grandTotal?: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  kots?: KOT[];
  bots?: BOT[];
  invoices?: Invoice[];
  payments?: Payment[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
