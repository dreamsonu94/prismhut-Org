import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { emitEvent } from '../socket/index.js';
import { RoleType, TableStatus } from '@prisma/client';

const router = Router();

const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required'),
  tableName: z.string().min(1, 'Table name is required'),
  capacity: z.number().int().positive().default(4),
  sectionId: z.string().optional().nullable(),
  status: z.nativeEnum(TableStatus).optional().default(TableStatus.AVAILABLE),
});

// GET /api/v1/tables
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;

    const tables = await prisma.table.findMany({
      where: { restaurantId },
      include: {
        section: true,
        orders: {
          where: {
            status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'SERVED'] },
          },
          include: {
            waiter: { select: { id: true, name: true } },
            items: { include: { menuItem: true } },
            kots: true,
            bots: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    // Structure table response with active order details
    const formattedTables = tables.map((tbl) => {
      const activeOrder = tbl.orders[0] || null;
      return {
        id: tbl.id,
        tableNumber: tbl.tableNumber,
        tableName: tbl.tableName,
        capacity: tbl.capacity,
        status: tbl.status,
        section: tbl.section ? { id: tbl.section.id, name: tbl.section.name } : null,
        activeOrder: activeOrder
          ? {
              id: activeOrder.id,
              orderNumber: activeOrder.orderNumber,
              waiterName: activeOrder.waiter?.name || 'Unassigned',
              guestCount: activeOrder.guestCount,
              grandTotal: activeOrder.grandTotal,
              status: activeOrder.status,
              createdAt: activeOrder.createdAt,
              kotStatus: activeOrder.kots.map((k) => ({ id: k.id, number: k.kotNumber, status: k.status })),
              botStatus: activeOrder.bots.map((b) => ({ id: b.id, number: b.botNumber, status: b.status })),
            }
          : null,
      };
    });

    const sections = await prisma.tableSection.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: {
        tables: formattedTables,
        sections,
      },
    });
  } catch (error: any) {
    console.error('Fetch tables error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve tables' },
    });
  }
});

// POST /api/v1/tables
router.post('/', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = createTableSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message },
      });
    }

    const restaurantId = req.user!.restaurantId;
    const { tableNumber, tableName, capacity, sectionId, status } = parseResult.data;

    const existing = await prisma.table.findFirst({
      where: { restaurantId, tableNumber },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `Table number '${tableNumber}' already exists` },
      });
    }

    const table = await prisma.table.create({
      data: {
        restaurantId,
        tableNumber,
        tableName,
        capacity,
        sectionId: sectionId || null,
        status: status || TableStatus.AVAILABLE,
      },
      include: { section: true },
    });

    emitEvent('table.updated', table);

    return res.status(201).json({
      success: true,
      data: table,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create table' },
    });
  }
});

// GET /api/v1/tables/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        section: true,
        orders: {
          where: {
            status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'SERVED'] },
          },
          include: {
            waiter: { select: { id: true, name: true } },
            items: { include: { menuItem: true } },
            kots: { include: { items: true } },
            bots: { include: { items: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Table not found' },
      });
    }

    return res.json({
      success: true,
      data: table,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch table details' },
    });
  }
});

// PUT /api/v1/tables/:id
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { tableName, tableNumber, capacity, sectionId, status } = req.body;

    const updated = await prisma.table.update({
      where: { id },
      data: {
        ...(tableName && { tableName }),
        ...(tableNumber && { tableNumber }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(sectionId !== undefined && { sectionId }),
        ...(status && { status }),
      },
      include: { section: true },
    });

    emitEvent('table.updated', updated);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update table' },
    });
  }
});

// PUT /api/v1/tables/:id/status & PATCH /api/v1/tables/:id/status
const updateTableStatusHandler = async (req: AuthenticatedRequest, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(TableStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Status must be one of: ${Object.values(TableStatus).join(', ')}` },
      });
    }

    const updated = await prisma.table.update({
      where: { id },
      data: { status },
      include: { section: true },
    });

    emitEvent('table.updated', updated);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update table status' },
    });
  }
};

router.put('/:id/status', requireAuth, updateTableStatusHandler);
router.patch('/:id/status', requireAuth, updateTableStatusHandler);

// DELETE /api/v1/tables/:id
router.delete('/:id', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.table.delete({ where: { id } });

    emitEvent('table.updated', { id, deleted: true });

    return res.json({
      success: true,
      data: { message: 'Table deleted successfully' },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete table' },
    });
  }
});

export default router;
