import { RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

let pgServerInstance: any = null;
let keepAliveTimer: NodeJS.Timeout | null = null;

function isRemoteDatabase(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host !== '127.0.0.1' && host !== 'localhost' && !host.startsWith('127.');
  } catch (_) {
    return false;
  }
}

function sanitizeDbError(err: any): string {
  const msg = String(err?.message || err || 'Unknown database error');
  return msg.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1*****$3');
}

export function startDatabaseKeepAlive(): void {
  if (keepAliveTimer) return;
  // Ping database periodically to keep TCP connection alive and prevent peer reset timeouts
  keepAliveTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1 as keepalive`;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (
        msg.includes('Connection reset') ||
        msg.includes('code: 104') ||
        msg.includes('broken pipe') ||
        msg.includes('Connection closed')
      ) {
        console.warn('[Database] Keep-alive detected idle socket close; refreshing connection...');
        try {
          await (prisma as any).$disconnect?.();
          await prisma.$queryRaw`SELECT 1 as keepalive`;
          console.log('[Database] Reconnected successfully via keep-alive.');
        } catch (_) {}
      }
    }
  }, 30000); // 30 seconds to stay safely within cloud NAT and pooler timeout windows

  if (keepAliveTimer.unref) {
    keepAliveTimer.unref();
  }
}

export async function ensureStaffUsers(): Promise<void> {
  const staffToEnsure = [
    { username: 'admin', name: 'Alex Harrison (Admin)', role: RoleType.ADMIN, email: 'admin@smartpos.com' },
    { username: 'manager', name: 'Maria Santos (Manager)', role: RoleType.MANAGER, email: 'manager@smartpos.com' },
    { username: 'cashier', name: 'David Kim (Cashier)', role: RoleType.CASHIER, email: 'cashier@smartpos.com' },
    { username: 'waiter', name: 'Liam Walker (Waiter)', role: RoleType.WAITER, email: 'waiter@smartpos.com' },
    { username: 'kitchen', name: 'Chef Gordon (Kitchen)', role: RoleType.KITCHEN, email: 'kitchen@smartpos.com' },
    { username: 'bar', name: 'Bartender Sam (Bar)', role: RoleType.BAR, email: 'bar@smartpos.com' },
  ];

  try {
    let restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          name: 'Restaurant Smart POS & Bistro',
          currency: '$',
          defaultTaxRate: 8.5,
          serviceChargeRate: 5.0,
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    for (const staff of staffToEnsure) {
      let role = await prisma.role.findUnique({ where: { name: staff.role } });
      if (!role) {
        role = await prisma.role.create({
          data: {
            name: staff.role,
            description: `${staff.role} role with designated permissions.`,
          },
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { username: staff.username } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            restaurantId: restaurant.id,
            roleId: role.id,
            name: staff.name,
            username: staff.username,
            email: staff.email,
            phone: '+1 555-0199',
            password: hashedPassword,
            isActive: true,
          },
        });
        console.log(`[Database] Seeded missing staff demo user: ${staff.username}`);
      } else if (!existingUser.isActive || !existingUser.password.startsWith('$2')) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            isActive: true,
            roleId: role.id,
          },
        });
        console.log(`[Database] Synchronized staff demo user credentials: ${staff.username}`);
      }
    }
  } catch (err: any) {
    console.warn('[Database] Note on ensureStaffUsers:', sanitizeDbError(err));
  }
}

export async function ensureDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!dbUrl) {
      throw new Error('[Database] FATAL: DATABASE_URL is required in production for Supabase PostgreSQL.');
    }
    console.log('[Database] Production mode: Verifying Supabase PostgreSQL connection...');
    try {
      await prisma.$queryRaw`SELECT 1 as connected`;
      await ensureStaffUsers();
      const userCount = await prisma.user.count();
      console.log(`[Database] Supabase PostgreSQL connected successfully (${userCount} verified users).`);
      startDatabaseKeepAlive();
    } catch (err: any) {
      console.error('[Database] Supabase PostgreSQL connection verification failed:', sanitizeDbError(err));
      throw new Error('[Database] Could not connect to Supabase PostgreSQL database in production.');
    }
    return;
  }

  // If connected to Supabase or a remote PostgreSQL database in development:
  if (isRemoteDatabase(dbUrl)) {
    // Ensure any previously running local PGlite instance is stopped
    if (pgServerInstance) {
      try {
        await pgServerInstance.stop();
        pgServerInstance = null;
        console.log('[Database] Local PGlite instance stopped; switching exclusively to Supabase PostgreSQL.');
      } catch (_) {}
    }

    console.log('[Database] Connecting to remote Supabase PostgreSQL database...');

    // Harmless connectivity test: SELECT 1
    try {
      await prisma.$queryRaw`SELECT 1 as connected`;
      console.log('[Database] Supabase PostgreSQL connectivity test: SUCCESS (SELECT 1).');

      // Verify accessible tables
      const userCount = await prisma.user.count();
      console.log(`[Database] Supabase PostgreSQL active with ${userCount} verified users.`);
      startDatabaseKeepAlive();
    } catch (err: any) {
      console.error('[Database] Supabase PostgreSQL connection error:', sanitizeDbError(err));
      throw err;
    }
    return;
  }

  // Local fallback mode (only used in development if no remote DATABASE_URL is configured)
  console.log('[Database] Development mode: No remote DATABASE_URL configured; running in local fallback mode.');
}

