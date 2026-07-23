# Stage 1: Install dependencies
# Salin prisma/ terlebih dahulu agar postinstall (prisma generate) bisa berjalan
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Dummy URL cukup untuk `prisma generate` (tidak connect ke DB)
ENV DATABASE_URL="postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public"
RUN npm ci

# Stage 2: Build aplikasi Next.js
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* harus tersedia saat build agar ter-inline ke client bundle
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy URL untuk generate; koneksi DB sungguhan hanya di runtime
ENV DATABASE_URL="postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public"

# src/generated/prisma di-gitignore → wajib generate ulang di image
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl curl

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Salin package info untuk runtime scripts
COPY package.json package-lock.json ./
# Salin node_modules dari builder (termasuk Prisma engines)
COPY --from=builder /app/node_modules ./node_modules
# Salin hasil build Next.js
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
# Prisma client custom output + schema/migrations
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
