# Production Deployment Guide: Restaurant Smart POS

This document provides exact deployment specifications for the Restaurant Smart POS application, grounded entirely in the project's verified codebase and architecture.

---

## 1. Architecture Overview

- **Frontend**: Single Page Application (React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons)
- **Backend**: Node.js + Express REST API with Socket.IO live updates
- **Database**: PostgreSQL on Supabase managed via Prisma ORM
- **Authentication**: JWT token-based authentication with Role-Based Access Control (RBAC)

---

## 2. Component Specifications

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Build Command**: `npm run build:client` (or `npx vite build`)
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: Base URL for the Express API (e.g. `https://api.yourrestaurant.com/api/v1` or `/api/v1` for unified deployments)
  - `VITE_WS_URL`: (Optional) WebSocket URL for Socket.IO if backend is on an external domain (e.g. `https://api.yourrestaurant.com`)

### Backend
- **Framework**: Node.js with Express 4 & Socket.IO
- **Build Command**: `npm run build:server` (bundles `server.ts` into standalone `dist/server.cjs` via esbuild)
- **Start Command**: `npm start` (executes `node dist/server.cjs`)
- **API Port**: Reads `process.env.PORT` (defaults to `3000`, host `0.0.0.0`)
- **Health Check Endpoints**:
  - `GET /health` (Root health probe for Cloud Run, Render, Kubernetes)
  - `GET /api/v1/health` (Versioned API health probe)
- **Environment Variables**:
  - `DATABASE_URL`: Supabase pooled connection string (Port 6543 with `?pgbouncer=true`)
  - `DIRECT_URL`: (Optional) Supabase direct connection string for running migrations
  - `JWT_SECRET`: 64+ character cryptographic secret for signing authentication tokens
  - `CORS_ORIGINS`: Comma-separated list of allowed frontend origins (e.g. `https://pos.yourrestaurant.com`)
  - `CLIENT_URL`: Primary client domain for CORS reflection
  - `NODE_ENV`: Set to `production`
  - `PORT`: Server listening port (default `3000`)
  - `HOST`: Server listening host (default `0.0.0.0`)

### Database
- **Engine**: PostgreSQL
- **Provider**: Supabase
- **ORM**: Prisma (v5.22.0)
- **Schema Location**: `prisma/schema.prisma`
- **Prisma Generate Command**: `npx prisma generate`
- **Migration / Schema Push Command**: `npx prisma db push`
- **Database Seed Command**: `npx tsx prisma/seed.ts`

---

## 3. Production Environment Variable Checklist

Configure these variables in your hosting provider's environment settings (e.g. Render, Vercel, Cloud Run). **Never commit values to source control.**

```env
# Database (Backend - Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Security & Authentication (Backend)
JWT_SECRET=your_secure_random_64_character_secret_here

# Network & CORS (Backend)
CORS_ORIGINS=https://your-pos-frontend.vercel.app
CLIENT_URL=https://your-pos-frontend.vercel.app
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Frontend Client (Vite)
VITE_API_BASE_URL=https://your-pos-backend.onrender.com/api/v1
VITE_WS_URL=https://your-pos-backend.onrender.com
```

---

## 4. Multi-Platform Deployment Guide

### A. Database (Supabase)
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **Project Settings > Database > Connection Strings**.
3. Copy the **Transaction pooler** URI (port `6543`) for `DATABASE_URL`.
4. URL-encode any special characters in your password (e.g., replace `@` with `%40`, `$` with `%24`).
5. Run the schema push command locally or in CI/CD:
   ```bash
   npx prisma db push
   ```

### B. Backend (Render / Cloud Run)
1. Connect the GitHub repository `dreamsonu94/prismhut-Org` (`main` branch).
2. Configure a **Web Service**:
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build:server`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
3. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGINS`
   - `CLIENT_URL`
   - `NODE_ENV=production`

### C. Frontend (Vercel)
1. Import the repository into Vercel.
2. Select **Vite** framework preset:
   - **Build Command**: `npm run build:client`
   - **Output Directory**: `dist`
3. Add environment variables:
   - `VITE_API_BASE_URL`: `https://your-backend-url.onrender.com/api/v1`
   - `VITE_WS_URL`: `https://your-backend-url.onrender.com`
4. Deploy.

---

## 5. Security & Verification Guardrails

- **Zero Secret Exposure**: The health check endpoint `GET /health` and error handlers strictly mask database strings, passwords, and internal stack traces.
- **Invoice PDF Protection**: `GET /api/v1/invoices/:id/pdf` requires valid Bearer JWT authentication with authorized cashier/admin roles.
- **Excluded Files**: `.env`, `.dev.env.json`, local database clusters (`.pgdata/`), and build output are verified in `.gitignore`.
