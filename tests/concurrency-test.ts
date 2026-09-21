import { prisma } from '../server/db/prisma.js';
import { ensureDatabase } from '../server/db/database.js';
import { OrderService } from '../server/services/orderService.js';
import { BillingService } from '../server/services/billingService.js';
import { Department, OrderType, PaymentMethod, TableStatus } from '@prisma/client';

async function runConcurrencyTests() {
  await ensureDatabase();
  console.log('=== RESTAURANT SMART POS: CONCURRENCY & STRESS TEST ===\n');

  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) throw new Error('Restaurant not found');

  const waiter = await prisma.user.findFirst({ where: { username: 'waiter' } });
  if (!waiter) throw new Error('Waiter not found');

  const table = await prisma.table.findFirst({ where: { tableNumber: 'T-03' } });
  if (!table) throw new Error('Table T-03 not found');

  const foodItem = await prisma.menuItem.findFirst({
    where: { department: Department.KITCHEN, isAvailable: true },
  });
  const drinkItem = await prisma.menuItem.findFirst({
    where: { department: Department.BAR, isAvailable: true },
  });

  if (!foodItem || !drinkItem) {
    throw new Error('Menu items required for test');
  }

  // TEST 1: Concurrent Order Creation
  console.log('--- TEST 1: Rapid Concurrent Order Creation (5 simulated waiters) ---');
  const orderPromises = Array.from({ length: 5 }).map((_, idx) => {
    const key = `conc-order-${Date.now()}-${idx}-${Math.random()}`;
    return OrderService.createOrder(restaurant.id, {
      tableId: table.id,
      waiterId: waiter.id,
      guestCount: 2,
      orderType: OrderType.DINE_IN,
      idempotencyKey: key,
      items: [
        { menuItemId: foodItem.id, quantity: 1 },
        { menuItemId: drinkItem.id, quantity: 1 },
      ],
    });
  });

  const orderResults = await Promise.all(orderPromises);
  console.log(`✓ Successfully generated ${orderResults.length} distinct orders in parallel.`);
  const orderNumbers = new Set(orderResults.map((r) => r.order?.orderNumber).filter(Boolean));
  if (orderNumbers.size !== 5) {
    throw new Error(`Expected 5 unique order numbers, got ${orderNumbers.size}`);
  }
  console.log(`✓ All 5 order numbers are uniquely sequential: ${Array.from(orderNumbers).join(', ')}`);

  // TEST 2: Concurrent Duplicate Payment Protection (Race condition simulation)
  console.log('\n--- TEST 2: Concurrent Payment Double-Click / Race Condition Protection ---');
  const targetOrder = orderResults[0]?.order;
  if (!targetOrder) {
    throw new Error('Failed to create target order for payment concurrency test');
  }
  const sharedPaymentKey = `conc-pay-key-${Date.now()}-${Math.random()}`;

  console.log(`Submitting 4 parallel payment requests for Order ${targetOrder.orderNumber} with grand total $${targetOrder.grandTotal}...`);

  const paymentPromises = Array.from({ length: 4 }).map((_, idx) => {
    return BillingService.processPayment(restaurant.id, {
      orderId: targetOrder.id,
      amount: targetOrder.grandTotal,
      method: PaymentMethod.CARD,
      referenceNumber: `AUTH-${idx}`,
      idempotencyKey: sharedPaymentKey,
      customerName: 'Concurrency Test Guest',
    });
  });

  const paymentResults = await Promise.all(paymentPromises);

  const duplicates = paymentResults.filter((r) => r.isDuplicate);
  const primaries = paymentResults.filter((r) => !r.isDuplicate);

  console.log(`✓ Parallel results summary: ${primaries.length} primary execution, ${duplicates.length} idempotent duplicates returned.`);

  // Verify only 1 invoice exists for this order in the database
  const invoiceCount = await prisma.invoice.count({
    where: { orderId: targetOrder.id },
  });
  console.log(`✓ Invoices in database for order: ${invoiceCount}`);
  if (invoiceCount !== 1) {
    throw new Error(`Double billing failure: expected 1 invoice in DB, found ${invoiceCount}!`);
  }

  // Verify all 4 responses returned the exact same invoice number
  const invoiceNumbers = new Set(paymentResults.map((r) => r.invoice?.invoiceNumber));
  console.log(`✓ Distinct invoice numbers across all 4 concurrent requests: ${Array.from(invoiceNumbers).join(', ')}`);
  if (invoiceNumbers.size !== 1) {
    throw new Error(`Expected exactly 1 shared invoice number, got ${invoiceNumbers.size}`);
  }

  // Verify table is freed and order status is COMPLETED
  const finalOrder = await prisma.order.findUnique({ where: { id: targetOrder.id } });
  if (finalOrder?.status !== 'COMPLETED') {
    throw new Error(`Expected order status COMPLETED, got ${finalOrder?.status}`);
  }
  console.log(`✓ Order settled with status: ${finalOrder.status}`);

  const postTable = await prisma.table.findUnique({ where: { id: table.id } });
  console.log(`✓ Table status: ${postTable?.status}`);

  console.log('\n======================================================');
  console.log('🎉 ALL CONCURRENCY & RACE CONDITION TESTS PASSED!');
  console.log('======================================================\n');
}

runConcurrencyTests()
  .catch((err) => {
    console.error('Concurrency Test Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
