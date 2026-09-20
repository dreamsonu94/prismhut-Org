import { Router } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();

// GET /api/v1/health
router.get('/', async (req, res) => {
  try {
    // Check PostgreSQL connectivity
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      success: true,
      service: 'Restaurant Smart POS API',
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // If peer connection was reset due to idle timeout, attempt reconnect once
    try {
      await (prisma as any).$disconnect?.();
      await prisma.$queryRaw`SELECT 1`;
      return res.json({
        success: true,
        service: 'Restaurant Smart POS API',
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (retryError: any) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Could not connect to PostgreSQL database',
        },
      });
    }
  }
});

export default router;

