# RESTAURANT SMART POS — PRODUCTION MOBILE WAITER APP (PHASE 21)

## 1. Overview
The **Restaurant Smart POS Waiter App** is a cross-platform (iOS / Android / Web Preview) mobile terminal purpose-built for restaurant waitstaff to take fast table-side orders, review items, track kitchen/bar dispatch in real-time, and request bills without manual refreshes.

---

## 2. Production Architecture

```
Mobile Waiter App (Expo / React Native)
       │
       │ HTTPS REST (/api/v1) & WSS (/socket.io)
       ▼
Render Backend API (Node.js / Express)
       │
       │ Connection Pool (Prisma)
       ▼
Supabase PostgreSQL Database
```

- **Production REST API**: `https://prismhut-org.onrender.com/api/v1`
- **Production Socket.IO Server**: `https://prismhut-org.onrender.com` (Path: `/socket.io`)
- **Direct Database Access**: **STRICTLY BLOCKED**. The mobile client interacts exclusively through authenticated HTTPS REST endpoints and Socket.IO.

---

## 3. Directory & File Structure

```
/mobile
├── package.json               # Mobile dependencies (Expo ~52, React Native 0.76.6, Socket.IO client)
├── app.json                   # Expo app configuration (Restaurant Smart POS — Waiter)
├── tsconfig.json              # TypeScript strict configuration with @/ alias
├── app/                       # Expo Router protected routes
│   ├── _layout.tsx            # Global Providers (Auth, Network, Socket, Cart) + Stack
│   ├── index.tsx              # Session check & conditional router redirect
│   ├── login.tsx              # Waiter Login Screen (POST /api/v1/auth/login)
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Bottom Tab Bar (Dashboard, Tables, Orders, Profile)
│   │   ├── index.tsx          # Shift metrics, floor occupancy, active KOT counts
│   │   ├── tables.tsx         # Interactive floor plan, section filters, table status
│   │   ├── orders.tsx         # Live kitchen/bar orders tracking (ACTIVE / READY / COMPLETED)
│   │   └── profile.tsx        # Waiter profile, venue context, live network diagnostics, logout
│   ├── table/[id].tsx         # Table details, guest count selector, start new order
│   ├── menu/[tableId].tsx     # Menu catalog with search, category tabs, quantity counters
│   ├── cart/[tableId].tsx     # Fast cart review, kitchen notes, and idempotent order submission
│   └── order/[id].tsx         # Order details, live KOT/BOT progress timeline, invoice receipt modal
└── src/
    ├── api/
    │   └── client.ts          # Unified HTTP client with JWT interceptor & idempotency headers
    ├── constants/
    │   ├── config.ts          # Environment URLs and app storage keys
    │   └── theme.ts           # Color palette, spacing, and typography tokens
    ├── context/
    │   ├── AuthContext.tsx    # JWT persistence, session verification & RBAC
    │   ├── CartContext.tsx    # Cart state, modifiers, line calculations & guest count
    │   ├── NetworkContext.tsx # Offline/online state detection & heartbeat probe
    │   └── SocketContext.tsx  # Socket.IO client with auto-reconnect & event subscriptions
    ├── services/
    │   ├── authService.ts     # Login & profile operations
    │   ├── tableService.ts    # Tables & status updates
    │   ├── menuService.ts     # Categories & menu item retrieval
    │   ├── orderService.ts    # Order creation, item append & cancellation
    │   └── invoiceService.ts  # Invoices & receipt lookup
    ├── storage/
    │   └── tokenStorage.ts    # Secure cross-platform token storage
    ├── types/
    │   └── index.ts           # Full TypeScript definitions matching backend Prisma schema
    └── components/
        ├── common/            # Header, Button, Input, StatusBadge, NetworkBanner, Skeletons
        ├── tables/            # TableCard, TableStatusPickerModal
        ├── menu/              # CategoryTabs, MenuItemCard
        └── orders/            # OrderCard, KotStatusTracker, InvoiceModal
```

---

## 4. API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/auth/login` | `POST` | Authenticate waiter and retrieve JWT token |
| `/api/v1/auth/me` | `GET` | Validate session and load waiter profile |
| `/api/v1/auth/logout` | `POST` | Revoke session |
| `/api/v1/tables` | `GET` | Fetch all tables and active orders |
| `/api/v1/tables/:id` | `GET` | Fetch individual table details |
| `/api/v1/tables/:id/status` | `PATCH` | Update table status (`AVAILABLE`, `OCCUPIED`, `CLEANING`, etc.) |
| `/api/v1/menu/categories` | `GET` | Fetch menu categories |
| `/api/v1/menu/items` | `GET` | Fetch menu items with category/search/department filters |
| `/api/v1/orders` | `GET` | Fetch orders with status filters |
| `/api/v1/orders` | `POST` | Create order with **`x-idempotency-key`** header and atomic KOT/BOT generation |
| `/api/v1/orders/:id` | `GET` | Fetch order details, items, tickets, and payments |
| `/api/v1/orders/:id/items` | `POST` | Append additional items to existing open order |
| `/api/v1/orders/:id/cancel` | `POST` | Cancel order and void tickets |
| `/api/v1/invoices` | `GET` | Fetch invoices for bill viewing |
| `/api/v1/invoices/:id` | `GET` | Fetch itemized bill details |
| `/api/v1/health` | `GET` | Backend health check and connectivity heartbeat |

---

## 5. Real-Time Socket.IO Integration

- **Path**: `/socket.io`
- **Events Subscribed**:
  - `order.created`: Automatically updates floor tables and live order lists.
  - `order.updated`: Synchronizes order status changes (`PREPARING`, `READY`, `SERVED`, `COMPLETED`).
  - `kot.created` / `kot.updated`: Updates live kitchen progress badges and item statuses.
  - `bot.created` / `bot.updated`: Updates bar ticket progress badges.
  - `table.updated`: Re-renders table occupancy, section assignments, and current statuses.
  - `payment.completed`: Triggers invoice generation and order completion states.

---

## 6. Strict Idempotency Implementation

To eliminate double orders caused by spotty restaurant Wi-Fi:
1. When **"SEND TO KITCHEN"** is tapped, the submit button is instantly locked.
2. A unique UUIDv4 key is generated and embedded in the `x-idempotency-key` HTTP header and the request body.
3. If a network timeout occurs and the waiter retries, the exact same key is passed.
4. The production backend recognizes the replay and returns `{ isDuplicate: true, order }` without re-creating tickets.
