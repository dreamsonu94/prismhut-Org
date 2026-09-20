import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { OrderStatus, TableStatus, TicketStatus } from '@prisma/client';

const router = Router();

// GET /api/v1/dashboard/stats
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Orders & Sales for Today
    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });

    const completedTodayOrders = todayOrders.filter((o) => o.status === OrderStatus.COMPLETED);
    const todaySales = completedTodayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const todayOrdersCount = todayOrders.length;
    const pendingOrdersCount = todayOrders.filter((o) =>
      ['DRAFT', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
    ).length;
    const completedOrdersCount = completedTodayOrders.length;
    const cancelledOrdersCount = todayOrders.filter((o) => o.status === OrderStatus.CANCELLED).length;

    // 2. Table Status Breakdown
    const tables = await prisma.table.findMany({ where: { restaurantId } });
    const availableTables = tables.filter((t) => t.status === TableStatus.AVAILABLE).length;
    const occupiedTables = tables.filter((t) => t.status === TableStatus.OCCUPIED).length;
    const reservedTables = tables.filter((t) => t.status === TableStatus.RESERVED).length;

    // 3. KOT Status Breakdown
    const kots = await prisma.kOT.findMany({
      where: {
        order: { restaurantId },
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });
    const pendingKot = kots.filter((k) => k.status === TicketStatus.PENDING).length;
    const preparingKot = kots.filter((k) => k.status === TicketStatus.PREPARING).length;
    const readyKot = kots.filter((k) => k.status === TicketStatus.READY).length;

    // 4. BOT Status Breakdown
    const bots = await prisma.bOT.findMany({
      where: {
        order: { restaurantId },
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });
    const pendingBot = bots.filter((b) => b.status === TicketStatus.PENDING).length;
    const preparingBot = bots.filter((b) => b.status === TicketStatus.PREPARING).length;
    const readyBot = bots.filter((b) => b.status === TicketStatus.READY).length;

    // 5. Hourly Sales for Today (00:00 - 23:00)
    const hourlySales: { hour: string; sales: number; count: number }[] = [];
    for (let h = 8; h <= 23; h++) {
      const hourLabel = `${String(h).padStart(2, '0')}:00`;
      const ordersInHour = completedTodayOrders.filter((o) => {
        const orderHour = new Date(o.createdAt).getHours();
        return orderHour === h;
      });
      const hourTotal = ordersInHour.reduce((s, o) => s + o.grandTotal, 0);
      hourlySales.push({ hour: hourLabel, sales: Math.round(hourTotal * 100) / 100, count: ordersInHour.length });
    }

    // 6. Top Selling Products
    const topOrderItems = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          restaurantId,
          status: { not: OrderStatus.CANCELLED },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductIds = topOrderItems.map((i) => i.menuItemId);
    const topMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: topProductIds } },
      include: { category: true },
    });
    const topMenuMap = new Map(topMenuItems.map((m) => [m.id, m]));

    const topSellingProducts = topOrderItems.map((item) => {
      const menuItem = topMenuMap.get(item.menuItemId);
      return {
        id: item.menuItemId,
        name: menuItem?.name || 'Unknown Item',
        category: menuItem?.category.name || 'General',
        quantity: item._sum.quantity || 0,
        price: menuItem?.price || 0,
        totalSales: Math.round(((menuItem?.price || 0) * (item._sum.quantity || 0)) * 100) / 100,
      };
    });

    // 7. Recent Orders
    const recentOrders = await prisma.order.findMany({
      where: { restaurantId },
      include: {
        table: true,
        waiter: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formattedRecentOrders = recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tableName: o.table ? o.table.tableName : 'Takeaway',
      waiterName: o.waiter ? o.waiter.name : 'Unassigned',
      amount: o.grandTotal,
      status: o.status,
      time: o.createdAt,
    }));

    return res.json({
      success: true,
      data: {
        overview: {
          todaySales: Math.round(todaySales * 100) / 100,
          todayOrders: todayOrdersCount,
          pendingOrders: pendingOrdersCount,
          completedOrders: completedOrdersCount,
          cancelledOrders: cancelledOrdersCount,
        },
        tables: {
          available: availableTables,
          occupied: occupiedTables,
          reserved: reservedTables,
          total: tables.length,
        },
        tickets: {
          pendingKot,
          preparingKot,
          readyKot,
          pendingBot,
          preparingBot,
          readyBot,
        },
        charts: {
          hourlySales,
          topSellingProducts,
        },
        recentOrders: formattedRecentOrders,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to calculate dashboard statistics' },
    });
  }
});

export default router;
