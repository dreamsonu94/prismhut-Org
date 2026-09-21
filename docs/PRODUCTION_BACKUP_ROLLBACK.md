# Restaurant Smart POS — Production Backup & Rollback Protocol

This document establishes the verified operational procedures for backing up and rolling back all components of the Restaurant Smart POS production infrastructure.

---

## Architecture Overview

| Layer | Provider | Production Endpoint / Identifier | Backup & State Management |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | `https://prismhut-org.vercel.app` | Git commit-pinned immutable deployment hashes |
| **Backend API** | Render | `https://prismhut-org.onrender.com` | Docker image & commit deployment rollback |
| **Database** | Supabase | Managed PostgreSQL (Transaction Pooler port 6543) | Daily automated snapshots + WAL PITR |

---

## 1. Database Backup & Disaster Recovery (Supabase PostgreSQL)

### 1.1 Automated Managed Backups
- **Daily Snapshots**: Supabase performs automated full logical/physical daily backups of the production database cluster.
- **Retention**: Standard retention holds rolling 7-day to 30-day restore windows depending on project tier.
- **Point-in-Time Recovery (PITR)**: Write-Ahead Logs (WAL) are streamed continuously, enabling recovery down to the exact second prior to an incident or erroneous schema migration.

### 1.2 Manual Pre-Deployment Logical Backup
Before running schema changes or batch operations on production, execute a logical export of the database:

```bash
# Dump complete schema and table data using PostgreSQL connection string
pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  --file="backup_$(date +%Y%m%d_%H%M%S).sql"

# Alternatively, dump data-only to preserve existing table DDL:
pg_dump "$DATABASE_URL" --data-only --file="data_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### 1.3 Database Restore Procedure

#### Scenario A: Point-In-Time Rollback via Supabase Dashboard
1. Log in to the [Supabase Console](https://supabase.com/dashboard).
2. Select the Restaurant Smart POS production project.
3. Navigate to **Project Settings** > **Database** > **Backups**.
4. Choose **Point in Time** or select the latest automated daily snapshot.
5. Specify the target restore timestamp (e.g. 5 minutes before the issue occurred).
6. Click **Restore Project**. Database will perform an in-place restore and notify upon completion.

#### Scenario B: Manual Restore from Logical SQL Backup
If restoring from a local SQL dump file:

```bash
# Terminate active client connections if necessary and restore:
psql "$DIRECT_URL" -f "backup_YYYYMMDD_HHMMSS.sql"
```

---

## 2. Backend Rollback Protocol (Render Web Service)

### 2.1 Instant Rollback via Render Dashboard
1. Open the [Render Dashboard](https://dashboard.render.com).
2. Select the `prismhut-org` web service.
3. In the left navigation, click **Events** or **Deploys**.
4. Identify the last verified healthy deployment (with tag or commit hash prior to failure).
5. Click the three dots (`...`) next to the healthy deployment.
6. Select **Rollback to this deploy**.
7. Render immediately re-routes traffic to the previous healthy container image without re-triggering a cold rebuild.

### 2.2 CLI / Git Rollback
If deploying via Git push:

```bash
# Revert the faulty commit locally
git revert HEAD --no-edit

# Push to trigger automated zero-downtime redeploy on Render
git push origin main
```

---

## 3. Frontend Rollback Protocol (Vercel)

### 3.1 Instant Production Traffic Re-point
Every Vercel deployment creates a permanent, immutable URL (e.g. `prismhut-org-<hash>.vercel.app`).

1. Navigate to the [Vercel Dashboard](https://vercel.com).
2. Select the `prismhut-org` project.
3. Go to the **Deployments** tab.
4. Locate the last confirmed operational production deployment.
5. Click the three dots (`...`) and choose **Instant Rollback** (or click into deployment and select **Promote to Production**).
6. Traffic on `https://prismhut-org.vercel.app` immediately points to the selected deployment within ~300ms without rebuild delays.

---

## 4. Emergency Incident Checklist

1. **Verify Health**:
   - Backend health endpoint: `GET https://prismhut-org.onrender.com/api/v1/health`
   - Frontend live status: `GET https://prismhut-org.vercel.app/`
2. **Review Logs**:
   - Render application logs (`GET /api/v1/health` and stderr streams)
   - Vercel runtime function and analytics logs
   - Supabase Postgres logs under **Database Logs**
3. **Notify Staff**:
   - Issue notification to Floor Managers and Cashiers if offline operation is required.
   - Waiters continue to access POS UI via cached PWA shell while real-time WebSocket reconnects.
