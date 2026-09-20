import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.pgdata');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new PGlite(dataDir);
const server = new PGLiteSocketServer({
  db,
  host: '127.0.0.1',
  port: 5432,
  maxConnections: 64,
});

async function main() {
  await server.start();
  console.log(`[PGlite] PostgreSQL-compatible server listening on 127.0.0.1:5432 (data: ${dataDir})`);
}

main().catch((err) => {
  console.error('[PGlite] Failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('[PGlite] Shutting down...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[PGlite] Shutting down...');
  await server.stop();
  process.exit(0);
});
