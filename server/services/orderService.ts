import { prisma } from '../db/prisma.js';
import { emitEvent } from '../socket/index.js';
import { Department, OrderStatus, OrderType, TableStatus, TicketPriority, TicketStatus } from '@prisma/client';

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  tableId?: string;
  customerId?: string;
  guestCount?: number;
  orderType?: OrderType;
  items: CreateOrderItemInput[];
  notes?: string;
  idempotencyKey?: string;
  discountCode?: string;
  waiterId?: string;
}

async function getNextOrderNumber(tx: any, restaurantId: string): Promise<string> {
  const lastOrder = await tx.order.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });
  let nextSeq = 1001;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }
  let orderNumber = `ORD-${String(nextSeq).padStart(4, '0')}`;
  let exists = await tx.order.findUnique({ where: { orderNumber } });
  while (exists) {
    nextSeq++;
    orderNumber = `ORD-${String(nextSeq).padStart(4, '0')}`;
    exists = await tx.order.findUnique({ where: { orderNumber } });
  }
  return orderNumber;
}

async function getNextKotNumber(tx: any, prefix: string): Promise<string> {
  const lastKot = await tx.kOT.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { kotNumber: true },
  });
  let nextSeq = 1001;
  if (lastKot?.kotNumber) {
    const match = lastKot.kotNumber.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }
  let kotNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  let exists = await tx.kOT.findUnique({ where: { kotNumber } });
  while (exists) {
    nextSeq++;
    kotNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    exists = await tx.kOT.findUnique({ where: { kotNumber } });
  }
  return kotNumber;
}

async function getNextBotNumber(tx: any, prefix: string): Promise<string> {
  const lastBot = await tx.bOT.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { botNumber: true },
  });
  let nextSeq = 1001;
  if (lastBot?.botNumber) {
    const match = lastBot.botNumber.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }
  let botNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  let exists = await tx.bOT.findUnique({ where: { botNumber } });
  while (exists) {
    nextSeq++;
    botNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    exists = await tx.bOT.findUnique({ where: { botNumber } });
  }
  return botNumber;
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

const orderCreationMutex = new AsyncMutex();

export class OrderService {
  /**
   * Create an order with transaction, generating KOT for KITCHEN items and BOT for BAR items.
   */
  static async createOrder(restaurantId: string, input: CreateOrderInput) {
    return orderCreationMutex.runExclusive(async () => {
      return OrderService._executeCreateOrder(restaurantId, input);
    });
  }

  private static async _executeCreateOrder(restaurantId: string, input: CreateOrderInput) {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          items: { include: { menuItem: true } },
          table: true,
          waiter: { select: { id: true, name: true, username: true } },
          kots: { include: { items: true } },
          bots: { include: { items: true } },
        },
      });
      if (existing) {
        return { order: existing, isDuplicate: true };
      }
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // 2. Fetch Restaurant settings for tax and service charges
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // 3. Fetch menu items to calculate accurate prices server-side
    const menuItemIds = input.items.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    const itemMap = new Map(dbMenuItems.map((item) => [item.id, item]));

    // Validate all items exist
    for (const reqItem of input.items) {
      if (!itemMap.has(reqItem.menuItemId)) {
        throw new Error(`Menu item with ID ${reqItem.menuItemId} was not found`);
      }
    }

    // 4. Calculate Subtotal, Tax, and prepare items
    let subtotal = 0;
    let totalTax = 0;

    const preparedItems = input.items.map((reqItem) => {
      const dbItem = itemMap.get(reqItem.menuItemId)!;
      const itemSubtotal = dbItem.price * reqItem.quantity;
      const itemTax = Math.round((itemSubtotal * (dbItem.taxPercent / 100)) * 100) / 100;
      subtotal += itemSubtotal;
      totalTax += itemTax;

      return {
        menuItemId: dbItem.id,
        quantity: reqItem.quantity,
        unitPrice: dbItem.price,
        tax: itemTax,
        discount: 0,
        notes: reqItem.notes || null,
        department: dbItem.department,
        status: TicketStatus.PENDING,
        name: dbItem.name,
      };
    });

    // 5. Calculate Discount if code provided
    let discountAmount = 0;
    if (input.discountCode) {
      const discountRecord = await prisma.discount.findUnique({
        where: { code: input.discountCode.toUpperCase() },
      });
      if (discountRecord && discountRecord.isActive) {
        if (discountRecord.percentage) {
          discountAmount = Math.round((subtotal * (discountRecord.percentage / 100)) * 100) / 100;
        } else if (discountRecord.fixedAmount) {
          discountAmount = Math.min(subtotal, discountRecord.fixedAmount);
        }
      }
    }

    const serviceCharge = Math.round(((subtotal - discountAmount) * (restaurant.serviceChargeRate / 100)) * 100) / 100;
    const grandTotal = Math.max(0, Math.round((subtotal - discountAmount + totalTax + serviceCharge) * 100) / 100);

    // Fetch table and waiter details if available
    let tableNumber = 'Walk-in';
    if (input.tableId) {
      const table = await prisma.table.findUnique({ where: { id: input.tableId } });
      if (table) tableNumber = table.tableNumber;
    }

    let waiterName = 'Staff';
    if (input.waiterId) {
      const waiter = await prisma.user.findUnique({ where: { id: input.waiterId } });
      if (waiter) waiterName = waiter.name;
    }

    // 6. Execute PostgreSQL Transaction with retry on concurrency contention
    let result: any = null;
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        result = await prisma.$transaction(async (tx) => {
          // Generate Order Number with collision safety
          const orderNumber = await getNextOrderNumber(tx, restaurantId);

          // Create Order
          const newOrder = await tx.order.create({
            data: {
              restaurantId,
              orderNumber,
              tableId: input.tableId || null,
              waiterId: input.waiterId || null,
              customerId: input.customerId || null,
              guestCount: input.guestCount || 1,
              orderType: input.orderType || OrderType.DINE_IN,
              status: OrderStatus.CONFIRMED,
              subtotal,
              discount: discountAmount,
              tax: totalTax,
              serviceCharge,
              grandTotal,
              idempotencyKey: input.idempotencyKey || null,
              notes: input.notes || null,
            },
          });

          // Create Order Items
          const createdOrderItems: any[] = [];
          for (const item of preparedItems) {
            const orderItem = await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                tax: item.tax,
                discount: item.discount,
                notes: item.notes,
                department: item.department,
                status: TicketStatus.PENDING,
              },
            });
            createdOrderItems.push({ ...orderItem, name: item.name });
          }

          // Filter Kitchen items vs Bar items
          const kitchenItems = createdOrderItems.filter((i) => i.department === Department.KITCHEN);
          const barItems = createdOrderItems.filter((i) => i.department === Department.BAR);

          let createdKot: any = null;
          let createdBot: any = null;

          // Generate KOT for Kitchen Items
          if (kitchenItems.length > 0) {
            const kotNumber = await getNextKotNumber(tx, restaurant.kotPrefix);
            createdKot = await tx.kOT.create({
              data: {
                kotNumber,
                orderId: newOrder.id,
                tableNumber,
                waiterName,
                priority: TicketPriority.NORMAL,
                status: TicketStatus.PENDING,
              },
            });

            for (const kItem of kitchenItems) {
              await tx.kOTItem.create({
                data: {
                  kotId: createdKot.id,
                  orderItemId: kItem.id,
                  name: kItem.name,
                  quantity: kItem.quantity,
                  notes: kItem.notes,
                },
              });
            }
          }

          // Generate BOT for Bar Items
          if (barItems.length > 0) {
            const botNumber = await getNextBotNumber(tx, restaurant.botPrefix);
            createdBot = await tx.bOT.create({
              data: {
                botNumber,
                orderId: newOrder.id,
                tableNumber,
                waiterName,
                priority: TicketPriority.NORMAL,
                status: TicketStatus.PENDING,
              },
            });

            for (const bItem of barItems) {
              await tx.bOTItem.create({
                data: {
                  botId: createdBot.id,
                  orderItemId: bItem.id,
                  name: bItem.name,
                  quantity: bItem.quantity,
                  notes: bItem.notes,
                },
              });
            }
          }

          // Update Table Status to OCCUPIED if dine-in
          if (input.tableId && input.orderType !== OrderType.TAKEAWAY) {
            await tx.table.update({
              where: { id: input.tableId },
              data: { status: TableStatus.OCCUPIED },
            });
          }

          // Audit Log
          await tx.auditLog.create({
            data: {
              restaurantId,
              userId: input.waiterId || null,
              action: 'ORDER_CREATED',
              entity: 'ORDER',
              entityId: newOrder.id,
              details: JSON.stringify({
                orderNumber,
                grandTotal,
                kotGenerated: !!createdKot,
                botGenerated: !!createdBot,
              }),
            },
          });

          return {
            orderId: newOrder.id,
            kotId: createdKot?.id,
            botId: createdBot?.id,
          };
        }, { maxWait: 10000, timeout: 20000 });

        break;
      } catch (err: any) {
        if ((err?.code === 'P2002' || err?.code === 'P2028') && attempt < maxAttempts) {
          console.warn(`[OrderService] Race contention or pool acquisition retry (attempt ${attempt}/${maxAttempts}). Retrying...`);
          await new Promise((res) => setTimeout(res, 100 * attempt));
          continue;
        }
        throw err;
      }
    }

    // 7. Fetch full order for response and socket emission
    const fullOrder = await prisma.order.findUnique({
      where: { id: result.orderId },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
        customer: true,
        kots: { include: { items: true } },
        bots: { include: { items: true } },
      },
    });

    // 8. Emit Real-Time Socket.IO Events
    emitEvent('order.created', fullOrder);
    if (result.kotId) {
      const fullKot = await prisma.kOT.findUnique({
        where: { id: result.kotId },
        include: { items: true, order: { include: { table: true } } },
      });
      emitEvent('kot.created', fullKot);
    }
    if (result.botId) {
      const fullBot = await prisma.bOT.findUnique({
        where: { id: result.botId },
        include: { items: true, order: { include: { table: true } } },
      });
      emitEvent('bot.created', fullBot);
    }
    if (input.tableId) {
      const updatedTable = await prisma.table.findUnique({ where: { id: input.tableId } });
      emitEvent('table.updated', updatedTable);
    }

    return { order: fullOrder, isDuplicate: false };
  }

  /**
   * Add items to an existing order, recalculating totals and generating new KOT/BOT tickets.
   */
  static async addItemsToOrder(orderId: string, items: CreateOrderItemInput[], waiterId?: string) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true, restaurant: true },
    });
    if (!existingOrder) throw new Error('Order not found');
    if (existingOrder.status === OrderStatus.COMPLETED || existingOrder.status === OrderStatus.CANCELLED) {
      throw new Error('Cannot add items to a completed or cancelled order');
    }

    const restaurant = existingOrder.restaurant;
    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    const itemMap = new Map(dbMenuItems.map((item) => [item.id, item]));

    for (const reqItem of items) {
      if (!itemMap.has(reqItem.menuItemId)) {
        throw new Error(`Menu item with ID ${reqItem.menuItemId} was not found`);
      }
    }

    let addedSubtotal = 0;
    let addedTax = 0;

    const preparedItems = items.map((reqItem) => {
      const dbItem = itemMap.get(reqItem.menuItemId)!;
      const itemSubtotal = dbItem.price * reqItem.quantity;
      const itemTax = Math.round(itemSubtotal * (dbItem.taxPercent / 100) * 100) / 100;
      addedSubtotal += itemSubtotal;
      addedTax += itemTax;

      return {
        menuItemId: dbItem.id,
        quantity: reqItem.quantity,
        unitPrice: dbItem.price,
        tax: itemTax,
        discount: 0,
        notes: reqItem.notes || null,
        department: dbItem.department,
        status: TicketStatus.PENDING,
        name: dbItem.name,
      };
    });

    const newSubtotal = existingOrder.subtotal + addedSubtotal;
    const newTax = existingOrder.tax + addedTax;
    const newServiceCharge = Math.round(((newSubtotal - existingOrder.discount) * (restaurant.serviceChargeRate / 100)) * 100) / 100;
    const newGrandTotal = Math.max(0, Math.round((newSubtotal - existingOrder.discount + newTax + newServiceCharge) * 100) / 100);

    const tableNumber = existingOrder.table ? existingOrder.table.tableNumber : 'Walk-in';
    let waiterName = 'Staff';
    if (waiterId) {
      const waiter = await prisma.user.findUnique({ where: { id: waiterId } });
      if (waiter) waiterName = waiter.name;
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdItems: any[] = [];
      for (const item of preparedItems) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: existingOrder.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            tax: item.tax,
            discount: item.discount,
            notes: item.notes,
            department: item.department,
            status: TicketStatus.PENDING,
          },
        });
        createdItems.push({ ...orderItem, name: item.name });
      }

      await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          subtotal: newSubtotal,
          tax: newTax,
          serviceCharge: newServiceCharge,
          grandTotal: newGrandTotal,
        },
      });

      const kitchenItems = createdItems.filter((i) => i.department === Department.KITCHEN);
      const barItems = createdItems.filter((i) => i.department === Department.BAR);

      let createdKot: any = null;
      let createdBot: any = null;

      if (kitchenItems.length > 0) {
        const kotNumber = await getNextKotNumber(tx, restaurant.kotPrefix);
        createdKot = await tx.kOT.create({
          data: {
            kotNumber,
            orderId: existingOrder.id,
            tableNumber,
            waiterName,
            priority: TicketPriority.NORMAL,
            status: TicketStatus.PENDING,
          },
        });
        for (const kItem of kitchenItems) {
          await tx.kOTItem.create({
            data: {
              kotId: createdKot.id,
              orderItemId: kItem.id,
              name: kItem.name,
              quantity: kItem.quantity,
              notes: kItem.notes,
            },
          });
        }
      }

      if (barItems.length > 0) {
        const botNumber = await getNextBotNumber(tx, restaurant.botPrefix);
        createdBot = await tx.bOT.create({
          data: {
            botNumber,
            orderId: existingOrder.id,
            tableNumber,
            waiterName,
            priority: TicketPriority.NORMAL,
            status: TicketStatus.PENDING,
          },
        });
        for (const bItem of barItems) {
          await tx.bOTItem.create({
            data: {
              botId: createdBot.id,
              orderItemId: bItem.id,
              name: bItem.name,
              quantity: bItem.quantity,
              notes: bItem.notes,
            },
          });
        }
      }

      return { kotId: createdKot?.id, botId: createdBot?.id };
    });

    const fullOrder = await prisma.order.findUnique({
      where: { id: existingOrder.id },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
        customer: true,
        kots: { include: { items: true } },
        bots: { include: { items: true } },
      },
    });

    emitEvent('order.updated', fullOrder);
    if (result.kotId) {
      const fullKot = await prisma.kOT.findUnique({
        where: { id: result.kotId },
        include: { items: true, order: { include: { table: true } } },
      });
      emitEvent('kot.created', fullKot);
    }
    if (result.botId) {
      const fullBot = await prisma.bOT.findUnique({
        where: { id: result.botId },
        include: { items: true, order: { include: { table: true } } },
      });
      emitEvent('bot.created', fullBot);
    }

    return fullOrder;
  }
}
