# Restaurant Smart POS — Complete Production Handover & Operations Guide

## 1. Production Architecture Overview

The Restaurant Smart POS platform is structured across high-availability managed cloud services and client applications:

```
[ Web POS Client (Browser/Desktop) ] ─── HTTPS ───► [ Vercel Edge Network ]
                                                                │
                                                        Static Assets (React 18 SPA)
                                                                │
[ Mobile Waiter App (Expo / React Native) ] ─── HTTPS ───┐     │
                                                          │     │
                                                          ▼     ▼
                                            [ Render Production Backend ]
                                            (Express + Node.js + Socket.IO)
                                                          │
                                         ┌────────────────┴────────────────┐
                                         │                                 │
                                  [ Prisma ORM ]                    [ Socket.IO Engine ]
                                         │                                 │
                                         ▼                                 ▼
                              [ Supabase PostgreSQL ]          Real-time Event Broadcast:
                             (AWS ap-southeast-1 pooler)       (Web POS ↔ KDS/BDS ↔ Mobile)
```

---

## 2. Production Services & Hosting Topology

| Service Component | Target Host / URL | Role & Description |
| :--- | :--- | :--- |
| **Web POS Frontend** | `https://prismhut-org.vercel.app/` | Production Web application hosted on Vercel CDN |
| **Backend REST API** | `https://prismhut-org.onrender.com/api/v1` | Production Express.js microservice hosted on Render |
| **Socket.IO Real-time** | `https://prismhut-org.onrender.com` (Path: `/socket.io`) | WebSocket server for real-time kitchen & order synchronization |
| **Managed Database** | Supabase PostgreSQL (AWS Region: `ap-southeast-1`) | Cloud relational database with PgBouncer connection pooling |
| **Mobile Waiter App** | React Native / Expo SDK 52 (`/mobile`) | Native mobile ordering terminal for restaurant waitstaff |
| **Health Check Probe** | `https://prismhut-org.onrender.com/api/v1/health` | Automated uptime, latency, and DB connectivity probe |

---

## 3. Frontend Deployment (Web POS)

- **Platform**: Vercel
- **Framework Preset**: Vite / React Single Page Application (SPA)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Routing Configuration**: `vercel.json` rewrite routing (`"source": "/(.*)", "destination": "/index.html"`)
- **Key Capabilities**:
  - Point-of-Sale (POS) cashier counter
  - Interactive Table Floor plan
  - Kitchen Display System (KDS)
  - Bar Display System (BDS)
  - Split billing, invoicing, payments, receipt generation
  - Multi-branch analytics and reports

---

## 4. Backend Deployment (Express API & Socket.IO)

- **Platform**: Render (Web Service)
- **Runtime**: Node.js 20+
- **Build Command**: `npm install && npx prisma generate && npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs`
- **Start Command**: `node dist/server.cjs`
- **Networking**:
  - Bound to `0.0.0.0:3000` (Render dynamically maps to port 443 HTTPS)
  - Strict CORS whitelist for Vercel production domain and local test environments

---

## 5. Database Architecture (PostgreSQL / Supabase)

- **Database Engine**: PostgreSQL 15+ hosted on Supabase
- **ORM & Data Access**: Prisma ORM with connection pooling via PgBouncer
- **Connection Strategy**:
  - `DATABASE_URL`: Transaction pooling on port `6543` (for serverless/API request concurrency)
  - `DIRECT_URL`: Session connection on port `5432` (for Prisma schema migrations and administrative operations)
- **Core Entities**:
  - `Restaurant`, `Branch`, `User` (RBAC: `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`, `KITCHEN`, `BAR`, `SUPER_ADMIN`)
  - `Table`, `Section`, `Category`, `MenuItem`, `Modifier`
  - `Order`, `OrderItem`, `Kot`, `KotItem`, `Invoice`, `Payment`

---

## 6. Mobile Waiter Application (`/mobile`)

- **Technology**: React Native `0.76.6`, Expo SDK `52`, Expo Router `v4`
- **Authentication**: JWT token storage with in-memory synchronization (`tokenStorage.ts`) and role gate (`WAITER`, `MANAGER`, `ADMIN`)
- **Key Modules**:
  - `app/login.tsx`: Waiter authentication screen with visual validation
  - `app/(tabs)/index.tsx`: Active waiter dashboard with quick stats and recent orders
  - `app/(tabs)/tables.tsx`: Floor overview with section tabs, occupancy counters, and table action modal
  - `app/menu/[tableId].tsx`: Fast-search category browser, department filtering (Food vs Drinks), item notes
  - `app/cart/[tableId].tsx`: In-memory cart manager, guest counter, idempotency header (`x-idempotency-key`)
  - `app/order/[id].tsx`: Order tracking, kitchen progress timeline, itemized invoice preview
  - `app/(tabs)/orders.tsx`: Multi-status filter tabs (`ACTIVE`, `READY`, `COMPLETED`, `ALL`)
  - `app/(tabs)/profile.tsx`: Staff profile, assigned branch, and secure logout

---

## 7. Real-Time Socket.IO Synchronization

- **Room Partitioning**: Sockets automatically join `restaurant_{restaurantId}` upon authentication
- **Production Event Channels**:
  - `order.created`: Broadcasts new orders immediately to Floor Plan and Active Order lists
  - `order.updated`: Synchronizes order modifications across all connected clients
  - `kot.updated` / `bot.updated`: Pushes kitchen/bar station ticket status (`PENDING` → `IN_PREPARATION` → `READY` → `SERVED`)
  - `table.updated`: Updates occupancy state across Waiter and Web POS floor views
  - `payment.completed`: Triggers automatic table release to `AVAILABLE` on billing settlement

---

## 8. Environment Variables Specification (Names Only)

> **CRITICAL SECURITY NOTE**: Never commit secret values or private keys to repository files.

### Frontend Environment Variables
- `VITE_API_BASE_URL`: Base URL for REST API requests (`https://prismhut-org.onrender.com/api/v1`)
- `VITE_SOCKET_URL`: Base URL for WebSocket connection (`https://prismhut-org.onrender.com`)

### Backend Environment Variables
- `NODE_ENV`: Runtime environment (`production`)
- `PORT`: HTTP server listening port (managed by Render)
- `DATABASE_URL`: Pooled PostgreSQL connection string (port 6543)
- `DIRECT_URL`: Direct PostgreSQL connection string (port 5432)
- `JWT_SECRET`: High-entropy signing secret for JWT access tokens
- `JWT_EXPIRES_IN`: Access token expiration duration (`24h`)
- `CORS_ORIGINS`: Comma-separated allowed frontend origins

---

## 9. Backup & Disaster Recovery Policy

1. **Automated Continuous Backups**:
   - Supabase Point-in-Time Recovery (PITR) retains complete WAL logs for sub-second precision restoration.
2. **Automated Daily Snapshots**:
   - Cloud snapshots retained with standard 7–30 day retention schedules.
3. **Manual Logical Backups (`pg_dump`)**:
   ```bash
   pg_dump "$DIRECT_URL" -F c -b -v -f pos_backup_$(date +%Y%m%d_%H%M%S).dump
   ```
4. **Logical Restore (`pg_restore`)**:
   ```bash
   pg_restore -d "$DIRECT_URL" -v --clean pos_backup_target.dump
   ```

---

## 10. Rollback Procedures

### Frontend (Vercel)
1. Open Vercel Project Dashboard → **Deployments**.
2. Locate the previous verified deployment SHA.
3. Select **Instant Rollback** / **Promote to Production** (< 5 second zero-downtime cutover).

### Backend (Render)
1. Open Render Dashboard → Web Service → **Deploys**.
2. Select previous stable deployment build.
3. Click **Rollback to this deploy**.

### Database (Supabase)
1. Navigate to Supabase Dashboard → **Database** → **Backups**.
2. Select desired recovery timestamp and click **Restore**.

---

## 11. Troubleshooting Guide

| Issue / Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **API returns 502 / Gateway Timeout** | Free-tier cold-start latency | Allow 15–20s for service spin-up or trigger `GET /api/v1/health` |
| **"Offline" banner appears on Mobile App** | Wi-Fi disconnect or device airplane mode | Verify device network connectivity. In-flight cart remains saved |
| **Table state not syncing in real-time** | WebSocket blocked by corporate firewall | Socket client automatically falls back to HTTP long-polling |
| **401 Unauthorized on API calls** | JWT token expired (> 24h) | Mobile app automatically clears stale tokens and routes to login screen |
| **Database connection pool exhaustion** | High concurrent traffic | Ensure `DATABASE_URL` uses PgBouncer pooler port (`6543`) |

---

## 12. Manual Device Testing Checklist

Perform this manual verification on physical Android and iOS hardware prior to staff distribution:

| Test ID | Action / Scenario | Expected Result | Evidence Required | Status |
| :---: | :--- | :--- | :--- | :---: |
| **M01** | **App Installation & Launch** | App starts cleanly, safe-area layout renders correctly | Screen capture / visual check | `PENDING MANUAL TEST` |
| **M02** | **Waiter Login** | Authenticates with waiter credentials; routes to dashboard | Successful login screen | `PENDING MANUAL TEST` |
| **M03** | **Floor Plan & Table Navigation** | Section tabs switch tables; table occupancy colors match Web POS | Visual floor plan matching Web POS | `PENDING MANUAL TEST` |
| **M04** | **Menu Search & Modifiers** | Search filters items; item notes ("no onions") save to cart | Cart item display with note | `PENDING MANUAL TEST` |
| **M05** | **Order Submission** | Order posts with `x-idempotency-key`; returns order number | Order ID confirmation toast | `PENDING MANUAL TEST` |
| **M06** | **KDS / BDS Ticket Sync** | Mobile-submitted order generates KOT on Web KDS and BOT on BDS | Web KDS display showing ticket | `PENDING MANUAL TEST` |
| **M07** | **Real-Time Status Updates** | Advancing item on KDS updates status badge on mobile device | Real-time badge transition to READY | `PENDING MANUAL TEST` |
| **M08** | **Network Disruption Recovery** | Toggling Airplane Mode triggers amber banner; reconnect recovers | Amber banner appears/disappears | `PENDING MANUAL TEST` |
| **M09** | **Billing Settlement** | Settling order on Web POS releases table to AVAILABLE on phone | Table reverts to green/Available | `PENDING MANUAL TEST` |
| **M10** | **Logout & Session Teardown** | Tapping Logout clears stored token and returns to login screen | Login screen displayed | `PENDING MANUAL TEST` |

---

## 13. Known Limitations & Constraints

1. **Native Push Notifications**: Background push notifications (FCM / APNs) require custom native credentials setup; real-time foreground updates are currently handled via WebSocket.
2. **Offline Local Settlement**: Final billing settlement requires cloud connectivity to update ledger records and generate tax-compliant invoices.

---

## 14. Optional Future Enhancements

1. **Bluetooth POS Thermal Printing**: Direct thermal receipt printing over Bluetooth from mobile terminals.
2. **Table QR Code Generation**: Dynamic QR codes printed on physical tables for guest self-ordering.
3. **Multi-Language UI**: Localization support (English, Spanish, French, etc.) across mobile waiter screens.
