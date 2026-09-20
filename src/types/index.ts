export type RoleType = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN' | 'BAR';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';

export type TicketStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type Department = 'KITCHEN' | 'BAR';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'QR' | 'MIXED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: RoleType;
  restaurant?: {
    id: string;
    name: string;
    currency: string;
    defaultTaxRate?: number;
    serviceChargeRate?: number;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  categoryId: string;
  price: number;
  taxPercent: number;
  imageUrl?: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
  department: Department;
  preparationTime: number;
  category?: {
    id: string;
    name: string;
  };
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  _count?: {
    items: number;
  };
}

export interface TableItem {
  id: string;
  tableNumber: string;
  tableName: string;
  capacity: number;
  status: TableStatus;
  section: { id: string; name: string } | null;
  activeOrder?: {
    id: string;
    orderNumber: string;
    waiterName: string;
    guestCount: number;
    grandTotal: number;
    status: OrderStatus;
    createdAt: string;
    kotStatus: { id: string; number: string; status: TicketStatus }[];
    botStatus: { id: string; number: string; status: TicketStatus }[];
  } | null;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
  tax: number;
  discount: number;
  notes?: string | null;
  department: Department;
  status: TicketStatus;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId?: string | null;
  table?: {
    id: string;
    tableName: string;
    tableNumber: string;
  } | null;
  waiterId?: string | null;
  waiter?: {
    id: string;
    name: string;
    username: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
  guestCount: number;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  grandTotal: number;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
  kots: Ticket[];
  bots: Ticket[];
  payments?: Payment[];
}

export interface TicketItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string | null;
}

export interface Ticket {
  id: string;
  kotNumber?: string;
  botNumber?: string;
  orderId: string;
  tableNumber: string;
  waiterName: string;
  status: TicketStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
  items: TicketItem[];
  order?: {
    id: string;
    orderNumber: string;
    table?: {
      id: string;
      tableName: string;
      tableNumber: string;
    } | null;
  };
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string | null;
  status: PaymentStatus;
  paidAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paidStatus: PaymentStatus;
  customerName: string;
  tableName: string;
  waiterName: string;
  createdAt: string;
  order?: Order;
  restaurant?: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    currency: string;
  };
}
