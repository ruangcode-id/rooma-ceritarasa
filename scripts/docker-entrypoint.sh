#!/bin/sh
set -eu

echo "[entrypoint] Waiting for database..."
# Prisma migrate deploy will retry via connection errors; give Postgres a short head-start.
sleep 2

echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] Starting Next.js on port ${PORT:-3000}..."
exec npm run start
