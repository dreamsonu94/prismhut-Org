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
      url.searchParams.set('connection_limit', '5');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '15');
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
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global._rawPrisma = basePrisma;
}

function isConnectionReset(err: any): boolean {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('Connection reset by peer') ||
    msg.includes('code: 104') ||
    msg.includes('Connection closed') ||
    msg.includes('connection closed') ||
    msg.includes('broken pipe') ||
    msg.includes('Can\'t reach database server') ||
    msg.includes('P1001') ||
    msg.includes('P1017')
  );
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


