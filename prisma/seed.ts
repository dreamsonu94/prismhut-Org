import { PrismaClient, RoleType, TableStatus, Department, TicketPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Seeding Restaurant Smart POS database...');

  // 1. Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.kOTItem.deleteMany();
  await prisma.kOT.deleteMany();
  await prisma.bOTItem.deleteMany();
  await prisma.bOT.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.menuItemImage.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.table.deleteMany();
  await prisma.tableSection.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.restaurant.deleteMany();

  // 2. Create Restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Restaurant Smart POS & Bistro',
      logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=120&h=120&fit=crop&q=80',
      address: '742 Evergreen Terrace, Suite 100, Metropolis',
      phone: '+1 (555) 382-9011',
      email: 'contact@smartposbistro.com',
      currency: '$',
      defaultTaxRate: 8.5,
      serviceChargeRate: 5.0,
      invoicePrefix: 'INV-',
      kotPrefix: 'KOT-',
      botPrefix: 'BOT-',
    },
  });

  // 3. Create Roles
  const roleTypes: RoleType[] = [
    RoleType.SUPER_ADMIN,
    RoleType.ADMIN,
    RoleType.MANAGER,
    RoleType.CASHIER,
    RoleType.WAITER,
    RoleType.KITCHEN,
    RoleType.BAR,
  ];

  const createdRoles: Record<RoleType, string> = {} as any;
  for (const roleType of roleTypes) {
    const role = await prisma.role.create({
      data: {
        name: roleType,
        description: `${roleType.replace('_', ' ')} role with designated permissions.`,
      },
    });
    createdRoles[roleType] = role.id;
  }

  // 4. Create Users (Standard password: password123)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const defaultUsers = [
    { username: 'superadmin', name: 'Super Admin', email: 'superadmin@smartpos.com', role: RoleType.SUPER_ADMIN },
    { username: 'admin', name: 'Alex Harrison (Admin)', email: 'admin@smartpos.com', role: RoleType.ADMIN },
    { username: 'manager', name: 'Maria Santos (Manager)', email: 'manager@smartpos.com', role: RoleType.MANAGER },
    { username: 'cashier', name: 'David Kim (Cashier)', email: 'cashier@smartpos.com', role: RoleType.CASHIER },
    { username: 'waiter', name: 'Liam Walker (Waiter)', email: 'waiter@smartpos.com', role: RoleType.WAITER },
    { username: 'waiter2', name: 'Emma Watson (Waiter)', email: 'waiter2@smartpos.com', role: RoleType.WAITER },
    { username: 'kitchen', name: 'Chef Gordon (Kitchen)', email: 'kitchen@smartpos.com', role: RoleType.KITCHEN },
    { username: 'bar', name: 'Bartender Sam (Bar)', email: 'bar@smartpos.com', role: RoleType.BAR },
  ];

  const userMap: Record<string, string> = {};
  for (const u of defaultUsers) {
    const createdUser = await prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        roleId: createdRoles[u.role],
        name: u.name,
        username: u.username,
        email: u.email,
        phone: '+1 555-0199',
        password: hashedPassword,
        isActive: true,
      },
    });
    userMap[u.username] = createdUser.id;
  }

  // 5. Create Table Sections & Tables
  const sectionMain = await prisma.tableSection.create({
    data: { restaurantId: restaurant.id, name: 'Main Dining Hall', description: 'Central indoor dining area' },
  });
  const sectionPatio = await prisma.tableSection.create({
    data: { restaurantId: restaurant.id, name: 'Open-Air Patio', description: 'Terrace garden with outdoor ambiance' },
  });
  const sectionLounge = await prisma.tableSection.create({
    data: { restaurantId: restaurant.id, name: 'VIP & Lounge', description: 'Cozy booths and elevated bar lounge' },
  });

  const tablesData = [
    { number: 'T-01', name: 'Table 1', capacity: 2, sectionId: sectionMain.id, status: TableStatus.AVAILABLE },
    { number: 'T-02', name: 'Table 2', capacity: 4, sectionId: sectionMain.id, status: TableStatus.OCCUPIED },
    { number: 'T-03', name: 'Table 3', capacity: 4, sectionId: sectionMain.id, status: TableStatus.AVAILABLE },
    { number: 'T-04', name: 'Table 4', capacity: 6, sectionId: sectionMain.id, status: TableStatus.RESERVED },
    { number: 'T-05', name: 'Table 5', capacity: 4, sectionId: sectionMain.id, status: TableStatus.AVAILABLE },
    { number: 'T-06', name: 'Table 6', capacity: 8, sectionId: sectionMain.id, status: TableStatus.AVAILABLE },
    { number: 'P-01', name: 'Patio 1', capacity: 2, sectionId: sectionPatio.id, status: TableStatus.AVAILABLE },
    { number: 'P-02', name: 'Patio 2', capacity: 4, sectionId: sectionPatio.id, status: TableStatus.OCCUPIED },
    { number: 'P-03', name: 'Patio 3', capacity: 4, sectionId: sectionPatio.id, status: TableStatus.CLEANING },
    { number: 'L-01', name: 'Lounge Booth 1', capacity: 6, sectionId: sectionLounge.id, status: TableStatus.AVAILABLE },
    { number: 'L-02', name: 'Lounge Booth 2', capacity: 6, sectionId: sectionLounge.id, status: TableStatus.AVAILABLE },
    { number: 'B-01', name: 'Bar Counter 1', capacity: 2, sectionId: sectionLounge.id, status: TableStatus.AVAILABLE },
  ];

  const tableMap: Record<string, string> = {};
  for (const t of tablesData) {
    const table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        sectionId: t.sectionId,
        tableNumber: t.number,
        tableName: t.name,
        capacity: t.capacity,
        status: t.status,
      },
    });
    tableMap[t.number] = table.id;
  }

  // 6. Create Menu Categories
  const catFood = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Food', description: 'Artisan mains, pasta, and bowls', sortOrder: 1 },
  });
  const catDrinks = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Drinks', description: 'Cocktails, beers, wine, and craft sodas', sortOrder: 2 },
  });
  const catSnacks = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Snacks', description: 'Starters, tapas, and crispy sides', sortOrder: 3 },
  });
  const catDesserts = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Desserts', description: 'Pastries, gelato, and sweet delights', sortOrder: 4 },
  });
  const catOther = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Other', description: 'Specialty additions and merchandise', sortOrder: 5 },
  });

  // 7. Create Menu Items
  const menuItems = [
    // FOOD -> Department KITCHEN
    {
      name: 'Chicken Chowmein',
      description: 'Wok-tossed noodles with shredded chicken breast, bell peppers, scallions, and savory chili garlic soy.',
      sku: 'FOD-CHK-01',
      price: 14.50,
      taxPercent: 8.5,
      categoryId: catFood.id,
      imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
      isVegetarian: false,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 12,
    },
    {
      name: 'Signature Angus Burger',
      description: 'Prime dry-aged Angus beef, aged cheddar, caramelized shallots, crisp butter lettuce on brioche.',
      sku: 'FOD-BGR-02',
      price: 16.00,
      taxPercent: 8.5,
      categoryId: catFood.id,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      isVegetarian: false,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 15,
    },
    {
      name: 'Truffle Margherita Pizza',
      description: 'San Marzano tomato base, Fior di Latte mozzarella, fresh basil, extra virgin olive oil, and black truffle drizzle.',
      sku: 'FOD-PIZ-03',
      price: 18.00,
      taxPercent: 8.5,
      categoryId: catFood.id,
      imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 14,
    },
    {
      name: 'Grilled Salmon Bowl',
      description: 'Pan-seared Atlantic salmon fillet, quinoa, avocado slices, edamame, sesame ginger dressing.',
      sku: 'FOD-SLM-04',
      price: 21.00,
      taxPercent: 8.5,
      categoryId: catFood.id,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      isVegetarian: false,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 18,
    },

    // SNACKS -> Department KITCHEN
    {
      name: 'Crispy Truffle Parmesan Fries',
      description: 'Hand-cut russet potatoes tossed with white truffle essence, sea salt, aged parmesan, and rosemary aioli.',
      sku: 'SNK-FRS-01',
      price: 8.50,
      taxPercent: 8.5,
      categoryId: catSnacks.id,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 8,
    },
    {
      name: 'Spicy Buffalo Wings (8pcs)',
      description: 'Crispy jumbo wings glazed in smoky cayenne butter sauce, served with blue cheese dip and crisp celery.',
      sku: 'SNK-WNG-02',
      price: 13.00,
      taxPercent: 8.5,
      categoryId: catSnacks.id,
      imageUrl: 'https://images.unsplash.com/photo-1527477248705-240722423224?w=600&auto=format&fit=crop&q=80',
      isVegetarian: false,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 12,
    },

    // DRINKS -> Department BAR
    {
      name: 'Classic Coca Cola (330ml)',
      description: 'Chilled glass bottle served with lime wedge and crystal rock ice.',
      sku: 'DRK-COK-01',
      price: 3.50,
      taxPercent: 8.5,
      categoryId: catDrinks.id,
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.BAR,
      preparationTime: 2,
    },
    {
      name: 'Artisan Smoked Old Fashioned',
      description: 'Kentucky Bourbon, Angostura aromatic bitters, caramelized sugar cube, torched orange peel and aromatic smoke.',
      sku: 'DRK-BAR-02',
      price: 14.00,
      taxPercent: 8.5,
      categoryId: catDrinks.id,
      imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.BAR,
      preparationTime: 5,
    },
    {
      name: 'Fresh Mint Mojito',
      description: 'White rum, fresh lime juice, crushed garden mint, pure cane syrup, sparkling soda.',
      sku: 'DRK-MOJ-03',
      price: 12.00,
      taxPercent: 8.5,
      categoryId: catDrinks.id,
      imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.BAR,
      preparationTime: 4,
    },
    {
      name: 'Craft IPA Draft Beer (Pint)',
      description: 'Hazy New England IPA with tropical citrus notes and a velvety smooth finish.',
      sku: 'DRK-IPA-04',
      price: 8.00,
      taxPercent: 8.5,
      categoryId: catDrinks.id,
      imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.BAR,
      preparationTime: 3,
    },

    // DESSERTS -> Department KITCHEN
    {
      name: 'Molten Lava Chocolate Cake',
      description: 'Warm Belgian dark chocolate core, vanilla bean gelato, and freeze-dried raspberry dusting.',
      sku: 'DST-LAV-01',
      price: 9.50,
      taxPercent: 8.5,
      categoryId: catDesserts.id,
      imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 10,
    },
    {
      name: 'Classic Venetian Tiramisu',
      description: 'Espresso-soaked Savoiardi ladyfingers, rich mascarpone sabayon, dusting of Valrhona cocoa.',
      sku: 'DST-TIR-02',
      price: 8.50,
      taxPercent: 8.5,
      categoryId: catDesserts.id,
      imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
      isVegetarian: true,
      isAvailable: true,
      department: Department.KITCHEN,
      preparationTime: 5,
    },
  ];

  const itemMap: Record<string, string> = {};
  for (const item of menuItems) {
    const createdItem = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        ...item,
      },
    });
    itemMap[item.name] = createdItem.id;
  }

  // 8. Create Discounts & Taxes
  await prisma.tax.createMany({
    data: [
      { name: 'Standard Sales Tax (8.5%)', rate: 8.5, isDefault: true },
      { name: 'Reduced Beverage Tax (5.0%)', rate: 5.0, isDefault: false },
    ],
  });

  await prisma.discount.createMany({
    data: [
      { code: 'HAPPYHOUR15', name: 'Happy Hour (15% Off)', percentage: 15.0, isActive: true },
      { code: 'VIP10', name: 'VIP Guest Discount ($10)', fixedAmount: 10.0, isActive: true },
      { code: 'STAFF20', name: 'Staff Courtesy (20% Off)', percentage: 20.0, isActive: true },
    ],
  });

  // 9. Create Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Jonathan Miller',
      phone: '+1 555-482-1100',
      email: 'j.miller@example.com',
    },
  });
  const customer2 = await prisma.customer.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Sophia Chen',
      phone: '+1 555-912-3344',
      email: 'sophia.chen@example.com',
    },
  });

  // 10. Seed an active order with KOT and BOT (as requested in test specification!)
  // Order: 2 Chicken Chowmein, 1 Burger, 2 Coke -> Table T-02
  const orderNumber = 'ORD-1001';
  const itemChowmein = await prisma.menuItem.findFirst({ where: { name: 'Chicken Chowmein' } });
  const itemBurger = await prisma.menuItem.findFirst({ where: { name: 'Signature Angus Burger' } });
  const itemCoke = await prisma.menuItem.findFirst({ where: { name: 'Classic Coca Cola (330ml)' } });

  if (itemChowmein && itemBurger && itemCoke) {
    const subtotal = (itemChowmein.price * 2) + (itemBurger.price * 1) + (itemCoke.price * 2); // 29 + 16 + 7 = 52
    const tax = Math.round(subtotal * 0.085 * 100) / 100; // 4.42
    const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100; // 2.60
    const grandTotal = subtotal + tax + serviceCharge;

    const sampleOrder = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        orderNumber,
        tableId: tableMap['T-02'],
        waiterId: userMap['waiter'],
        customerId: customer1.id,
        guestCount: 3,
        orderType: 'DINE_IN',
        status: 'PREPARING',
        subtotal,
        discount: 0,
        tax,
        serviceCharge,
        grandTotal,
        notes: 'Chowmein less spicy, coke with lemon',
      },
    });

    // Create Order Items
    const oi1 = await prisma.orderItem.create({
      data: {
        orderId: sampleOrder.id,
        menuItemId: itemChowmein.id,
        quantity: 2,
        unitPrice: itemChowmein.price,
        tax: Math.round(itemChowmein.price * 2 * 0.085 * 100) / 100,
        notes: 'Less spicy',
        department: Department.KITCHEN,
        status: 'PREPARING',
      },
    });

    const oi2 = await prisma.orderItem.create({
      data: {
        orderId: sampleOrder.id,
        menuItemId: itemBurger.id,
        quantity: 1,
        unitPrice: itemBurger.price,
        tax: Math.round(itemBurger.price * 0.085 * 100) / 100,
        notes: 'Medium rare',
        department: Department.KITCHEN,
        status: 'PREPARING',
      },
    });

    const oi3 = await prisma.orderItem.create({
      data: {
        orderId: sampleOrder.id,
        menuItemId: itemCoke.id,
        quantity: 2,
        unitPrice: itemCoke.price,
        tax: Math.round(itemCoke.price * 2 * 0.085 * 100) / 100,
        notes: 'Served with lemon slice',
        department: Department.BAR,
        status: 'READY',
      },
    });

    // KOT for Kitchen Items: 2 Chowmein, 1 Burger
    const kot = await prisma.kOT.create({
      data: {
        kotNumber: 'KOT-1001',
        orderId: sampleOrder.id,
        tableNumber: 'T-02',
        waiterName: 'Liam Walker (Waiter)',
        priority: TicketPriority.NORMAL,
        status: 'PREPARING',
      },
    });

    await prisma.kOTItem.create({
      data: {
        kotId: kot.id,
        orderItemId: oi1.id,
        name: itemChowmein.name,
        quantity: 2,
        notes: 'Less spicy',
      },
    });

    await prisma.kOTItem.create({
      data: {
        kotId: kot.id,
        orderItemId: oi2.id,
        name: itemBurger.name,
        quantity: 1,
        notes: 'Medium rare',
      },
    });

    // BOT for Bar Items: 2 Coke
    const bot = await prisma.bOT.create({
      data: {
        botNumber: 'BOT-1001',
        orderId: sampleOrder.id,
        tableNumber: 'T-02',
        waiterName: 'Liam Walker (Waiter)',
        priority: TicketPriority.NORMAL,
        status: 'READY',
      },
    });

    await prisma.bOTItem.create({
      data: {
        botId: bot.id,
        orderItemId: oi3.id,
        name: itemCoke.name,
        quantity: 2,
        notes: 'Served with lemon slice',
      },
    });
  }

  // Seed a completed order with payment & invoice for reports
  const completedOrder = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 'ORD-1000',
      tableId: tableMap['T-01'],
      waiterId: userMap['waiter'],
      customerId: customer2.id,
      guestCount: 2,
      orderType: 'DINE_IN',
      status: 'COMPLETED',
      subtotal: 42.0,
      discount: 4.2,
      tax: 3.21,
      serviceCharge: 2.1,
      grandTotal: 43.11,
      createdAt: new Date(Date.now() - 3600 * 1000 * 3), // 3 hours ago
    },
  });

  await prisma.payment.create({
    data: {
      orderId: completedOrder.id,
      amount: 43.11,
      method: 'CARD',
      status: 'PAID',
      paidAt: new Date(Date.now() - 3600 * 1000 * 2),
      referenceNumber: 'TXN-98412498',
    },
  });

  await prisma.invoice.create({
    data: {
      restaurantId: restaurant.id,
      orderId: completedOrder.id,
      invoiceNumber: 'INV-1000',
      subtotal: 42.0,
      discount: 4.2,
      tax: 3.21,
      serviceCharge: 2.1,
      grandTotal: 43.11,
      paymentMethod: 'CARD',
      paidStatus: 'PAID',
      customerName: 'Sophia Chen',
      tableName: 'Table 1',
      waiterName: 'Liam Walker (Waiter)',
      createdAt: new Date(Date.now() - 3600 * 1000 * 2),
    },
  });

  console.log('Database seeded successfully!');
}

// Allow standalone execution
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
