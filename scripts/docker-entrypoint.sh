#!/bin/sh
set -eu

# Bangun DATABASE_URL dengan password ter-encode agar karakter @ : / % aman.
if [ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${POSTGRES_USER:-}" ] && [ -n "${POSTGRES_DB:-}" ]; then
  ENCODED_USER=$(node -e "process.stdout.write(encodeURIComponent(process.env.POSTGRES_USER || ''))")
  ENCODED_PASSWORD=$(node -e "process.stdout.write(encodeURIComponent(process.env.POSTGRES_PASSWORD || ''))")
  ENCODED_DB=$(node -e "process.stdout.write(encodeURIComponent(process.env.POSTGRES_DB || ''))")
  export DATABASE_URL="postgresql://${ENCODED_USER}:${ENCODED_PASSWORD}@db:5432/${ENCODED_DB}?schema=public"
  echo "[entrypoint] DATABASE_URL built from POSTGRES_* (credentials URL-encoded)"
fi

echo "[entrypoint] Waiting for database..."
# Prisma migrate deploy will retry via connection errors; give Postgres a short head-start.
sleep 2

echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] Starting Next.js on port ${PORT:-3000}..."
exec npm run start
