# Stage 1: Install dependencies
# Salin prisma/ terlebih dahulu agar postinstall (prisma generate) bisa berjalan
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# Stage 2: Build aplikasi Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner (hanya file yang diperlukan)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Salin package info untuk runtime scripts
COPY package.json package-lock.json ./
# Salin node_modules dari builder (sudah include generated Prisma client)
COPY --from=builder /app/node_modules ./node_modules
# Salin hasil build Next.js
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
# Salin prisma schema untuk keperluan migrate deploy saat startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["npm", "run", "start"]
