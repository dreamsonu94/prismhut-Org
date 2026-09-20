import { PrismaClient } from '@prisma/client';

declare global {
  var _rawPrisma: PrismaClient | undefined;
  var _prisma: any | undefined;
}

function configureDbUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    // Ensure optimal connection pool settings to prevent idle socket drop and peer resets
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '3');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '15');
    }
    if (!url.searchParams.has('socket_timeout')) {
      url.searchParams.set('socket_timeout', '45');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const configuredUrl = configureDbUrl(process.env.DATABASE_URL);

const basePrisma =
  global._rawPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: configuredUrl,
      },
    },
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

function isConnectionReset(err: any): boolean {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('Connection reset by peer') ||
    msg.includes('code: 104') ||
    msg.includes('ConnectionReset') ||
    msg.includes('Connection closed') ||
    msg.includes('connection closed') ||
    msg.includes('broken pipe') ||
    msg.includes('Can\'t reach database server') ||
    msg.includes('P1001') ||
    msg.includes('P1017')
  );
}

// Intercept low-level Prisma engine logs to handle connection resets gracefully
(basePrisma as any).$on?.('error', (e: any) => {
  const msg = String(e?.message || '');
  if (isConnectionReset(msg)) {
    // Gracefully handle socket reset without crashing or polluting error logs
    return;
  }
  console.error('[Prisma Error]', msg);
});

(basePrisma as any).$on?.('warn', (e: any) => {
  const msg = String(e?.message || '');
  if (isConnectionReset(msg)) {
    return;
  }
  console.warn('[Prisma Warn]', msg);
});

if (process.env.NODE_ENV !== 'production') {
  global._rawPrisma = basePrisma;
}

export const prisma: PrismaClient =
  global._prisma ||
  (basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          try {
            return await query(args);
          } catch (error: any) {
            if (isConnectionReset(error)) {
              console.warn(`[Prisma] Connection reset detected on ${String(model)}.${operation}. Reconnecting and retrying...`);
              try {
                await basePrisma.$disconnect();
              } catch (_) {}
              return await query(args);
            }
            throw error;
          }
        },
      },
    },
  }) as unknown as PrismaClient);

if (process.env.NODE_ENV !== 'production') {
  global._prisma = prisma;
}


