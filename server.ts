import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initSocketIO } from './server/socket/index.js';
import authRouter from './server/routes/auth.js';
import tablesRouter from './server/routes/tables.js';
import menuRouter from './server/routes/menu.js';
import ordersRouter from './server/routes/orders.js';
import kotRouter from './server/routes/kot.js';
import botRouter from './server/routes/bot.js';
import paymentsRouter from './server/routes/payments.js';
import invoicesRouter from './server/routes/invoices.js';
import usersRouter from './server/routes/users.js';
import dashboardRouter from './server/routes/dashboard.js';
import reportsRouter from './server/routes/reports.js';
import settingsRouter from './server/routes/settings.js';
import healthRouter from './server/routes/health.js';

import { ensureDatabase } from './server/db/database.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Ensure JWT_SECRET is available
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'Sx+do8nvsU5Zgj8dg8yyxoI1KFoUF06v6e4+hvKgwrsIT74UcTMIZEkrWfl+mkbRJKkLGtkt1QqJTNgxD7CVQQ==';
}

// Production safety verification: ensure essential secrets are configured
if (isProduction) {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is required in production for Supabase PostgreSQL.');
    process.exit(1);
  }
} else {
  // Development fallbacks
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/restaurant_pos?pgbouncer=true';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'restaurant_pos_secret_key_jwt_2026_super_secure';
  }
}

async function startServer() {
  await ensureDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  initSocketIO(httpServer);

  // Global Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Production-ready CORS configuration
  const rawOrigins = process.env.CORS_ORIGINS || process.env.CLIENT_URL || '';
  const allowedOrigins: string[] = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // If specific allowed origins are configured, validate against them
        if (allowedOrigins.length > 0) {
          if (allowedOrigins.includes('*')) {
            // In production, reflect specific origin rather than wildcard '*' with credentials
            return callback(null, isProduction ? origin : true);
          }
          if (allowedOrigins.includes(origin)) {
            return callback(null, origin);
          }
          return callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
        }

        // Development fallback or default origin reflection (safe with credentials)
        return callback(null, origin);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
    })
  );
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Root & API Health Checks
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  // API v1 Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/tables', tablesRouter);
  app.use('/api/v1/menu', menuRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/kot', kotRouter);
  app.use('/api/v1/bot', botRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/invoices', invoicesRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/settings', settingsRouter);

  // Global Error Handler for API
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Avoid logging sensitive internal errors or leaking credentials
    if (!isProduction) {
      console.error('Unhandled API Error:', err);
    } else {
      console.error('Unhandled API Error:', err?.name || 'Error');
    }

    const statusCode = err.status || err.statusCode || 500;
    // In production, mask internal server error details to prevent leaking database structure or secrets
    const safeMessage = isProduction && statusCode >= 500
      ? 'An unexpected error occurred on the server'
      : (err.message || 'An unexpected error occurred on the server');

    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: safeMessage,
      },
    });
  });

  // Vite Integration (Middleware in Dev, Static serving in Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          success: false,
          service: 'Restaurant Smart POS API',
          message: 'Endpoint not found. API routes are available under /api/v1/*',
        });
      }
    });
  }

  const HOST = process.env.HOST || '0.0.0.0';
  httpServer.listen(PORT, HOST, () => {
    console.log(`=============================================`);
    console.log(`🚀 RESTAURANT SMART POS SERVER RUNNING`);
    console.log(`📡 URL: http://${HOST}:${PORT}`);
    console.log(`🔌 Socket.IO: Initialized`);
    console.log(`🗄️ Database: PostgreSQL (Supabase Connected)`);
    console.log(`=============================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
