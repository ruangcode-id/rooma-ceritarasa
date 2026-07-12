# Rooma Ceritarasa

Next.js + Prisma project for Rooma Ceritarasa.

## Prerequisites

- Node.js 20+
- npm
- Docker + Docker Compose plugin (`docker compose`)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

Note: the dev Docker compose maps Postgres to `localhost:5433`.

3. Start PostgreSQL container:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

4. Run Prisma migration:

```bash
npx prisma migrate dev --name init
```

5. Generate Prisma client:

```bash
npx prisma generate
```

6. Start Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Commands

- Start DB:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

- Stop DB:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

- Stop DB and remove volume (reset local database):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

## Troubleshooting

- Docker permission denied (`/var/run/docker.sock`):
  - Use `sudo` temporarily, or
  - Add user to docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

- Prisma error `P1000` (authentication failed):
  - Ensure `.env` `DATABASE_URL` credentials match `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in `docker-compose.yml`.

## Scripts

Utility scripts for first-time setup (local dev or VPS deployment). Run after database is up and migrations have been applied.

### Seed default restaurant settings & sessions

Run **once** when setting up a fresh database:

```bash
npx tsx scripts/seed-settings.ts
```

This creates the default restaurant settings (name, address, contact) and 3 operational sessions (15:00, 17:30, 20:00).

### Create the first Owner account

```bash
npx tsx scripts/create-owner.ts "Nama Owner" "owner@rooma.com" "password-kuat"
```

### Create an Admin account

```bash
npx tsx scripts/create-admin.ts "Nama Admin" "admin@rooma.com" "password-kuat"
```

> **Note:** These scripts require a valid `.env` with `DATABASE_URL` pointing to a running PostgreSQL instance.

## Notes

- Do not commit `.env`.
- Commit `.env.example` for team onboarding.

