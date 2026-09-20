import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { RoleType, OrderStatus } from '@prisma/client';

const router = Router();

// GET /api/v1/reports/sales
router.get('/sales', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]), async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { startDate, endDate, range, exportFormat } = req.query;

    let start: Date;
    let end: Date = new Date();

    if (range === 'today') {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    } else if (range === 'weekly') {
      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'monthly') {
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (startDate) {
      start = new Date(String(startDate));
      if (endDate) end = new Date(String(endDate));
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: start, lte: end },
        status: OrderStatus.COMPLETED,
      },
      include: {
        table: true,
        waiter: { select: { name: true } },
        payments: true,
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
    const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);
    const totalServiceCharge = orders.reduce((sum, o) => sum + o.serviceCharge, 0);
    const netSales = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Daily breakdown
    const dailyMap = new Map<string, { date: string; revenue: number; ordersCount: number }>();
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { date: dateKey, revenue: 0, ordersCount: 0 };
      existing.revenue += order.grandTotal;
      existing.ordersCount += 1;
      dailyMap.set(dateKey, existing);
    }
    const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Category breakdown
    const catMap = new Map<string, { categoryId: string; categoryName: string; quantity: number; totalSales: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const cat = item.menuItem?.category;
        const catId = cat?.id || 'uncategorized';
        const catName = cat?.name || 'General';
        const itemTotal = item.unitPrice * item.quantity;
        const existing = catMap.get(catId) || {
          categoryId: catId,
          categoryName: catName,
          quantity: 0,
          totalSales: 0,
        };
        existing.quantity += item.quantity;
        existing.totalSales += itemTotal;
        catMap.set(catId, existing);
      }
    }
    const categoryBreakdown = Array.from(catMap.values()).map((c) => ({
      ...c,
      totalSales: Math.round(c.totalSales * 100) / 100,
    })).sort((a, b) => b.totalSales - a.totalSales);

    // Payment breakdown
    const payMap = new Map<string, { method: string; count: number; total: number }>();
    for (const order of orders) {
      for (const p of order.payments) {
        const method = p.method;
        const existing = payMap.get(method) || { method, count: 0, total: 0 };
        existing.count += 1;
        existing.total += p.amount;
        payMap.set(method, existing);
      }
    }
    const paymentBreakdown = Array.from(payMap.values()).map((p) => ({
      ...p,
      total: Math.round(p.total * 100) / 100,
    }));

    if (exportFormat === 'csv') {
      let csv = 'Order Number,Date,Table,Waiter,Subtotal,Discount,Tax,Service Charge,Grand Total\n';
      for (const o of orders) {
        csv += `"${o.orderNumber}","${o.createdAt.toISOString()}","${o.table?.tableName || 'Takeaway'}","${o.waiter?.name || 'Staff'}",${o.subtotal},${o.discount},${o.tax},${o.serviceCharge},${o.grandTotal}\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: {
        summary: {
          grossSales: Math.round(totalRevenue * 100) / 100,
          netSales: Math.round(netSales * 100) / 100,
          totalTransactions: orders.length,
          totalOrders: orders.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          totalServiceCharge: Math.round(totalServiceCharge * 100) / 100,
          averageTicket: Math.round(averageOrderValue * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        },
        taxSummary: {
          netSales: Math.round(netSales * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          totalServiceCharge: Math.round(totalServiceCharge * 100) / 100,
        },
        paymentBreakdown,
        categoryBreakdown,
        dailyData,
        orders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          date: o.createdAt,
          tableName: o.table?.tableName || 'Takeaway',
          waiterName: o.waiter?.name || 'Staff',
          subtotal: o.subtotal,
          discount: o.discount,
          tax: o.tax,
          serviceCharge: o.serviceCharge,
          grandTotal: o.grandTotal,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate sales report' },
    });
  }
});

// GET /api/v1/reports/products
router.get('/products', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;

    const items = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          restaurantId,
          status: OrderStatus.COMPLETED,
        },
      },
      _sum: { quantity: true },
      _count: { id: true },
    });

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) } },
      include: { category: true },
    });
    const map = new Map(menuItems.map((m) => [m.id, m]));

    const report = items.map((i) => {
      const m = map.get(i.menuItemId);
      const qty = i._sum.quantity || 0;
      const price = m?.price || 0;
      return {
        id: i.menuItemId,
        name: m?.name || 'Unknown',
        sku: m?.sku || 'N/A',
        category: m?.category.name || 'Uncategorized',
        department: m?.department || 'KITCHEN',
        unitPrice: price,
        unitsSold: qty,
        totalRevenue: Math.round(qty * price * 100) / 100,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate products report' },
    });
  }
});

// GET /api/v1/reports/waiters
router.get('/waiters', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        waiterId: { not: null },
        status: OrderStatus.COMPLETED,
      },
      include: {
        waiter: { select: { id: true, name: true, username: true } },
      },
    });

    const waiterMap = new Map<string, { id: string; name: string; username: string; orderCount: number; revenue: number }>();

    for (const o of orders) {
      if (!o.waiter) continue;
      const existing = waiterMap.get(o.waiter.id) || {
        id: o.waiter.id,
        name: o.waiter.name,
        username: o.waiter.username,
        orderCount: 0,
        revenue: 0,
      };
      existing.orderCount += 1;
      existing.revenue += o.grandTotal;
      waiterMap.set(o.waiter.id, existing);
    }

    const report = Array.from(waiterMap.values()).map((w) => ({
      ...w,
      revenue: Math.round(w.revenue * 100) / 100,
      averageTicket: Math.round((w.revenue / w.orderCount) * 100) / 100,
    })).sort((a, b) => b.revenue - a.revenue);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate waiter report' },
    });
  }
});

// GET /api/v1/reports/payments
router.get('/payments', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;

    const payments = await prisma.payment.findMany({
      where: {
        order: { restaurantId },
        status: 'PAID',
      },
    });

    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      if (!byMethod[p.method]) {
        byMethod[p.method] = { count: 0, total: 0 };
      }
      byMethod[p.method].count += 1;
      byMethod[p.method].total += p.amount;
    }

    const formatted = Object.entries(byMethod).map(([method, data]) => ({
      method,
      count: data.count,
      total: Math.round(data.total * 100) / 100,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch payment report' },
    });
  }
});

export default router;
