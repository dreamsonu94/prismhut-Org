import { PrismaClient } from '@prisma/client';

declare global {
  var _prisma: PrismaClient | undefined;
}

const dbUrl = process.env.DATABASE_URL;

export const prisma =
  global._prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global._prisma = prisma;
}
