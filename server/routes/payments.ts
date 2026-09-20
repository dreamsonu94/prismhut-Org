import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { BillingService } from '../services/billingService.js';
import { PaymentMethod } from '@prisma/client';

const router = Router();

const processPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  referenceNumber: z.string().optional(),
  customerName: z.string().optional(),
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
    const result = await BillingService.processPayment(restaurantId, parseResult.data);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_FAILED', message: error.message || 'Payment processing failed' },
    });
  }
});

export default router;
