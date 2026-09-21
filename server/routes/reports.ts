import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { RoleType, OrderStatus, PaymentStatus } from '@prisma/client';

const router = Router();

/**
 * Calculates start and end timestamps for standard and custom date ranges
 */
export function getDateRange(range?: string, startDateStr?: string, endDateStr?: string) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'last7days':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisweek': {
      const day = now.getDay();
      // Monday as week start (if Sunday day === 0, go back 6 days)
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'thismonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'lastmonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;

    case 'custom':
      if (startDateStr) {
        start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setHours(0, 0, 0, 0);
      }
      if (endDateStr) {
        end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }
      break;

    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

// 1. GET /api/v1/reports/dashboard - Master KPI overview
router.get(
  '/dashboard',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      // Aggregations on COMPLETED orders (Revenue rule: COMPLETED + PAID)
      const completedAgg = await prisma.order.aggregate({
        where: {
          restaurantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
        _sum: {
          grandTotal: true,
          subtotal: true,
          tax: true,
          serviceCharge: true,
          discount: true,
        },
        _count: { id: true },
      });

      // CANCELLED orders in period
      const cancelledCount = await prisma.order.count({
        where: {
          restaurantId,
          status: OrderStatus.CANCELLED,
          createdAt: { gte: start, lte: end },
        },
      });

      // REFUNDED payments in period
      const refundedCount = await prisma.payment.count({
        where: {
          order: { restaurantId },
          status: PaymentStatus.REFUNDED,
          paidAt: { gte: start, lte: end },
        },
      });

      const totalOrders = completedAgg._count.id || 0;
      const grossSales = Math.round((completedAgg._sum.grandTotal || 0) * 100) / 100;
      const netSales = Math.round((completedAgg._sum.subtotal || 0) * 100) / 100;
      const totalTax = Math.round((completedAgg._sum.tax || 0) * 100) / 100;
      const totalServiceCharge = Math.round((completedAgg._sum.serviceCharge || 0) * 100) / 100;
      const totalDiscount = Math.round((completedAgg._sum.discount || 0) * 100) / 100;
      const averageOrderValue =
        totalOrders > 0 ? Math.round((grossSales / totalOrders) * 100) / 100 : 0;

      // Payments breakdown by method
      const paymentAgg = await prisma.payment.groupBy({
        by: ['method'],
        where: {
          order: {
            restaurantId,
            status: OrderStatus.COMPLETED,
          },
          status: PaymentStatus.PAID,
          paidAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      const payMap: Record<string, { count: number; total: number }> = {
        CASH: { count: 0, total: 0 },
        CARD: { count: 0, total: 0 },
        QR: { count: 0, total: 0 },
        BANK_TRANSFER: { count: 0, total: 0 },
      };

      let grandPaymentTotal = 0;
      for (const p of paymentAgg) {
        const m = p.method as string;
        const amt = Math.round((p._sum.amount || 0) * 100) / 100;
        const cnt = p._count.id || 0;
        grandPaymentTotal += amt;
        if (payMap[m]) {
          payMap[m].count += cnt;
          payMap[m].total += amt;
        } else {
          payMap[m] = { count: cnt, total: amt };
        }
      }

      grandPaymentTotal = Math.round(grandPaymentTotal * 100) / 100;

      const paymentBreakdown = Object.entries(payMap).map(([method, data]) => {
        const pct =
          grandPaymentTotal > 0
            ? Math.round((data.total / grandPaymentTotal) * 1000) / 10
            : 0;
        return {
          method,
          count: data.count,
          total: Math.round(data.total * 100) / 100,
          percentage: pct,
        };
      });

      // Orders for hourly & daily sales trend
      const completedOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
        select: {
          createdAt: true,
          grandTotal: true,
        },
      });

      // Hourly breakdown (00:00 to 23:00)
      const hourlyData: Array<{ hour: string; orders: number; sales: number }> = [];
      for (let h = 0; h < 24; h++) {
        const label = `${String(h).padStart(2, '0')}:00`;
        hourlyData.push({ hour: label, orders: 0, sales: 0 });
      }

      const dailyMap = new Map<string, { date: string; orders: number; sales: number }>();

      for (const o of completedOrders) {
        const h = o.createdAt.getHours();
        hourlyData[h].orders += 1;
        hourlyData[h].sales = Math.round((hourlyData[h].sales + o.grandTotal) * 100) / 100;

        const dStr = o.createdAt.toISOString().slice(0, 10);
        const existing = dailyMap.get(dStr) || { date: dStr, orders: 0, sales: 0 };
        existing.orders += 1;
        existing.sales = Math.round((existing.sales + o.grandTotal) * 100) / 100;
        dailyMap.set(dStr, existing);
      }

      const dailySales = Array.from(dailyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      // Top Selling items (completed items only)
      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            restaurantId,
            status: OrderStatus.COMPLETED,
            createdAt: { gte: start, lte: end },
          },
        },
        include: {
          menuItem: {
            include: { category: true },
          },
        },
      });

      const itemSalesMap = new Map<
        string,
        {
          id: string;
          name: string;
          category: string;
          department: string;
          quantity: number;
          grossSales: number;
        }
      >();

      for (const it of orderItems) {
        const id = it.menuItemId;
        const lineTotal = it.unitPrice * it.quantity;
        const existing = itemSalesMap.get(id) || {
          id,
          name: it.menuItem?.name || 'Unknown Item',
          category: it.menuItem?.category?.name || 'General',
          department: it.department,
          quantity: 0,
          grossSales: 0,
        };
        existing.quantity += it.quantity;
        existing.grossSales = Math.round((existing.grossSales + lineTotal) * 100) / 100;
        itemSalesMap.set(id, existing);
      }

      const allTopItems = Array.from(itemSalesMap.values()).map((p) => ({
        ...p,
        avgPrice: p.quantity > 0 ? Math.round((p.grossSales / p.quantity) * 100) / 100 : 0,
      }));

      const topSellingByQty = [...allTopItems]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
      const topSellingByRevenue = [...allTopItems]
        .sort((a, b) => b.grossSales - a.grossSales)
        .slice(0, 10);

      // Waiter performance
      const waiterOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
        include: {
          waiter: { select: { id: true, name: true, username: true } },
        },
      });

      const waiterMap = new Map<
        string,
        { id: string; name: string; ordersCount: number; sales: number }
      >();

      for (const o of waiterOrders) {
        const wId = o.waiter?.id || 'counter';
        const wName = o.waiter?.name || 'Counter / Staff';
        const existing = waiterMap.get(wId) || {
          id: wId,
          name: wName,
          ordersCount: 0,
          sales: 0,
        };
        existing.ordersCount += 1;
        existing.sales = Math.round((existing.sales + o.grandTotal) * 100) / 100;
        waiterMap.set(wId, existing);
      }

      const waiterPerformance = Array.from(waiterMap.values())
        .map((w) => ({
          ...w,
          averageTicket:
            w.ordersCount > 0 ? Math.round((w.sales / w.ordersCount) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.sales - a.sales);

      // Table performance (completed orders only - active unpaid tables excluded from revenue)
      const tables = await prisma.table.findMany({
        where: { restaurantId },
        include: {
          orders: {
            where: {
              status: OrderStatus.COMPLETED,
              createdAt: { gte: start, lte: end },
            },
            select: { id: true, grandTotal: true },
          },
        },
      });

      const tablePerformance = tables
        .map((t) => {
          const count = t.orders.length;
          const rev =
            Math.round(t.orders.reduce((sum, o) => sum + o.grandTotal, 0) * 100) / 100;
          return {
            tableId: t.id,
            tableName: t.tableName,
            tableNumber: t.tableNumber,
            status: t.status,
            ordersCount: count,
            revenue: rev,
            averageBill: count > 0 ? Math.round((rev / count) * 100) / 100 : 0,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      // Cancelled orders report
      const cancelledOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: OrderStatus.CANCELLED,
          createdAt: { gte: start, lte: end },
        },
        include: {
          table: true,
          waiter: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const cancellationReport = cancelledOrders.map((c) => ({
        id: c.id,
        orderNumber: c.orderNumber,
        date: c.createdAt.toISOString().slice(0, 10),
        time: c.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tableName: c.table?.tableName || 'Takeaway',
        amount: c.grandTotal,
        reason: c.notes || 'Cancelled by staff',
        user: c.waiter?.name || 'Staff',
      }));

      return res.json({
        success: true,
        data: {
          period: {
            range: range || 'today',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          summary: {
            grossSales,
            netSales,
            totalOrders,
            averageOrderValue,
            cashSales: payMap.CASH.total,
            cardSales: payMap.CARD.total,
            qrSales: payMap.QR.total,
            transferSales: payMap.BANK_TRANSFER.total,
            totalTax,
            totalServiceCharge,
            totalDiscount,
            completedOrders: totalOrders,
            cancelledOrders: cancelledCount,
            refundedOrders: refundedCount,
          },
          paymentBreakdown,
          grandPaymentTotal,
          hourlySales: hourlyData,
          dailySales,
          topSellingByQty,
          topSellingByRevenue,
          waiterPerformance,
          tablePerformance,
          cancellationReport,
        },
      });
    } catch (error: any) {
      console.error('Reports dashboard error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate reports dashboard' },
      });
    }
  }
);

// 2. GET /api/v1/reports/sales - Detailed Sales Report
router.get(
  '/sales',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate, exportFormat } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
        include: {
          table: true,
          waiter: { select: { name: true } },
          payments: {
            where: { status: PaymentStatus.PAID },
            orderBy: { createdAt: 'desc' },
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let totalSales = 0;
      let totalTax = 0;
      let totalServiceCharge = 0;
      let totalDiscount = 0;
      let netSales = 0;
      let totalCollected = 0;

      const rows = orders.map((o) => {
        totalSales += o.grandTotal;
        totalTax += o.tax;
        totalServiceCharge += o.serviceCharge;
        totalDiscount += o.discount;
        netSales += o.subtotal;

        const inv = o.invoices[0];
        const pay = o.payments[0];
        const payAmount = o.payments.reduce((sum, p) => sum + p.amount, 0);
        totalCollected += payAmount;

        return {
          id: o.id,
          date: o.createdAt.toISOString().slice(0, 10),
          time: o.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          orderNumber: o.orderNumber,
          invoiceNumber: inv?.invoiceNumber || 'N/A',
          tableName: o.table?.tableName || 'Takeaway',
          server: o.waiter?.name || 'Staff',
          cashier: inv?.waiterName || 'Cashier Desk',
          subtotal: o.subtotal,
          discount: o.discount,
          tax: o.tax,
          serviceCharge: o.serviceCharge,
          grandTotal: o.grandTotal,
          paymentMethod: inv?.paymentMethod || pay?.method || 'CASH',
          paymentStatus: 'PAID',
          paidAmount: payAmount || o.grandTotal,
        };
      });

      totalSales = Math.round(totalSales * 100) / 100;
      totalTax = Math.round(totalTax * 100) / 100;
      totalServiceCharge = Math.round(totalServiceCharge * 100) / 100;
      totalDiscount = Math.round(totalDiscount * 100) / 100;
      netSales = Math.round(netSales * 100) / 100;
      totalCollected = Math.round(totalCollected * 100) / 100;

      // CSV Export
      if (exportFormat === 'csv') {
        let csv =
          'Date,Time,Order Number,Invoice Number,Table/Mode,Server,Cashier,Subtotal,Discount,Tax,Service Charge,Grand Total,Payment Method,Payment Status\n';
        for (const r of rows) {
          csv += `"${r.date}","${r.time}","${r.orderNumber}","${r.invoiceNumber}","${r.tableName}","${r.server}","${r.cashier}",${r.subtotal},${r.discount},${r.tax},${r.serviceCharge},${r.grandTotal},"${r.paymentMethod}","${r.paymentStatus}"\n`;
        }
        csv += `\n"TOTALS","","","","","","",${netSales},${totalDiscount},${totalTax},${totalServiceCharge},${totalSales},"",""\n`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="sales-report-${range || 'custom'}.csv"`
        );
        return res.send(csv);
      }

      return res.json({
        success: true,
        data: {
          rows,
          totals: {
            orderCount: rows.length,
            netSales,
            totalDiscount,
            totalTax,
            totalServiceCharge,
            totalSales,
            totalCollected,
          },
        },
      });
    } catch (error: any) {
      console.error('Sales report error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate sales report' },
      });
    }
  }
);

// 3. GET /api/v1/reports/payments - Payment Breakdown Report
router.get(
  '/payments',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate, exportFormat } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      const payments = await prisma.payment.findMany({
        where: {
          order: {
            restaurantId,
            status: OrderStatus.COMPLETED,
          },
          status: PaymentStatus.PAID,
          paidAt: { gte: start, lte: end },
        },
        include: {
          order: {
            include: {
              table: true,
              invoices: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
      });

      const byMethod: Record<string, { count: number; total: number }> = {
        CASH: { count: 0, total: 0 },
        CARD: { count: 0, total: 0 },
        QR: { count: 0, total: 0 },
        BANK_TRANSFER: { count: 0, total: 0 },
      };

      let grandTotal = 0;
      for (const p of payments) {
        const m = p.method as string;
        grandTotal += p.amount;
        if (byMethod[m]) {
          byMethod[m].count += 1;
          byMethod[m].total += p.amount;
        } else {
          byMethod[m] = { count: 1, total: p.amount };
        }
      }

      grandTotal = Math.round(grandTotal * 100) / 100;

      const breakdown = Object.entries(byMethod).map(([method, data]) => {
        const total = Math.round(data.total * 100) / 100;
        const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 1000) / 10 : 0;
        return {
          method,
          count: data.count,
          total,
          percentage: pct,
        };
      });

      const transactions = payments.map((p) => ({
        id: p.id,
        date: p.paidAt.toISOString().slice(0, 10),
        time: p.paidAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        orderNumber: p.order.orderNumber,
        invoiceNumber: p.order.invoices[0]?.invoiceNumber || 'N/A',
        tableName: p.order.table?.tableName || 'Takeaway',
        method: p.method,
        amount: p.amount,
        referenceNumber: p.referenceNumber || 'N/A',
        status: p.status,
      }));

      if (exportFormat === 'csv') {
        let csv = 'Payment Method,Transactions,Total Amount,Percentage of Sales\n';
        for (const b of breakdown) {
          csv += `"${b.method}",${b.count},${b.total},"${b.percentage}%"\n`;
        }
        csv += `\n"GRAND TOTAL",${payments.length},${grandTotal},"100%"\n\n`;
        csv += 'Date,Time,Order Number,Invoice Number,Table,Method,Amount,Reference\n';
        for (const t of transactions) {
          csv += `"${t.date}","${t.time}","${t.orderNumber}","${t.invoiceNumber}","${t.tableName}","${t.method}",${t.amount},"${t.referenceNumber}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="payments-report-${range || 'custom'}.csv"`
        );
        return res.send(csv);
      }

      return res.json({
        success: true,
        data: {
          breakdown,
          grandTotal,
          totalTransactions: payments.length,
          transactions,
        },
      });
    } catch (error: any) {
      console.error('Payments report error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate payments report' },
      });
    }
  }
);

// 4. GET /api/v1/reports/products - Product / Menu Performance
router.get(
  '/products',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate, sortBy, exportFormat } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      const items = await prisma.orderItem.findMany({
        where: {
          order: {
            restaurantId,
            status: OrderStatus.COMPLETED,
            createdAt: { gte: start, lte: end },
          },
        },
        include: {
          menuItem: {
            include: { category: true },
          },
        },
      });

      const map = new Map<
        string,
        {
          id: string;
          name: string;
          category: string;
          department: string;
          quantity: number;
          grossSales: number;
        }
      >();

      let grandItemSales = 0;
      let grandItemQty = 0;

      for (const it of items) {
        const id = it.menuItemId;
        const lineTotal = it.unitPrice * it.quantity;
        grandItemSales += lineTotal;
        grandItemQty += it.quantity;

        const existing = map.get(id) || {
          id,
          name: it.menuItem?.name || 'Unknown Item',
          category: it.menuItem?.category?.name || 'General',
          department: it.department,
          quantity: 0,
          grossSales: 0,
        };
        existing.quantity += it.quantity;
        existing.grossSales = Math.round((existing.grossSales + lineTotal) * 100) / 100;
        map.set(id, existing);
      }

      let report = Array.from(map.values()).map((p) => ({
        ...p,
        avgPrice: p.quantity > 0 ? Math.round((p.grossSales / p.quantity) * 100) / 100 : 0,
      }));

      if (sortBy === 'revenue') {
        report.sort((a, b) => b.grossSales - a.grossSales);
      } else {
        report.sort((a, b) => b.quantity - a.quantity);
      }

      if (exportFormat === 'csv') {
        let csv = 'Product Name,Category,Department,Quantity Sold,Gross Sales,Average Selling Price\n';
        for (const p of report) {
          csv += `"${p.name}","${p.category}","${p.department}",${p.quantity},${p.grossSales},${p.avgPrice}\n`;
        }
        csv += `\n"TOTALS","","",${grandItemQty},${Math.round(grandItemSales * 100) / 100},""\n`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="product-performance-${range || 'custom'}.csv"`
        );
        return res.send(csv);
      }

      return res.json({
        success: true,
        data: {
          items: report,
          totalQuantity: grandItemQty,
          totalSales: Math.round(grandItemSales * 100) / 100,
        },
      });
    } catch (error: any) {
      console.error('Products report error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate products report' },
      });
    }
  }
);

// 5. GET /api/v1/reports/waiters - Waiter / Server Performance
router.get(
  '/waiters',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate, exportFormat } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
        include: {
          waiter: { select: { id: true, name: true, username: true } },
        },
      });

      const map = new Map<
        string,
        { id: string; name: string; username: string; orderCount: number; sales: number }
      >();

      for (const o of orders) {
        const id = o.waiter?.id || 'counter';
        const name = o.waiter?.name || 'Counter / Staff';
        const username = o.waiter?.username || 'counter';
        const existing = map.get(id) || {
          id,
          name,
          username,
          orderCount: 0,
          sales: 0,
        };
        existing.orderCount += 1;
        existing.sales = Math.round((existing.sales + o.grandTotal) * 100) / 100;
        map.set(id, existing);
      }

      const report = Array.from(map.values())
        .map((w) => ({
          ...w,
          averageOrderValue:
            w.orderCount > 0 ? Math.round((w.sales / w.orderCount) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.sales - a.sales);

      if (exportFormat === 'csv') {
        let csv = 'Server Name,Orders Handled,Sales Generated,Average Order Value\n';
        for (const w of report) {
          csv += `"${w.name}",${w.orderCount},${w.sales},${w.averageOrderValue}\n`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="server-performance-${range || 'custom'}.csv"`
        );
        return res.send(csv);
      }

      return res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error('Waiters report error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate waiter report' },
      });
    }
  }
);

// 6. GET /api/v1/reports/tables - Table Performance
router.get(
  '/tables',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      const tables = await prisma.table.findMany({
        where: { restaurantId },
        include: {
          orders: {
            where: {
              status: OrderStatus.COMPLETED,
              createdAt: { gte: start, lte: end },
            },
            select: { id: true, grandTotal: true },
          },
        },
      });

      const report = tables
        .map((t) => {
          const count = t.orders.length;
          const rev =
            Math.round(t.orders.reduce((sum, o) => sum + o.grandTotal, 0) * 100) / 100;
          return {
            tableId: t.id,
            tableName: t.tableName,
            tableNumber: t.tableNumber,
            status: t.status,
            ordersCount: count,
            revenue: rev,
            averageBill: count > 0 ? Math.round((rev / count) * 100) / 100 : 0,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      return res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error('Tables report error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate table report' },
      });
    }
  }
);

// 7. GET /api/v1/reports/cancellations - Cancelled Orders Report
router.get(
  '/cancellations',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate, exportFormat } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      const cancelledOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: OrderStatus.CANCELLED,
          createdAt: { gte: start, lte: end },
        },
        include: {
          table: true,
          waiter: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const report = cancelledOrders.map((c) => ({
        id: c.id,
        orderNumber: c.orderNumber,
        date: c.createdAt.toISOString().slice(0, 10),
        time: c.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tableName: c.table?.tableName || 'Takeaway',
        amount: c.grandTotal,
        reason: c.notes || 'Order cancelled before completion',
        user: c.waiter?.name || 'Staff',
      }));

      if (exportFormat === 'csv') {
        let csv = 'Order Number,Date,Time,Table,Amount,Reason,User\n';
        for (const c of report) {
          csv += `"${c.orderNumber}","${c.date}","${c.time}","${c.tableName}",${c.amount},"${c.reason}","${c.user}"\n`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="cancellations-report-${range || 'custom'}.csv"`
        );
        return res.send(csv);
      }

      return res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error('Cancellations report error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate cancellations report',
        },
      });
    }
  }
);

// 8. GET /api/v1/reports/audit-logs - System Security & Operational Audit Trail
router.get(
  '/audit-logs',
  requireAuth,
  requireRole([RoleType.ADMIN, RoleType.MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const restaurantId = req.user!.restaurantId;
      const { range, startDate, endDate, action, limit = '200', exportFormat } = req.query;
      const { start, end } = getDateRange(
        range as string,
        startDate as string,
        endDate as string
      );

      const where: any = {
        restaurantId,
        createdAt: { gte: start, lte: end },
      };

      if (action) {
        where.action = String(action);
      }

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit) || 200, 1000),
      });

      const formatted = logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        userName: log.user?.name || 'System / Auto',
        userRole: log.user?.role?.name || 'SYSTEM',
        createdAt: log.createdAt.toISOString(),
        date: log.createdAt.toISOString().slice(0, 10),
        time: log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }));

      if (exportFormat === 'csv') {
        let csv = 'Timestamp,Action,User,Role,Entity,Entity ID,Details\n';
        for (const l of formatted) {
          const cleanDetails = (l.details || '').replace(/"/g, '""');
          csv += `"${l.createdAt}","${l.action}","${l.userName}","${l.userRole}","${l.entity}","${l.entityId || ''}","${cleanDetails}"\n`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="audit-logs-${range || 'custom'}.csv"`
        );
        return res.send(csv);
      }

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error: any) {
      console.error('Audit logs report error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve audit logs',
        },
      });
    }
  }
);

export default router;
