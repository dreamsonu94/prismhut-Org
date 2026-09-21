import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/invoices
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { date, search, startDate, endDate } = req.query;

    const where: any = { restaurantId };
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
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { tableName: { contains: s, mode: 'insensitive' } },
        { waiterName: { contains: s, mode: 'insensitive' } },
        { order: { orderNumber: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        restaurant: true,
        order: {
          include: {
            items: { include: { menuItem: true } },
            payments: true,
            table: true,
            waiter: { select: { id: true, name: true, username: true } },
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return res.json({
      success: true,
      data: invoices,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch invoices' },
    });
  }
});

// GET /api/v1/invoices/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        restaurant: true,
        order: {
          include: {
            items: { include: { menuItem: true } },
            payments: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found' },
      });
    }

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch invoice' },
    });
  }
});

// GET /api/v1/invoices/:id/pdf (returns thermal receipt HTML layout and printable invoice data)
router.get('/:id/pdf', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        restaurant: true,
        order: {
          include: {
            items: { include: { menuItem: true } },
            payments: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found' },
      });
    }

    // Return structured receipt HTML formatted for standard 80mm thermal receipt printing
    const r = invoice.restaurant;
    const orderItems = invoice.order.items;
    const paidAmount = invoice.order.payments && invoice.order.payments.length > 0
      ? invoice.order.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      : invoice.grandTotal;
    const changeDue = Math.max(0, paidAmount - invoice.grandTotal);

    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${invoice.invoiceNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 76mm;
      margin: 0 auto;
      padding: 4mm 0;
      color: #000;
      font-size: 12px;
      line-height: 1.3;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px double #000; margin: 6px 0; }
    .title { font-size: 16px; font-weight: bold; }
    .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .item-name { flex: 1; padding-right: 4px; }
    .item-qty { width: 25px; text-align: center; }
    .item-total { width: 55px; text-align: right; }
  </style>
</head>
<body onload="window.print()">
  <div class="text-center">
    <div class="title">${r.name}</div>
    <div>${r.address || ''}</div>
    <div>Phone: ${r.phone || 'N/A'}</div>
    <div>Email: ${r.email || 'N/A'}</div>
  </div>

  <div class="divider"></div>
  <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
  <div><strong>Order #:</strong> ${invoice.order.orderNumber}</div>
  <div><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()} ${new Date(invoice.createdAt).toLocaleTimeString()}</div>
  <div><strong>Table:</strong> ${invoice.tableName} | <strong>Guest:</strong> ${invoice.customerName}</div>
  <div><strong>Server:</strong> ${invoice.waiterName}</div>

  <div class="divider"></div>
  <div class="item-row bold">
    <span class="item-name">Item</span>
    <span class="item-qty">Qty</span>
    <span class="item-total">Amount</span>
  </div>
  <div class="divider"></div>

  ${orderItems
    .map(
      (item) => `
    <div class="item-row">
      <span class="item-name">${item.menuItem.name}</span>
      <span class="item-qty">${item.quantity}</span>
      <span class="item-total">${r.currency}${(item.unitPrice * item.quantity).toFixed(2)}</span>
    </div>
    ${item.notes ? `<div style="font-size:10px; color:#333; margin-left:8px;">* ${item.notes}</div>` : ''}
  `
    )
    .join('')}

  <div class="divider"></div>
  <div class="item-row">
    <span>Subtotal:</span>
    <span class="text-right">${r.currency}${invoice.subtotal.toFixed(2)}</span>
  </div>
  ${
    invoice.discount > 0
      ? `<div class="item-row">
    <span>Discount:</span>
    <span class="text-right">-${r.currency}${invoice.discount.toFixed(2)}</span>
  </div>`
      : ''
  }
  <div class="item-row">
    <span>Tax:</span>
    <span class="text-right">${r.currency}${invoice.tax.toFixed(2)}</span>
  </div>
  <div class="item-row">
    <span>Service Charge:</span>
    <span class="text-right">${r.currency}${invoice.serviceCharge.toFixed(2)}</span>
  </div>

  <div class="double-divider"></div>
  <div class="item-row bold" style="font-size: 14px;">
    <span>GRAND TOTAL:</span>
    <span class="text-right">${r.currency}${invoice.grandTotal.toFixed(2)}</span>
  </div>
  <div class="item-row">
    <span>Payment Method:</span>
    <span class="text-right">${invoice.paymentMethod}</span>
  </div>
  <div class="item-row">
    <span>Status:</span>
    <span class="text-right">${invoice.paidStatus}</span>
  </div>
  <div class="item-row">
    <span>Paid Amount:</span>
    <span class="text-right">${r.currency}${paidAmount.toFixed(2)}</span>
  </div>
  ${
    changeDue > 0
      ? `<div class="item-row">
    <span>Change Due:</span>
    <span class="text-right">${r.currency}${changeDue.toFixed(2)}</span>
  </div>`
      : ''
  }

  <div class="double-divider"></div>
  <div class="text-center" style="margin-top: 10px;">
    <div>Thank you for dining with us!</div>
    <div style="font-size: 10px; margin-top: 4px;">Powered by Restaurant Smart POS</div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(receiptHtml);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate receipt' },
    });
  }
});

export default router;
