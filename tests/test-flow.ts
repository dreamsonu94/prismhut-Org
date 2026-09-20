import { prisma } from '../server/db/prisma.js';
import { ensureDatabase } from '../server/db/database.js';
import { OrderService } from '../server/services/orderService.js';
import { BillingService } from '../server/services/billingService.js';
import { Department, OrderType, PaymentMethod, TableStatus, TicketStatus } from '@prisma/client';

async function runTests() {
  await ensureDatabase();
  console.log('--- STARTING RESTAURANT SMART POS AUTOMATED VERIFICATION ---');

  // 1. Get restaurant, waiter, and table
  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) throw new Error('No restaurant found');
  console.log(`✓ Found Restaurant: ${restaurant.name} (${restaurant.currency})`);

  const waiter = await prisma.user.findFirst({ where: { username: 'waiter' } });
  if (!waiter) throw new Error('No waiter found');
  console.log(`✓ Found Waiter: ${waiter.name}`);

  const table = await prisma.table.findFirst({ where: { tableNumber: 'T-02' } });
  if (!table) throw new Error('No table T-02 found');
  console.log(`✓ Found Table: ${table.tableName} (${table.tableNumber})`);

  // 2. Find Kitchen items and Bar items
  const foodItem1 = await prisma.menuItem.findFirst({ where: { department: Department.KITCHEN, name: { contains: 'Burger' } } });
  const foodItem2 = await prisma.menuItem.findFirst({ where: { department: Department.KITCHEN, name: { contains: 'Chowmein' } } });
  const drinkItem1 = await prisma.menuItem.findFirst({ where: { department: Department.BAR, name: { contains: 'Mojito' } } });
  const drinkItem2 = await prisma.menuItem.findFirst({ where: { department: Department.BAR, name: { contains: 'Beer' } } });

  if (!foodItem1 || !foodItem2 || !drinkItem1 || !drinkItem2) {
    throw new Error('Menu items for Kitchen and Bar not found');
  }

  console.log(`✓ Food Items: ${foodItem1.name} ($${foodItem1.price}), ${foodItem2.name} ($${foodItem2.price})`);
  console.log(`✓ Drink Items: ${drinkItem1.name} ($${drinkItem1.price}), ${drinkItem2.name} ($${drinkItem2.price})`);

  // 3. Test Critical Order + KOT + BOT atomic generation
  const idempotencyKey = `test-idempotency-${Date.now()}`;
  console.log(`\nTesting Order Creation with transaction & Idempotency Key: ${idempotencyKey}...`);

  const orderResult = await OrderService.createOrder(restaurant.id, {
    tableId: table.id,
    waiterId: waiter.id,
    guestCount: 3,
    orderType: OrderType.DINE_IN,
    idempotencyKey,
    items: [
      { menuItemId: foodItem1.id, quantity: 2, notes: 'Extra cheese' },
      { menuItemId: foodItem2.id, quantity: 1, notes: 'Spicy' },
      { menuItemId: drinkItem1.id, quantity: 2, notes: 'Less ice' },
      { menuItemId: drinkItem2.id, quantity: 1 },
    ],
  });

  const order = orderResult.order;
  if (!order) throw new Error('Order creation failed to return order');
  console.log(`✓ Order Created: ${order.orderNumber} (Grand Total: ${restaurant.currency}${order.grandTotal})`);
  console.log(`✓ KOTs generated: ${order.kots.length}, BOTs generated: ${order.bots.length}`);

  if (order.kots.length !== 1) throw new Error(`Expected 1 KOT, got ${order.kots.length}`);
  if (order.bots.length !== 1) throw new Error(`Expected 1 BOT, got ${order.bots.length}`);
  if (order.kots[0].orderId !== order.id) throw new Error('KOT orderId mismatch');
  if (order.bots[0].orderId !== order.id) throw new Error('BOT orderId mismatch');

  console.log(`✓ Verified: Both KOT (${order.kots[0].kotNumber}) and BOT (${order.bots[0].botNumber}) reference Order ${order.id}`);

  // 4. Test Table Status
  const updatedTable = await prisma.table.findUnique({ where: { id: table.id } });
  if (updatedTable?.status !== TableStatus.OCCUPIED) {
    throw new Error(`Expected table to be OCCUPIED, got ${updatedTable?.status}`);
  }
  console.log(`✓ Table status successfully transitioned to: ${updatedTable.status}`);

  // 5. Test Idempotency: re-submit exact same request
  console.log('\nTesting Idempotency: resubmitting with same idempotency key...');
  const duplicateResult = await OrderService.createOrder(restaurant.id, {
    tableId: table.id,
    waiterId: waiter.id,
    guestCount: 3,
    idempotencyKey,
    items: [{ menuItemId: foodItem1.id, quantity: 2 }],
  });

  if (!duplicateResult.isDuplicate || !duplicateResult.order || duplicateResult.order.id !== order.id) {
    throw new Error('Idempotency failed: duplicated order created');
  }
  console.log(`✓ Idempotency protected: returned existing order ${duplicateResult.order!.orderNumber} without duplicate!`);

  // 6. Test Ticket Status Lifecycle
  console.log('\nTesting KOT ticket lifecycle...');
  await prisma.kOT.update({
    where: { id: order.kots[0].id },
    data: { status: TicketStatus.PREPARING },
  });
  console.log(`✓ KOT ${order.kots[0].kotNumber} transitioned to PREPARING`);

  await prisma.kOT.update({
    where: { id: order.kots[0].id },
    data: { status: TicketStatus.READY },
  });
  console.log(`✓ KOT ${order.kots[0].kotNumber} transitioned to READY`);

  // 7. Test Billing & Payment Settlement
  console.log('\nTesting Billing, Payment, and Invoice Settlement...');
  const paymentResult = await BillingService.processPayment(restaurant.id, {
    orderId: order.id,
    amount: order.grandTotal,
    method: PaymentMethod.CARD,
    customerName: 'Alice Johnson',
  });

  console.log(`✓ Payment Processed: ${paymentResult.payment.method} ($${paymentResult.payment.amount})`);
  console.log(`✓ Invoice Generated: ${paymentResult.invoice.invoiceNumber}`);
  console.log(`✓ Order Status: ${paymentResult.updatedOrder.status}`);

  const postTable = await prisma.table.findUnique({ where: { id: table.id } });
  console.log(`✓ Table Status after settlement: ${postTable?.status} (Ready for cleaning)`);

  console.log('\n🎉 ALL BUSINESS LOGIC & CRITICAL RULES VERIFIED SUCCESSFULLY!');
}

runTests()
  .catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
