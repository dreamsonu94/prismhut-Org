# Production Deployment Checklist & Infrastructure Guide

**Restaurant Smart POS** — Enterprise Production Architecture & Deployment Playbook.

---

## 1. Production Architecture Overview

The system operates on a high-availability, decoupled production architecture:

| Component | Technology | Production Host | Ingress / Port |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | Unified Container / Vercel Edge CDN | HTTPS (443) |
| **Backend API** | Node.js, Express, Socket.IO | Cloud Run / Render / Container | Port 3000 (`HOST 0.0.0.0`) |
| **Database** | PostgreSQL | Supabase Managed Cloud DB | Port 6543 (Pooler) / 5432 (Direct) |
| **ORM / Migrations** | Prisma ORM v5.22.0 | Automated CI/CD | Controlled additive migrations (`prisma migrate deploy`) |

---

## 2. Prerequisites

Before initiating production deployment, verify:
- [ ] Active PostgreSQL database instance (Supabase or AWS RDS) with SSL enabled.
- [ ] Direct connection URI (`DIRECT_URL`) and Connection Pooler URI (`DATABASE_URL` with `?pgbouncer=true`).
- [ ] Cryptographic 64+ character secret for JWT signing (`JWT_SECRET`).
- [ ] Verified Node.js runtime environment (>= 20.0.0).
- [ ] Automated database backup taken before running schema changes.

---

## 3. Production Environment Variables

Configure these variables strictly within the deployment platform's secret manager (Render, Cloud Run, Vercel, Railway). **Never commit actual values to git.**

### Backend & Database (Server-Only Secrets)
```env
# Database connection pooler (Supavisor / PgBouncer on port 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct database connection for running Prisma migrations (port 5432)
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Production JWT secret key (64+ characters)
JWT_SECRET="replace_with_a_secure_random_64_character_string_for_production"

# CORS configuration: comma-separated list of allowed frontend origins (No wildcards with credentials)
CORS_ORIGINS="https://pos.myrestaurant.com"
CLIENT_URL="https://pos.myrestaurant.com"

# Server runtime settings
NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"
```

### Frontend Client (Vite Injected at Build Time)
```env
# Production API Base URL (relative '/api/v1' for unified container, or absolute for split domains)
VITE_API_BASE_URL="https://prismhut-org.onrender.com"

# Optional WebSocket URL for Socket.IO
VITE_WS_URL="https://prismhut-org.onrender.com"
```

---

## 4. Database Setup & Prisma Migration

### Production Migration Strategy
In production, database migrations must be **additive, non-destructive, and strictly versioned**.

1. **Pre-Migration Safety Backup**:
   ```bash
   # Export pre-migration logical backup
   pg_dump -h db.[project-ref].supabase.co -U postgres -d postgres -F c -b -v -f "pre-migration-$(date +%Y%m%d_%H%M%S).dump"
   ```

2. **Run Applied Migrations**:
   Execute the official safe migration command in CI/CD or build pipeline:
   ```bash
   npx prisma migrate deploy
   ```
   > **CRITICAL**: Never use `npx prisma db push --force-reset` or `npx prisma migrate reset` in production, as these drop existing restaurant orders, tables, and financial records.

3. **Verify Migration Status**:
   ```bash
   npx prisma migrate status
   ```

---

## 5. Backend Deployment

### Build & Start Commands
- **Build Command**:
  ```bash
  npm install && npx prisma generate && npm run build:server
  ```
- **Start Command**:
  ```bash
  npm start
  ```
  *(Executes `node dist/server.cjs`)*

### Container / Server Configuration
- Port binding: `process.env.PORT || 3000`
- Host binding: `0.0.0.0`
- Health check path: `/health` and `/api/v1/health`
- Graceful shutdown handlers installed for `SIGTERM` and `SIGINT`.

---

## 6. Frontend Deployment

### Unified Container Deployment (Default & Recommended)
Express statically serves `dist/index.html` and assets compiled by `vite build`. All `/api/v1/*` routes take precedence over the SPA catch-all route.

### Split Deployment (e.g. Vercel)
When deploying the frontend to Vercel and backend to Render:
1. Ensure `vercel.json` rewrites `/api/:path*` to the Render backend.
2. Verify `VITE_API_BASE_URL` points to `https://prismhut-org.onrender.com`.
3. Verify Render CORS allows the Vercel domain (`https://*.vercel.app` or custom domain).

---

## 7. CORS Configuration Verification

1. Backend checks `CORS_ORIGINS` / `CLIENT_URL`.
2. When credentials (`Authorization: Bearer <token>`) are enabled, `Access-Control-Allow-Origin: *` is **prohibited** by web standards. The server strictly reflects the authorized origin.
3. Pre-flight `OPTIONS` requests are handled automatically with HTTP 204.

---

## 8. Health Check & Monitoring

### Health Endpoint Specification
```http
GET /api/v1/health
```

**Expected Healthy Response (HTTP 200)**:
```json
{
  "success": true,
  "service": "Restaurant Smart POS API",
  "status": "healthy",
  "database": "connected",
  "latencyMs": 12,
  "uptimeSeconds": 1420,
  "timestamp": "2026-09-21T08:40:00.000Z",
  "version": "1.0.0"
}
```

**Degraded Response (HTTP 503)**:
```json
{
  "success": false,
  "service": "Restaurant Smart POS API",
  "status": "degraded",
  "database": "disconnected",
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Could not connect to PostgreSQL database"
  }
}
```

---

## 9. Production Smoke Testing Checklist

Post-deployment smoke testing must be conducted to certify the deployment:

- [ ] **1. API Health**: Call `/api/v1/health` and verify HTTP 200 with `"database": "connected"`.
- [ ] **2. Auth & RBAC**: Login with each role:
  - `admin` (Alex Harrison)
  - `manager` (Maria Santos)
  - `cashier` (David Kim)
  - `waiter` (Liam Walker)
- [ ] **3. Table Floor**: Verify all tables load real-time status (`AVAILABLE`, `OCCUPIED`, `RESERVED`).
- [ ] **4. POS Ordering**: Open table, select menu items, set modifiers, and submit order.
- [ ] **5. KOT/BOT Generation**: Verify tickets stream to Kitchen Display System (KDS) and Bar Display System (BDS).
- [ ] **6. Kitchen Progress**: Mark ticket items `PREPARING` and `READY`.
- [ ] **7. Billing & Settlement**:
  - Open Cashier / Billing modal.
  - Process cash payment.
  - Process card/QR payment.
  - Verify idempotency header prevents duplicate billing.
- [ ] **8. Receipt & Print**: Preview 80mm thermal receipt, verify tax/service calculations and print preview.
- [ ] **9. Table Release**: Confirm table status flips back to `AVAILABLE` and pending bill clears from active register.
- [ ] **10. Reports & Audit**: Review Daily Sales, Payment Breakdown, and Audit Logs in Reports. Verify CSV export.
- [ ] **11. Session Logout**: Execute logout, verify tokens are cleared, and private routes redirect to `/login`.

---

## 10. Rollback Procedure

### Application Code Rollback
1. **Container / PaaS (Render / Cloud Run)**: Re-deploy the previously tagged stable release or commit SHA.
2. **Frontend (Vercel)**: Instant rollback to previous deployment in project history.

### Database Migration Rollback Strategy
If an additive migration introduces unexpected performance regressions:
1. Revert application code to the prior release version that supports the previous schema state.
2. Run targeted down-migration SQL script created specifically for the migration:
   ```bash
   psql -h db.[project-ref].supabase.co -U postgres -d postgres -f migrations/rollback_<version>.sql
   ```
3. Update `_prisma_migrations` status if needed:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
4. If schema was altered destructively, execute full database restore from the pre-migration snapshot.
