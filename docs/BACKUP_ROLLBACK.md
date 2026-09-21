# Restaurant Smart POS — Production Backup & Rollback Runbook

This guide contains the non-destructive backup procedures, recovery protocols, and zero-downtime rollback actions for the Restaurant Smart POS production environment.

---

## 1. System Components & Deployment Architecture

```
Web POS (Vercel Edge) ──► Express API (Render) ──► Supabase PostgreSQL (AWS)
                                  │
                          Socket.IO Realtime
                                  │
                       Mobile Waiter App (Expo)
```

---

## 2. Environment Variables & Required Secrets (Names Only)

> **SAFETY MANDATE**: Never commit raw credentials, tokens, or private keys to git.

### Web POS (Vercel)
- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`

### Backend Service (Render)
- `NODE_ENV`
- `PORT`
- `DATABASE_URL` (Pooled connection, port 6543)
- `DIRECT_URL` (Direct connection, port 5432)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`

### Mobile Waiter App (Expo / Standalone)
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SOCKET_URL`

---

## 3. Database Backup & Disaster Recovery Protocols

### A. Point-in-Time Recovery (PITR)
- Supabase automatically captures continuous Write-Ahead Logs (WAL) in AWS `ap-southeast-1`.
- In the Supabase Dashboard, navigate to **Database** → **Backups** to restore the database to any specific second within the retention window.

### B. Manual Logical Backup (`pg_dump`)
Run a logical snapshot prior to any administrative database operations:
```bash
# Export schema and data to custom format dump
pg_dump "$DIRECT_URL" -F c -b -v -f "restaurant_pos_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### C. Database Restoration Procedure (`pg_restore`)
```bash
# Restore from logical dump file
pg_restore -d "$DIRECT_URL" -v --clean "restaurant_pos_backup_YYYYMMDD_HHMMSS.dump"
```

---

## 4. Zero-Downtime Rollback Runbooks

### A. Frontend Rollback (Vercel)
1. Open the Vercel Dashboard → Select **restaurant-smart-pos**.
2. Go to **Deployments**.
3. Locate the previous known-good deployment commit SHA.
4. Click the three dots (`...`) → **Instant Rollback** or **Promote to Production**.
5. *Result*: Traffic switches immediately at the edge (< 5 seconds).

### B. Backend Rollback (Render)
1. Open the Render Dashboard → Select the Web Service (`prismhut-org`).
2. Go to the **Deploys** tab.
3. Locate the previous stable build.
4. Click **Rollback to this deploy**.
5. *Result*: Render starts the previous container image and shifts traffic upon passing the health check (`/api/v1/health`).

### C. Mobile Waiter App Rollback Strategy
1. **Over-The-Air (OTA) Updates**: If using Expo EAS Update (`eas update`), publish a rollback update to the `production` channel:
   ```bash
   eas update:republish --group <STABLE_UPDATE_GROUP_ID>
   ```
2. **Native Binary Rollback**: If a breaking native issue occurs, increment version/build number, rebuild the stable commit, and release to Google Play / TestFlight.

---

## 5. Production Health Monitoring & Alerts

1. **API Health Endpoint**: `https://prismhut-org.onrender.com/api/v1/health`
   - Expected status: `200 OK`
   - Payload: `{"status":"ok","db":"connected"}`
2. **Uptime Monitoring**: Configure a ping probe (e.g. UptimeRobot or BetterStack) against the health check endpoint at 5-minute intervals to prevent cold starts.
