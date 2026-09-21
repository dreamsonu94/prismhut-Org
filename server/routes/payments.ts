import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { BillingService } from '../services/billingService.js';
import { PaymentMethod } from '@prisma/client';
import { logger } from '../utils/logger.js';

const router = Router();

const processPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  referenceNumber: z.string().optional(),
  customerName: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

// GET /api/v1/payments
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, method, date } = req.query;

    const where: any = {};
    if (orderId) where.orderId = String(orderId);
    if (method) where.method = method as PaymentMethod;
    if (date) {
      const start = new Date(String(date));
      start.setHours(0, 0, 0, 0);
      const end = new Date(String(date));
      end.setHours(23, 59, 59, 999);
      where.paidAt = { gte: start, lte: end };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: {
          include: {
            table: true,
            waiter: { select: { id: true, name: true } },
            invoices: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 100,
    });

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve payments' },
    });
  }
});

// POST /api/v1/payments
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = processPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message },
      });
    }

    const restaurantId = req.user!.restaurantId;
    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) || parseResult.data.idempotencyKey;

    const result = await BillingService.processPayment(restaurantId, {
      ...parseResult.data,
      idempotencyKey,
    });

    const statusCode = result.isDuplicate ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      data: result,
      payment: result.payment,
      invoice: result.invoice,
      order: result.updatedOrder,
      table: result.updatedOrder?.table,
      receipt: result.invoice,
      ...(result.isDuplicate && { message: 'Order was already settled' }),
    });
  } catch (error: any) {
    logger.paymentFailure(req.body?.orderId, req.body?.amount, error, {
      method: req.body?.method,
      idempotencyKey: (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey,
    });
    if (error.code === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: error.message || 'Order not found' },
      });
    }
    if (error.code === 'INVALID_AMOUNT') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: error.message || 'Invalid payment amount' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_FAILED', message: error.message || 'Payment processing failed' },
    });
  }
});

export default router;
