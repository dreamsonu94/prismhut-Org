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

