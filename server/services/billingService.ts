import { prisma } from '../db/prisma.js';
import { emitEvent } from '../socket/index.js';
import { OrderStatus, PaymentMethod, PaymentStatus, TableStatus } from '@prisma/client';

export interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  customerName?: string;
  idempotencyKey?: string;
}

class AsyncMutex {
  private queue = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.queue;
    let resolveNext: () => void;
    this.queue = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });

    await prev.catch(() => {});
    try {
      return await fn();
    } finally {
      resolveNext!();
    }
  }
}

const paymentMutex = new AsyncMutex();

export class BillingService {
  /**
   * Process payment, create invoice, and complete order atomically and idempotently
   */
  static async processPayment(restaurantId: string, input: ProcessPaymentInput) {
    return paymentMutex.runExclusive(async () => {
      return BillingService._executeProcessPayment(restaurantId, input);
    });
  }

  private static async _executeProcessPayment(restaurantId: string, input: ProcessPaymentInput) {
    // 1. Initial order lookup
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        table: true,
        waiter: true,
        customer: true,
        items: { include: { menuItem: true } },
        payments: true,
        invoices: true,
      },
    });

    if (!order) {
      const err: any = new Error('Order not found');
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }

    if (input.amount <= 0) {
      const err: any = new Error('Payment amount must be greater than zero');
      err.code = 'INVALID_AMOUNT';
      throw err;
    }

    // 2. Idempotency Check: check if referenceNumber / idempotencyKey already settled
    if (input.idempotencyKey) {
      const existingPaymentByIdemp = await prisma.payment.findFirst({
        where: { referenceNumber: input.idempotencyKey },
        include: {
          order: {
            include: {
              table: true,
              waiter: true,
              customer: true,
              items: { include: { menuItem: true } },
              payments: true,
              invoices: true,
            },
          },
        },
      });

      if (existingPaymentByIdemp && existingPaymentByIdemp.order) {
        const existingInvoice = await prisma.invoice.findFirst({
          where: { orderId: existingPaymentByIdemp.orderId },
          include: {
            restaurant: true,
            order: {
              include: {
                items: { include: { menuItem: true } },
                payments: true,
                table: true,
                waiter: true,
                customer: true,
              },
            },
          },
        });

        if (existingPaymentByIdemp.order.tableId) {
          try {
            await prisma.table.update({
              where: { id: existingPaymentByIdemp.order.tableId },
              data: { status: TableStatus.AVAILABLE },
            });
            const updatedTable = await prisma.table.findUnique({ where: { id: existingPaymentByIdemp.order.tableId } });
            if (updatedTable) emitEvent('table.updated', updatedTable);
          } catch (_) {}
        }

        return {
          payment: existingPaymentByIdemp,
          invoice: existingInvoice,
          updatedOrder: existingInvoice?.order || existingPaymentByIdemp.order,
          isDuplicate: true,
        };
      }
    }

    // Also check if order is already settled or paid, return existing invoice safely
    const existingPaid =
      order.status === OrderStatus.COMPLETED ||
      order.invoices.length > 0 ||
      order.payments.some((p) => p.status === PaymentStatus.PAID);

    if (existingPaid) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: { orderId: order.id },
        include: {
          restaurant: true,
          order: {
            include: {
              items: { include: { menuItem: true } },
              payments: true,
              table: true,
              waiter: true,
              customer: true,
            },
          },
        },
      });

      const existingPayment =
        order.payments.find((p) => p.status === PaymentStatus.PAID) || order.payments[0];

      // Ensure table is released to AVAILABLE if not already
      if (order.tableId) {
        try {
          await prisma.table.update({
            where: { id: order.tableId },
            data: { status: TableStatus.AVAILABLE },
          });
          const updatedTable = await prisma.table.findUnique({ where: { id: order.tableId } });
          if (updatedTable) emitEvent('table.updated', updatedTable);
        } catch (tableErr) {
          console.warn('Table release warning on duplicate payment:', tableErr);
        }
      }

      return {
        payment: existingPayment,
        invoice: existingInvoice,
        updatedOrder: existingInvoice?.order || order,
        isDuplicate: true,
      };
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const invoicePrefix = restaurant?.invoicePrefix || 'INV-';

    // Generate Invoice Number fast without slow full-table count
    const lastInvoice = await prisma.invoice.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextSeq = 1001;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    let invoiceNumber = `${invoicePrefix}${String(nextSeq).padStart(4, '0')}`;

    // Check collision and guarantee uniqueness with retry
    let collisionCheck = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    let attempts = 0;
    while (collisionCheck && attempts < 5) {
      attempts++;
      invoiceNumber = `${invoicePrefix}${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      collisionCheck = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    }

    console.log(`[BillingService] Database transaction starting for order: ${order.orderNumber} | Target Invoice: ${invoiceNumber}`);
    const txStart = Date.now();

    // 3. Execute Atomic Batch Transaction (Compatible with PgBouncer / Supabase Transaction Pooler)
    let payment: any;
    let invoice: any;
    let updatedOrder: any;

    try {
      const txResult = await prisma.$transaction([
        prisma.payment.create({
          data: {
            orderId: order.id,
            amount: input.amount,
            method: input.method,
            referenceNumber: input.referenceNumber || input.idempotencyKey || null,
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        }),
        prisma.invoice.create({
          data: {
            restaurantId,
            orderId: order.id,
            invoiceNumber,
            subtotal: order.subtotal,
            discount: order.discount,
            tax: order.tax,
            serviceCharge: order.serviceCharge,
            grandTotal: order.grandTotal,
            paymentMethod: input.method,
            paidStatus: PaymentStatus.PAID,
            customerName: input.customerName || order.customer?.name || 'Valued Guest',
            tableName: order.table ? (order.table.tableName || order.table.tableNumber) : 'Takeaway',
            waiterName: order.waiter ? order.waiter.name : 'Staff',
          },
          include: {
            restaurant: true,
            order: {
              include: {
                items: { include: { menuItem: true } },
                payments: true,
                table: true,
                waiter: true,
                customer: true,
              },
            },
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.COMPLETED },
          include: {
            table: true,
            waiter: true,
            customer: true,
            items: { include: { menuItem: true } },
            payments: true,
            invoices: true,
          },
        }),
        ...(order.tableId
          ? [
              prisma.table.update({
                where: { id: order.tableId },
                data: { status: TableStatus.AVAILABLE },
              }),
            ]
          : []),
        prisma.auditLog.create({
          data: {
            restaurantId,
            action: 'PAYMENT_COMPLETED',
            entity: 'ORDER',
            entityId: order.id,
            details: JSON.stringify({
              invoiceNumber,
              amount: input.amount,
              method: input.method,
              referenceNumber: input.referenceNumber || null,
            }),
          },
        }),
      ]);

      payment = txResult[0];
      invoice = txResult[1];
      updatedOrder = txResult[2];
    } catch (txErr: any) {
      console.warn(`[BillingService] Transaction race or collision detected: ${txErr?.message || txErr}`);
      // Check if another concurrent request successfully created invoice/payment for this order
      const existingInvoice = await prisma.invoice.findFirst({
        where: { orderId: order.id },
        include: {
          restaurant: true,
          order: {
            include: {
              items: { include: { menuItem: true } },
              payments: true,
              table: true,
              waiter: true,
              customer: true,
            },
          },
        },
      });

      if (existingInvoice) {
        const existingPayment = await prisma.payment.findFirst({
          where: { orderId: order.id, status: PaymentStatus.PAID },
        });
        return {
          payment: existingPayment,
          invoice: existingInvoice,
          updatedOrder: existingInvoice.order,
          isDuplicate: true,
        };
      }
      throw txErr;
    }

    const txElapsed = Date.now() - txStart;
    console.log(`[BillingService] Database transaction committed successfully in ${txElapsed}ms`);
    console.log(`[BillingService] Payment created (ID: ${payment.id}) | Invoice created (${invoice.invoiceNumber}) | Order completed (${updatedOrder.orderNumber}) | Table released: ${order.table?.tableNumber || 'N/A'}`);

    // 4. Non-blocking real-time events outside the transaction
    try {
      emitEvent('payment.completed', {
        orderId: order.id,
        invoice,
        payment,
      });
      emitEvent('order.updated', updatedOrder);

      if (order.tableId) {
        const updatedTable = await prisma.table.findUnique({ where: { id: order.tableId } });
        if (updatedTable) {
          emitEvent('table.updated', updatedTable);
        }
      }
    } catch (eventErr) {
      console.warn('[BillingService] Realtime event emission warning:', eventErr);
    }

    return { payment, invoice, updatedOrder, isDuplicate: false };
  }
}
