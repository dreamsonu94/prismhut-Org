import { prisma } from '../db/prisma.js';
import { emitEvent } from '../socket/index.js';
import { OrderStatus, PaymentMethod, PaymentStatus, TableStatus } from '@prisma/client';

export interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  customerName?: string;
}

export class BillingService {
  /**
   * Process payment, create invoice, and complete order
   */
  static async processPayment(restaurantId: string, input: ProcessPaymentInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        table: true,
        waiter: true,
        customer: true,
        items: { include: { menuItem: true } },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Order is already settled and completed');
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const invoicePrefix = restaurant?.invoicePrefix || 'INV-';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: input.amount,
          method: input.method,
          referenceNumber: input.referenceNumber || null,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      // 2. Generate Invoice
      const invoiceCount = await tx.invoice.count({ where: { restaurantId } });
      let invoiceNumber = `${invoicePrefix}${String(invoiceCount + 1001).padStart(4, '0')}`;
      const existingInvoice = await tx.invoice.findUnique({ where: { invoiceNumber } });
      if (existingInvoice) {
        invoiceNumber = `${invoicePrefix}${Date.now().toString().slice(-6)}`;
      }

      const invoice = await tx.invoice.create({
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
          tableName: order.table ? order.table.tableName : 'Takeaway',
          waiterName: order.waiter ? order.waiter.name : 'Staff',
        },
      });

      // 3. Mark Order as COMPLETED
      const updatedOrder = await tx.order.update({
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
      });

      // 4. Mark Table as CLEANING
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.CLEANING },
        });
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          restaurantId,
          action: 'PAYMENT_COMPLETED',
          entity: 'ORDER',
          entityId: order.id,
          details: JSON.stringify({
            paymentId: payment.id,
            invoiceNumber,
            amount: input.amount,
            method: input.method,
          }),
        },
      });

      return { payment, invoice, updatedOrder };
    });

    // Real-time events
    emitEvent('payment.completed', {
      orderId: order.id,
      invoice: result.invoice,
      payment: result.payment,
    });
    emitEvent('order.updated', result.updatedOrder);

    if (order.tableId) {
      const updatedTable = await prisma.table.findUnique({ where: { id: order.tableId } });
      emitEvent('table.updated', updatedTable);
    }

    return result;
  }
}
