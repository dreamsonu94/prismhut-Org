# Restaurant Smart POS: Database Backup & Disaster Recovery Guide

This guide details the backup, retention, and disaster recovery procedures for the PostgreSQL database (hosted on Supabase) powering Restaurant Smart POS.

---

## 1. Objectives & Targets

- **Recovery Point Objective (RPO)**: < 1 hour (maximum acceptable data loss in catastrophic event)
- **Recovery Time Objective (RTO)**: < 15 minutes (time required to restore operations)
- **Data Retention**: 30 days of daily automated snapshots; 12 months for monthly financial archives.

---

## 2. Supabase Automated Continuous Backup & PITR

Supabase projects on the Pro tier automatically include **Point-In-Time-Recovery (PITR)**:
- Continuous Write-Ahead Log (WAL) archiving allows restoring the database to any exact second within the retention window.
- Physical snapshots are taken daily and stored securely across multiple availability zones.

### How to Trigger PITR via Supabase Dashboard:
1. Navigate to **Project Settings > Database > Backups**.
2. Select **Point in Time**.
3. Choose the target date and time (UTC) right before the incident or corruption occurred.
4. Click **Restore to this point**.
5. Verification: Supabase provisions a cloned database or rolls back the cluster. Update `DATABASE_URL` if a new replica was spun up.

---

## 3. Logical Backup with `pg_dump`

For independent, off-site storage (e.g. AWS S3, Google Cloud Storage, or secure cold storage), use logical backups via `pg_dump`.

### Taking a Full Logical Backup:
```bash
# Set database credentials securely via environment
export PGPASSWORD="your_supabase_db_password"

# Logical dump with compression, clean DROP IF EXISTS, and custom format
pg_dump \
  -h db.your-project-ref.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F c \
  -b \
  -v \
  -f "backup-smartpos-$(date +%Y%m%d_%H%M%S).dump"
```

### Fast Schema-Only Backup (Pre-Migration):
```bash
pg_dump \
  -h db.your-project-ref.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --schema-only \
  -f "schema-backup-$(date +%Y%m%d).sql"
```

---

## 4. Disaster Recovery & Restoration Procedure

In the event of database corruption or hardware failure:

### Step 1: Put Application in Maintenance Mode (Optional)
Stop active traffic or pause web servers to prevent conflicting transactions during restore.

### Step 2: Restore from Custom Format Dump
```bash
export PGPASSWORD="your_supabase_db_password"

# Restore using pg_restore with clean database drop/recreation
pg_restore \
  -h db.your-project-ref.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v "backup-smartpos-TARGET.dump"
```

### Step 3: Run Database Post-Restore Verification
Run verification queries to ensure all critical tables, indexes, and constraints are healthy:
```bash
npx tsx tests/test-flow.ts
```

Or execute direct SQL verification:
```sql
-- Verify table counts and row parity
SELECT 'users' as tbl, count(*) FROM "User"
UNION ALL
SELECT 'orders', count(*) FROM "Order"
UNION ALL
SELECT 'invoices', count(*) FROM "Invoice"
UNION ALL
SELECT 'payments', count(*) FROM "Payment"
UNION ALL
SELECT 'menu_items', count(*) FROM "MenuItem";
```

### Step 4: Resume Application Traffic
Restart the application container or dev server:
```bash
npm start
```
Check health endpoints:
```bash
curl -f http://localhost:3000/api/v1/health
```

---

## 5. Pre-Migration Mandatory Backup Checklist

Before executing ANY production schema migration (`npx prisma migrate deploy`):

1. **Verify Database Health**: Call `/api/v1/health` and verify zero active lock contentions.
2. **Execute Full Pre-Migration Logical Dump**:
   ```bash
   export PGPASSWORD="$DB_PASSWORD"
   pg_dump \
     -h db.your-project-ref.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -F c -b -v \
     -f "pre-migration-$(date +%Y%m%d_%H%M%S).dump"
   ```
3. **Capture Schema Snapshot**:
   ```bash
   pg_dump -h db.your-project-ref.supabase.co -U postgres -d postgres --schema-only -f "pre-migration-schema-$(date +%Y%m%d).sql"
   ```
4. **Record Current Applied Migration ID**:
   ```bash
   npx prisma migrate status > "migration-status-before-deploy.txt"
   ```

---

## 6. Prisma Migration Rollback Strategy

If a migration fails or causes application regression:

1. **Do NOT run `prisma migrate reset`** (this is destructive).
2. **Determine Failed Migration**:
   ```bash
   npx prisma migrate status
   ```
3. **Execute Targeted Down-Migration Script**:
   Maintain inverse SQL scripts for every forward migration (e.g. `DROP COLUMN ...`, `DROP TABLE ...`).
   ```bash
   psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f "rollback-step.sql"
   ```
4. **Mark Migration as Rolled Back**:
   ```bash
   npx prisma migrate resolve --rolled-back "<migration_name>"
   ```
5. **If In-Flight Data Corruption Occurred**: Restore from the pre-migration snapshot taken in Step 5 using `pg_restore`.

---

## 7. Application Rollback Strategy

When a newly deployed application build exhibits critical bugs:

1. **PaaS / Container Rollback (Render / Cloud Run)**:
   - Go to Deployment History in the provider dashboard.
   - Select the previous stable release commit and click **Rollback / Redeploy**.
   - Deployment completes in < 2 minutes with zero schema disruption.
2. **Frontend Rollback (Vercel)**:
   - Navigate to Deployments tab.
   - Click the triple-dot menu on the previous production deployment and choose **Promote to Production**.
   - Edge CDN instantly switches traffic without cache delay.

---

## 8. Environment Variable Recovery

1. **Version-Controlled Template**: All required configuration keys are tracked in `.env.example`.
2. **Backup of Encrypted Secrets**: Production secrets (`DATABASE_URL`, `JWT_SECRET`, `DIRECT_URL`) must be archived in the enterprise password vault (1Password / AWS Secrets Manager).
3. **Recovery Procedure**:
   - If an environment variable is accidentally modified or deleted in hosting settings:
   - Copy key names from `.env.example`.
   - Retrieve stored values from vault.
   - Update hosting platform variables and trigger a zero-downtime redeploy.

---

## 9. Emergency Disaster Recovery Procedure (Step-by-Step)

In a catastrophic outage (e.g. cloud region failure or database corruption):

```
[Incident Detected]
       ↓
[Step 1: Put System in Maintenance Mode]
  (Display Maintenance screen to avoid partial orders)
       ↓
[Step 2: Assess Database State]
  - Check Supabase Health Dashboard
  - If region loss: Spin up standby database in secondary region
       ↓
[Step 3: Restore Database]
  - Restore latest Daily Snapshot or PITR to 1 minute prior to incident
  - Run `pg_restore` if using off-site backup
       ↓
[Step 4: Update Environment Strings]
  - Update `DATABASE_URL` and `DIRECT_URL` in Cloud Run / Render
       ↓
[Step 5: Run Automated Verification]
  - Execute health check: `GET /api/v1/health`
  - Execute smoke test: `npx tsx tests/test-flow.ts`
       ↓
[Step 6: Deactivate Maintenance & Resume Service]
```

