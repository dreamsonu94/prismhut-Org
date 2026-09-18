import express from 'express';
import http from 'http';
import path from 'path';
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

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/restaurant_pos?pgbouncer=true';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'restaurant_pos_secret_key_jwt_2026_super_secure';
}

async function startServer() {
  await ensureDatabase();

  const app = express();
  const PORT = 3000;
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
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API v1 Routes
  app.use('/api/v1/health', healthRouter);
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
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred on the server',
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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================`);
    console.log(`🚀 RESTAURANT SMART POS SERVER RUNNING`);
    console.log(`📡 URL: http://0.0.0.0:${PORT}`);
    console.log(`🔌 Socket.IO: Initialized`);
    console.log(`🗄️ Database: PostgreSQL on 127.0.0.1:5432`);
    console.log(`=============================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
