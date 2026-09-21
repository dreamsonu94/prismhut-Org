# Production Deployment & Infrastructure Guide

**Restaurant Smart POS** — Enterprise Production Architecture & Deployment Playbook.

---

## 1. Production Architecture Overview

The system operates on a high-availability, decoupled production architecture:

| Component | Technology | Target Host | Port / Ingress |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | Vercel Edge CDN | HTTPS (443) |
| **Backend API** | Node.js, Express, Socket.IO | Render Web Service | Port 3000 / $PORT (`HOST 0.0.0.0`) |
| **Database** | PostgreSQL | Supabase Managed Cloud DB | Port 6543 (Pooler) / 5432 (Direct) |
| **ORM / Client** | Prisma ORM v5.22.0 | Automated CI/CD | Controlled additive migrations |

---

## 2. Environment Variable Matrix

| Variable Name | Required | Target Platform | Purpose | Example / Placeholder |
| :--- | :---: | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Backend (Render) | PostgreSQL connection pooler (port 6543 / PgBouncer) | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | **Yes** | Backend (Render) | Direct DB connection for Prisma migrations (port 5432) | `postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres` |
| `JWT_SECRET` | **Yes** | Backend (Render) | Cryptographic signing key for Auth JWT tokens (64+ chars) | `replace_with_a_secure_random_64_character_string_for_production` |
| `CORS_ORIGIN` | **Yes** | Backend (Render) | Allowed frontend URL for CORS & Socket.IO handshake | `https://YOUR-VERCEL-FRONTEND-URL` |
| `CORS_ORIGINS` | Optional | Backend (Render) | Comma-separated list if multiple domains are allowed | `https://YOUR-VERCEL-FRONTEND-URL,https://waiter.yourdomain.com` |
| `CLIENT_URL` | Optional | Backend (Render) | Alias for frontend origin | `https://YOUR-VERCEL-FRONTEND-URL` |
| `NODE_ENV` | **Yes** | Backend (Render) | Production runtime mode | `production` |
| `PORT` | Optional | Backend (Render) | Server port (Render automatically provides $PORT) | `3000` |
| `HOST` | Optional | Backend (Render) | Server host binding | `0.0.0.0` |
| `VITE_API_BASE_URL` | **Yes** | Frontend (Vercel) | Backend API Base URL | `https://YOUR-RENDER-BACKEND-URL` |
| `VITE_WS_URL` | Optional | Frontend (Vercel) | Socket.IO WebSocket Server URL (defaults to backend origin) | `https://YOUR-RENDER-BACKEND-URL` |

> ⚠️ **CRITICAL SECURITY RULE**: Never put `DATABASE_URL`, `DIRECT_URL`, or `JWT_SECRET` into Vercel or any client-side configuration.

---

## 3. Database Setup & Supabase Configuration

1. **Create Supabase Project**:
   - Go to [Supabase](https://supabase.com), create or open your project in your target cloud region.
2. **Retrieve Connection Strings**:
   - **Database Settings -> Connection string -> URI**:
     - Mode: **Transaction** (Port 6543) -> Copy this as `DATABASE_URL` with `?pgbouncer=true`.
     - Mode: **Session** (Port 5432) -> Copy this as `DIRECT_URL`.
3. **Run Prisma Migrations**:
   ```bash
   npx prisma migrate deploy
   ```
   *(Or `npx prisma db push` if initializing a clean schema)*
4. **Seed Database (Initial Roles & Admin Account)**:
   ```bash
   node dist/scripts/seed.cjs
   ```
   *(Creates Super Admin, Admin, Manager, Cashier, Waiter, Kitchen, Bar roles, sections, tables, and menu)*

---

## 4. Backend Deployment (Render)

1. **Create Web Service**:
   - Sign in to [Render Dashboard](https://dashboard.render.com).
   - Click **New -> Web Service** and connect your Git repository.
2. **Service Settings**:
   - **Name**: `restaurant-pos-api` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose the region closest to your Supabase PostgreSQL instance.
   - **Branch**: `main` (or production branch)
   - **Root Directory**: Leave blank (repo root)
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build:server
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
     *(Runs `node dist/server.cjs`)*
3. **Add Environment Variables in Render**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your Supabase transaction pooler URL)*
   - `DIRECT_URL`: *(Your Supabase direct connection URL)*
   - `JWT_SECRET`: *(Your 64+ char random secret)*
   - `CORS_ORIGIN`: `https://YOUR-VERCEL-FRONTEND-URL`
4. **Deploy & Note Generated Backend URL**:
   - Click **Create Web Service**. Once Render creates and provisions the service, it will assign your unique backend URL (e.g. `https://<your-service-name>.onrender.com`).
   - Copy this assigned URL to configure `VITE_API_BASE_URL` and `VITE_WS_URL` in Vercel.

---

## 5. Frontend Deployment (Vercel)

1. **Import Project into Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com).
   - Click **Add New -> Project** and import your Git repository.
2. **Project Configuration**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (repo root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Add Environment Variables in Vercel**:
   - `VITE_API_BASE_URL`: `https://YOUR-RENDER-BACKEND-URL`
   - `VITE_WS_URL`: `https://YOUR-RENDER-BACKEND-URL`
4. **Deploy**:
   - Click **Deploy**.
   - Note your Vercel URL (e.g. `https://restaurant-pos.vercel.app`).
5. **CORS Loop Closure**:
   - Return to your **Render** backend service environment settings.
   - Set `CORS_ORIGIN` to your exact Vercel URL:
     ```env
     CORS_ORIGIN=https://restaurant-pos.vercel.app
     ```
   - Save changes (Render will automatically redeploy with the updated CORS whitelist).

---

## 6. API Cutover Checklist

- [ ] **Step 1: Backend Health Check**
  Verify backend API is responsive and database is connected:
  ```bash
  curl -i https://YOUR-RENDER-BACKEND-URL/api/v1/health
  ```
  Expected: HTTP 200 with `{"status":"healthy","database":"connected"}`.

- [ ] **Step 2: CORS Pre-Flight Verification**
  Test OPTIONS pre-flight from your Vercel domain:
  ```bash
  curl -i -X OPTIONS https://YOUR-RENDER-BACKEND-URL/api/v1/health \
    -H "Origin: https://YOUR-VERCEL-FRONTEND-URL" \
    -H "Access-Control-Request-Method: GET"
  ```
  Expected: HTTP 204 or 200 with `Access-Control-Allow-Origin: https://YOUR-VERCEL-FRONTEND-URL` and `Access-Control-Allow-Credentials: true`.

- [ ] **Step 3: Frontend API Connection**
  Open the frontend application in the browser and check Developer Tools Console:
  - No CORS errors.
  - WebSocket connection established (`[Socket.IO] Connected to POS live server`).

- [ ] **Step 4: Authentication Verification**
  - Sign in as Admin (`admin` / `admin123`).
  - Verify JWT token is stored securely and sent in `Authorization: Bearer <token>` header.

---

## 7. Production Smoke Testing Suite

Post-cutover verification steps across all POS roles and business workflows:

1. **API Health & DB Latency**: Verify `/api/v1/health` responds under 100ms.
2. **Role & RBAC Security**:
   - Admin (`admin`): Full dashboard, menu management, reports, audit logs.
   - Manager (`manager`): Table floor, orders, KDS, BDS, billing, reports.
   - Cashier (`cashier`): Orders, bill settlement, receipt printing. Denied access to audit logs and user management.
   - Waiter (`waiter`): Table seating, POS ordering, KOT/BOT submission. Denied access to payment settlement and invoice cancellation.
3. **Table Floor & Real-Time Sync**:
   - Change table status or seat guests. Verify Socket.IO updates floor plan across open tabs without browser refresh.
4. **POS Ordering Flow**:
   - Create a dine-in order for Table 1.
   - Add items from Kitchen and Bar categories.
   - Submit order.
5. **KDS & BDS Routing**:
   - Verify food items appear on Kitchen Display System (KDS).
   - Verify beverage items appear on Bar Display System (BDS).
   - Advance ticket status: `ACCEPTED` -> `PREPARING` -> `READY`.
6. **Billing & Payment Settlement**:
   - Open billing modal for the occupied table.
   - Apply discount/tax verification.
   - Settle payment via Cash / Card / QR / Bank Transfer.
   - Confirm atomic transaction: payment is recorded, invoice is generated, and table is automatically released (`AVAILABLE`).
   - Confirm duplicate settlement is rejected via idempotency check.
7. **80mm Thermal Receipt Generation**:
   - Open print receipt preview. Verify formatted 80mm thermal receipt layout with restaurant logo, tax breakdown, and footer.
8. **Reports & Audit Trail**:
   - Open Reports dashboard. Verify today's sales and payment breakdowns reflect settled transactions.
   - Download CSV export.
   - Check Audit Trail for recorded actions (`ORDER_CREATED`, `PAYMENT_PROCESSED`, `ORDER_CANCELLED`).

---

## 8. Rollback Plan

### Fast Application Rollback (< 2 minutes)
- **Vercel (Frontend)**: In the Vercel Dashboard, go to **Deployments**, find the previous stable deployment, click **... -> Instant Rollback**.
- **Render (Backend)**: In the Render Dashboard, go to **Events / Deploys**, select the previous build, and click **Rollback to this deploy**.

### Database Rollback Strategy
- Before applying any production schema migrations, take a logical backup via Supabase Dashboard (**Database -> Backups**) or pg_dump:
  ```bash
  pg_dump -h db.[project-ref].supabase.co -U postgres -d postgres -F c -b -v -f "pre-deploy-backup.dump"
  ```
- If an additive migration must be reverted, apply the corresponding down-migration script or restore the snapshot.
