import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { emitEvent } from '../socket/index.js';
import { TicketStatus } from '@prisma/client';

const router = Router();

// GET /api/v1/kot
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, active } = req.query;

    const where: any = {};
    if (status) {
      where.status = status as TicketStatus;
    } else if (active === 'true') {
      where.status = { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] };
    }

    const kots = await prisma.kOT.findMany({
      where,
      include: {
        items: true,
        order: {
          include: {
            table: true,
            waiter: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return res.json({
      success: true,
      data: kots,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch KOTs' },
    });
  }
});

// GET /api/v1/kot/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const kot = await prisma.kOT.findUnique({
      where: { id },
      include: {
        items: true,
        order: {
          include: {
            table: true,
            waiter: true,
          },
        },
      },
    });

    if (!kot) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'KOT not found' },
      });
    }

    return res.json({ success: true, data: kot });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch KOT' },
    });
  }
});

const updateKotStatus = async (id: string, newStatus: TicketStatus, res: any) => {
  try {
    const updated = await prisma.kOT.update({
      where: { id },
      data: { status: newStatus },
      include: {
        items: true,
        order: {
          include: {
            table: true,
            waiter: true,
          },
        },
      },
    });

    emitEvent('kot.updated', updated);

    // If all items ready, update order status as well
    if (newStatus === TicketStatus.READY) {
      const order = await prisma.order.findUnique({
        where: { id: updated.orderId },
        include: { kots: true, bots: true },
      });
      if (order) {
        const allTicketsReadyOrServed = [...order.kots, ...order.bots].every(
          (t) => t.status === TicketStatus.READY || t.status === TicketStatus.SERVED
        );
        if (allTicketsReadyOrServed) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'READY' },
          });
          emitEvent('order.updated', { id: order.id, status: 'READY' });
        }
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: `Failed to update KOT to ${newStatus}` },
    });
  }
};

// POST /api/v1/kot/:id/accept
router.post('/:id/accept', requireAuth, async (req, res) => {
  return updateKotStatus(req.params.id, TicketStatus.ACCEPTED, res);
});

// POST /api/v1/kot/:id/start
router.post('/:id/start', requireAuth, async (req, res) => {
  return updateKotStatus(req.params.id, TicketStatus.PREPARING, res);
});

// POST /api/v1/kot/:id/ready
router.post('/:id/ready', requireAuth, async (req, res) => {
  return updateKotStatus(req.params.id, TicketStatus.READY, res);
});

// POST /api/v1/kot/:id/served
router.post('/:id/served', requireAuth, async (req, res) => {
  return updateKotStatus(req.params.id, TicketStatus.SERVED, res);
});

// PUT /api/v1/kot/:id/status & PATCH /api/v1/kot/:id/status
const updateKotStatusDirect = async (req: AuthenticatedRequest, res: any) => {
  const { status } = req.body;
  if (!status || !Object.values(TicketStatus).includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: `Status must be one of: ${Object.values(TicketStatus).join(', ')}` },
    });
  }
  return updateKotStatus(req.params.id, status as TicketStatus, res);
};

router.put('/:id/status', requireAuth, updateKotStatusDirect);
router.patch('/:id/status', requireAuth, updateKotStatusDirect);

export default router;
