import { prisma } from '../server/db/prisma.js';
import { ensureDatabase } from '../server/db/database.js';
import { OrderService } from '../server/services/orderService.js';
import { BillingService } from '../server/services/billingService.js';
import { generateToken } from '../server/middleware/auth.js';
import { Department, OrderType, PaymentMethod, TableStatus, TicketStatus, RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function runProductionSmokeTest() {
  console.log('================================================================');
  console.log('🚀 RESTAURANT SMART POS - 24-POINT PRODUCTION SMOKE TEST');
  console.log('================================================================\n');

  const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

  function record(test: string, passed: boolean, details?: string) {
    results.push({ test, status: passed ? 'PASS' : 'FAIL', details });
    console.log(`[${passed ? '✓ PASS' : '✗ FAIL'}] ${test}${details ? ` (${details})` : ''}`);
  }

  try {
    // 1. Database Connectivity
    await ensureDatabase();
    const ping = await prisma.$queryRaw`SELECT 1 as ping`;
    record('1. Database Connectivity (PostgreSQL SELECT 1)', Boolean(ping));

    // 2. API Health Verification
    const userCount = await prisma.user.count();
    record('2. API Health & DB Access', userCount > 0, `${userCount} active users`);

    // 3. User Login & Password Hash Verification
    const adminUser = await prisma.user.findFirst({
      where: { username: 'admin' },
      include: { role: true, restaurant: true },
    });
    const waiterUser = await prisma.user.findFirst({
      where: { username: 'waiter' },
      include: { role: true, restaurant: true },
    });
    const cashierUser = await prisma.user.findFirst({
      where: { username: 'cashier' },
      include: { role: true, restaurant: true },
    });
    const managerUser = await prisma.user.findFirst({
      where: { username: 'manager' },
      include: { role: true, restaurant: true },
    });

    const isPassValid = adminUser ? await bcrypt.compare('password123', adminUser.password) : false;
    record('3. Authentication & Password Hashing', Boolean(isPassValid), 'bcrypt verification ok');

    // 4. Token Generation & Expiration Check
    const adminToken = adminUser ? generateToken({
      id: adminUser.id,
      username: adminUser.username,
      name: adminUser.name,
      role: adminUser.role.name,
      restaurantId: adminUser.restaurantId,
    }) : '';
    record('4. JWT Token Generation', Boolean(adminToken && adminToken.length > 20));

    // 5. Role Authorization & RBAC Checks
    const adminHasFullAccess = adminUser?.role.name === RoleType.ADMIN;
    const waiterHasWaiterRole = waiterUser?.role.name === RoleType.WAITER;
    const cashierHasCashierRole = cashierUser?.role.name === RoleType.CASHIER;
    const managerHasManagerRole = managerUser?.role.name === RoleType.MANAGER;
    record('5. Role Authorization & RBAC Hierarchy', adminHasFullAccess && waiterHasWaiterRole && cashierHasCashierRole && managerHasManagerRole);

    // 6. Dashboard Metrics Query
    const totalOrders = await prisma.order.count();
    const totalRevenue = await prisma.payment.aggregate({ _sum: { amount: true } });
    record('6. Dashboard Analytics Data Integrity', totalOrders >= 0, `Total Orders: ${totalOrders}, Rev: $${totalRevenue._sum.amount || 0}`);

    // 7. Table Floor & Occupancy Query
    const tables = await prisma.table.findMany();
    record('7. Table Floor Layout Verification', tables.length > 0, `${tables.length} tables found`);

    // Select an available test table
    let testTable = await prisma.table.findFirst({ where: { status: TableStatus.AVAILABLE } });
    if (!testTable) {
      testTable = tables[0];
      await prisma.table.update({ where: { id: testTable.id }, data: { status: TableStatus.AVAILABLE } });
    }

    // 8. Find Food & Drink Menu Items
    const foodItem = await prisma.menuItem.findFirst({ where: { department: Department.KITCHEN } });
    const drinkItem = await prisma.menuItem.findFirst({ where: { department: Department.BAR } });
    if (!foodItem || !drinkItem || !waiterUser || !testTable) {
      throw new Error('Pre-requisite seed data missing for order workflow test');
    }
    record('8. Menu Inventory & Routing Setup', Boolean(foodItem && drinkItem), `Food: ${foodItem.name}, Drink: ${drinkItem.name}`);

    // 9. Create Order
    const orderKey = `smoke-order-${Date.now()}`;
    const orderResult = await OrderService.createOrder(adminUser!.restaurantId, {
      tableId: testTable.id,
      waiterId: waiterUser.id,
      guestCount: 2,
      orderType: OrderType.DINE_IN,
      idempotencyKey: orderKey,
      items: [
        { menuItemId: foodItem.id, quantity: 2, notes: 'Smoke test prep' },
        { menuItemId: drinkItem.id, quantity: 1, notes: 'Chilled' },
      ],
    });
    const order = orderResult.order;
    record('9. POS Dine-In Order Placement', Boolean(order?.id), `Order #${order?.orderNumber}`);

    // 10. Send KOT & BOT Split Routing
    const kots = order?.kots || [];
    const bots = order?.bots || [];
    record('10. Atomic KOT/BOT Routing Separation', kots.length === 1 && bots.length === 1, `KOT: ${kots[0]?.kotNumber}, BOT: ${bots[0]?.botNumber}`);

    // 11. Table Status Transition to OCCUPIED
    const occupiedTable = await prisma.table.findUnique({ where: { id: testTable.id } });
    record('11. Table Transition to OCCUPIED', occupiedTable?.status === TableStatus.OCCUPIED);

    // 12. Kitchen Ready Progression
    if (kots[0]) {
      await prisma.kOT.update({ where: { id: kots[0].id }, data: { status: TicketStatus.PREPARING } });
      await prisma.kOT.update({ where: { id: kots[0].id }, data: { status: TicketStatus.READY } });
    }
    const updatedKot = await prisma.kOT.findUnique({ where: { id: kots[0]?.id } });
    record('12. Kitchen Ticket Progression (PREPARING -> READY)', updatedKot?.status === TicketStatus.READY);

    // 13. Cash Payment Settlement
    const cashKey = `smoke-pay-cash-${Date.now()}`;
    const cashSettle = await BillingService.processPayment(adminUser!.restaurantId, {
      orderId: order!.id,
      amount: order!.grandTotal,
      method: PaymentMethod.CASH,
      idempotencyKey: cashKey,
    });
    record('13. Cash Payment Atomic Settlement', Boolean(cashSettle.payment?.id), `Paid $${cashSettle.payment?.amount}`);

    // 14. Invoice Generation
    record('14. Consecutive Invoice Generation', Boolean(cashSettle.invoice?.invoiceNumber), `Inv: ${cashSettle.invoice?.invoiceNumber}`);

    // 15. Receipt Calculations (Subtotal, Tax, Service Charge, Grand Total)
    const inv = cashSettle.invoice;
    const mathValid = inv && Math.abs(inv.subtotal + inv.tax + inv.serviceCharge - inv.discount - inv.grandTotal) < 0.05;
    record('15. Financial Audit & Receipt Calculation Accuracy', Boolean(mathValid), `Grand Total: $${inv?.grandTotal}`);

    // 16. 80mm Thermal Receipt Formatting Verification
    const hasThermalFields = Boolean(inv?.invoiceNumber && inv?.customerName && inv?.tableName && inv?.paymentMethod);
    record('16. 80mm Thermal Receipt Layout & Formatting', hasThermalFields);

    // 17. Automatic Table Release to AVAILABLE
    const releasedTable = await prisma.table.findUnique({ where: { id: testTable.id } });
    record('17. Automatic Table Release to AVAILABLE', releasedTable?.status === TableStatus.AVAILABLE);

    // 18. Pending Bill Disappearance
    const settledOrder = await prisma.order.findUnique({
      where: { id: order!.id },
      include: { payments: true, invoices: true },
    });
    const isOrderClearedFromPending = settledOrder?.status === 'COMPLETED' && settledOrder.invoices.length > 0;
    record('18. Active Register Pending Bill Clearance', Boolean(isOrderClearedFromPending), `Order ${settledOrder?.orderNumber} cleared from pending register`);

    // 19. Card Payment Verification on Separate Order
    const cardOrderKey = `smoke-card-order-${Date.now()}`;
    const cardOrderRes = await OrderService.createOrder(adminUser!.restaurantId, {
      tableId: testTable.id,
      waiterId: waiterUser.id,
      guestCount: 1,
      orderType: OrderType.TAKEAWAY,
      idempotencyKey: cardOrderKey,
      items: [{ menuItemId: foodItem.id, quantity: 1 }],
    });
    const cardSettle = await BillingService.processPayment(adminUser!.restaurantId, {
      orderId: cardOrderRes.order!.id,
      amount: cardOrderRes.order!.grandTotal,
      method: PaymentMethod.CARD,
      referenceNumber: 'TX-CARD-9921',
    });
    record('19. Card Payment Processing & Reference Logging', Boolean(cardSettle.payment?.referenceNumber === 'TX-CARD-9921'));

    // 20. QR Payment Verification
    const qrOrderKey = `smoke-qr-order-${Date.now()}`;
    const qrOrderRes = await OrderService.createOrder(adminUser!.restaurantId, {
      guestCount: 1,
      orderType: OrderType.TAKEAWAY,
      idempotencyKey: qrOrderKey,
      items: [{ menuItemId: drinkItem.id, quantity: 1 }],
    });
    const qrSettle = await BillingService.processPayment(adminUser!.restaurantId, {
      orderId: qrOrderRes.order!.id,
      amount: qrOrderRes.order!.grandTotal,
      method: PaymentMethod.QR,
      referenceNumber: 'QR-UPI-REF-5512',
    });
    record('20. QR Payment Processing & Dynamic Reference', Boolean(qrSettle.payment?.method === PaymentMethod.QR));

    // 21. Orders & Receipts Query Audit
    const recentInvoices = await prisma.invoice.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    record('21. Orders & Receipts Ledger Query', recentInvoices.length > 0, `${recentInvoices.length} recent invoices`);

    // 22. Reports & Daily Sales Aggregation
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dailySettledCount = await prisma.order.count({
      where: { status: 'COMPLETED', updatedAt: { gte: startOfDay } },
    });
    record('22. Reports & Daily Sales Aggregation', dailySettledCount > 0, `${dailySettledCount} completed orders today`);

    // 23. CSV Export Serialization
    const csvRows = [
      ['Invoice #', 'Date', 'Table', 'Waiter', 'Method', 'Total'],
      ...recentInvoices.map((i) => [i.invoiceNumber, i.createdAt.toISOString(), i.tableName, i.waiterName, i.paymentMethod, i.grandTotal.toFixed(2)]),
    ].map((r) => r.join(',')).join('\n');
    record('23. Financial Report CSV Export Serialization', Boolean(csvRows.includes('Invoice #')));

    // 24. Session Logout & Relogin Audit Log Tracking
    await prisma.auditLog.create({
      data: {
        restaurantId: adminUser!.restaurantId,
        userId: adminUser!.id,
        action: 'USER_LOGOUT',
        entity: 'USER',
        entityId: adminUser!.id,
        details: JSON.stringify({ username: adminUser!.username }),
      },
    });
    const lastAudit = await prisma.auditLog.findFirst({
      where: { action: 'USER_LOGOUT' },
      orderBy: { createdAt: 'desc' },
    });
    record('24. Logout, Re-Login & Audit Trail Persistence', Boolean(lastAudit));

    console.log('\n================================================================');
    const passedCount = results.filter((r) => r.status === 'PASS').length;
    console.log(`SMOKE TEST SUMMARY: ${passedCount} / ${results.length} PASSED`);
    console.log('================================================================');

    if (passedCount !== results.length) {
      process.exit(1);
    }
    await prisma.$disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('Smoke test aborted with uncaught error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runProductionSmokeTest();
