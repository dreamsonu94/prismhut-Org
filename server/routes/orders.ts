import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { OrderService } from '../services/orderService.js';
import { emitEvent } from '../socket/index.js';
import { OrderStatus, TableStatus, RoleType } from '@prisma/client';

const router = Router();

const createOrderItemSchema = z.object({
  menuItemId: z.string().min(1, 'menuItemId is required'),
  quantity: z.number().int().positive('Quantity must be >= 1'),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  guestCount: z.number().int().positive().optional().default(1),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).optional().default('DINE_IN'),
  items: z.array(createOrderItemSchema).min(1, 'Must include at least one item'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
  discountCode: z.string().optional(),
});

// GET /api/v1/orders
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { status, tableId, date, unpaid, startDate, endDate, search } = req.query;

    const where: any = { restaurantId };
    if (unpaid === 'true') {
      where.status = { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] };
      where.payments = { none: { status: 'PAID' } };
    } else if (status) {
      where.status = status as OrderStatus;
    }
    if (tableId) where.tableId = String(tableId);

    if (startDate && endDate) {
      const start = new Date(String(startDate));
      start.setHours(0, 0, 0, 0);
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else if (date) {
      const start = new Date(String(date));
      start.setHours(0, 0, 0, 0);
      const end = new Date(String(date));
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    if (search) {
      const s = String(search).trim();
      where.OR = [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { table: { tableName: { contains: s, mode: 'insensitive' } } },
        { table: { tableNumber: { contains: s, mode: 'insensitive' } } },
        { waiter: { name: { contains: s, mode: 'insensitive' } } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { invoices: { some: { invoiceNumber: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
        customer: true,
        items: { include: { menuItem: true } },
        kots: { select: { id: true, kotNumber: true, status: true } },
        bots: { select: { id: true, botNumber: true, status: true } },
        payments: true,
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch orders' },
    });
  }
});

// POST /api/v1/orders
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message },
      });
    }

    // Header or body idempotency key
    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) || parseResult.data.idempotencyKey;

    const restaurantId = req.user!.restaurantId;
    const waiterId = req.user!.id;

    const result = await OrderService.createOrder(restaurantId, {
      ...parseResult.data,
      idempotencyKey,
      waiterId,
    });

    return res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      data: {
        order: result.order,
        isDuplicate: result.isDuplicate,
      },
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'ORDER_CREATION_FAILED', message: error.message || 'Failed to create order' },
    });
  }
});

// GET /api/v1/orders/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
        customer: true,
        items: { include: { menuItem: true } },
        kots: { include: { items: true } },
        bots: { include: { items: true } },
        payments: true,
        invoices: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    return res.json({ success: true, data: order });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve order' },
    });
  }
});

// PUT /api/v1/orders/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, guestCount } = req.body;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(guestCount !== undefined && { guestCount: Number(guestCount) }),
      },
      include: {
        table: true,
        waiter: true,
        items: { include: { menuItem: true } },
        kots: true,
        bots: true,
      },
    });

    emitEvent('order.updated', updated);

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update order' },
    });
  }
});

// POST /api/v1/orders/:id/submit & POST /api/v1/orders/:id/send
const submitOrderHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMED },
      include: {
        table: true,
        waiter: true,
        items: { include: { menuItem: true } },
      },
    });

    emitEvent('order.updated', updated);

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to submit order' },
    });
  }
};

router.post('/:id/submit', requireAuth, submitOrderHandler);
router.post('/:id/send', requireAuth, submitOrderHandler);

// POST /api/v1/orders/:id/items (Add items to active order)
const addItemsSchema = z.object({
  items: z.array(createOrderItemSchema).min(1, 'Must include at least one item to add'),
});

router.post('/:id/items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const parseResult = addItemsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message },
      });
    }

    const updatedOrder = await OrderService.addItemsToOrder(
      id,
      parseResult.data.items,
      req.user?.id
    );

    return res.status(200).json({
      success: true,
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error('Add items error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'ADD_ITEMS_FAILED', message: error.message || 'Failed to add items to order' },
    });
  }
});

// POST /api/v1/orders/:id/cancel
router.post(
  '/:id/cancel',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    if (order.status === OrderStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: { code: 'ORDER_ALREADY_COMPLETED', message: 'Completed and settled orders cannot be cancelled.' },
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        error: { code: 'ORDER_ALREADY_CANCELLED', message: 'Order is already cancelled.' },
      });
    }

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // Cancel order
      const o = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { table: true },
      });

      // Cancel KOTs and BOTs
      await tx.kOT.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      });

      await tx.bOT.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      });

      // Free table if dine-in
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      await tx.auditLog.create({
        data: {
          restaurantId: order.restaurantId,
          userId: req.user?.id,
          action: 'ORDER_CANCELLED',
          entity: 'ORDER',
          entityId: id,
          details: JSON.stringify({ orderNumber: order.orderNumber }),
        },
      });

      return o;
    });

    emitEvent('order.updated', cancelledOrder);
    if (order.tableId) {
      const tbl = await prisma.table.findUnique({ where: { id: order.tableId } });
      emitEvent('table.updated', tbl);
    }

    return res.json({ success: true, data: cancelledOrder });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to cancel order' },
    });
  }
});

export default router;
