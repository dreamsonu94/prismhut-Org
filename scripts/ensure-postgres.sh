#!/bin/bash
# Check if a postgres-compatible server is already running on port 5432
if node -e "const net = require('net'); const s = net.createConnection({ host: '127.0.0.1', port: 5432 }, () => { s.end(); process.exit(0); }); s.on('error', () => process.exit(1));" 2>/dev/null; then
  echo "PostgreSQL service is already running on port 5432."
  exit 0
fi

echo "Starting embedded PostgreSQL-compatible server..."
npx tsx scripts/pg-server.ts > /tmp/pg-server.log 2>&1 &
PID=$!
echo "Started embedded PG server PID $PID"

# Wait up to 10 seconds for port 5432
for i in {1..20}; do
  if node -e "const net = require('net'); const s = net.createConnection({ host: '127.0.0.1', port: 5432 }, () => { s.end(); process.exit(0); }); s.on('error', () => process.exit(1));" 2>/dev/null; then
    echo "PostgreSQL service is ready on 127.0.0.1:5432."
    exit 0
  fi
  sleep 0.5
done

echo "Warning: Timeout waiting for PostgreSQL on port 5432"

