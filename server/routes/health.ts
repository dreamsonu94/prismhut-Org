import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/v1/health
router.get('/', async (req, res) => {
  const startTime = Date.now();
  try {
    // Check PostgreSQL connectivity with lightweight query
    await prisma.$queryRaw`SELECT 1 as ping`;
    const latencyMs = Date.now() - startTime;

    return res.json({
      success: true,
      service: 'Restaurant Smart POS API',
      status: 'healthy',
      database: 'connected',
      latencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error: any) {
    logger.databaseFailure('Health Check (SELECT 1)', error);

    // If peer connection was reset due to idle timeout, attempt reconnect once
    try {
      await (prisma as any).$disconnect?.();
      await prisma.$queryRaw`SELECT 1 as ping`;
      const latencyMs = Date.now() - startTime;

      return res.json({
        success: true,
        service: 'Restaurant Smart POS API',
        status: 'healthy',
        database: 'connected',
        latencyMs,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    } catch (retryError: any) {
      logger.databaseFailure('Health Check Reconnect Retry', retryError);

      return res.status(503).json({
        success: false,
        service: 'Restaurant Smart POS API',
        status: 'degraded',
        database: 'disconnected',
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Could not connect to PostgreSQL database',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
});

export default router;

