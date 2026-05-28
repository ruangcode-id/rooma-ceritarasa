# AGENTS.md — Rooma Ceritarasa

Baca file ini **sebelum menulis kode apapun**. Proyek ini menggunakan versi-versi spesifik yang memiliki breaking changes dari versi sebelumnya. Selalu ikuti konvensi yang tertulis di sini.

---

## Tech Stack & Versi

| Teknologi        | Versi         | Catatan                                      |
| ---------------- | ------------- | -------------------------------------------- |
| Next.js          | **16.2.4**    | App Router. Docs: `node_modules/next/dist/docs/` |
| React            | **19.2.4**    | Server Components by default                 |
| TypeScript       | **^5**        | Strict mode                                  |
| Prisma           | **^7.8.0**    | Output ke `src/generated/prisma`             |
| Tailwind CSS     | **^4**        | Breaking changes dari v3 — baca catatan CSS  |
| NextAuth.js      | **^5.0.0-beta.31** | Auth.js v5 — bukan next-auth v4         |
| Zod              | **^4.3.6**    | Breaking changes dari v3                     |
| Midtrans Client  | **^1.4.3**    |                                              |
| web-push         | **^3.6.7**    | Push notification VAPID                      |

---

## Next.js 16 — Breaking Changes Wajib Diketahui

### 1. `params` dan `searchParams` adalah Promise (sejak v15)

**❌ SALAH (cara lama / v14):**
```tsx
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params // ❌ Error di v15+
}
```

**✅ BENAR:**
```tsx
// Server Component (async)
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params // ✅
}

// Client Component (tidak bisa async)
'use client'
import { use } from 'react'
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params) // ✅
}
```

Sama berlaku untuk `searchParams`:
```tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { page } = await searchParams // ✅
}
```

**Gunakan PageProps helper** (tersedia secara global setelah `next dev`/`next build`):
```tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
}
```

---

### 2. Route Handler — `context.params` adalah Promise (sejak v15)

**❌ SALAH:**
```ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params // ❌
}
```

**✅ BENAR:**
```ts
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // ✅
}

// Atau gunakan RouteContext helper:
export async function GET(req: NextRequest, ctx: RouteContext<'/api/items/[id]'>) {
  const { id } = await ctx.params // ✅
}
```

---

### 3. `cookies()` dan `headers()` adalah async (sejak v15)

**❌ SALAH:**
```ts
import { cookies } from 'next/headers'
const cookieStore = cookies() // ❌ Masih bisa tapi akan deprecated
```

**✅ BENAR:**
```ts
import { cookies } from 'next/headers'
const cookieStore = await cookies() // ✅
const token = cookieStore.get('token')
```

Sama untuk `headers()`:
```ts
import { headers } from 'next/headers'
const headersList = await headers() // ✅
```

---

### 4. Routing — App Router ONLY

Proyek ini menggunakan **App Router** (`src/app/`). Jangan buat file di `pages/`.

Struktur file konvensi:
- `app/[route]/page.tsx` — UI halaman
- `app/[route]/layout.tsx` — Layout (tidak re-render saat navigasi)
- `app/[route]/route.ts` — API Route Handler
- `app/[route]/loading.tsx` — Loading UI (Suspense boundary)
- `app/[route]/error.tsx` — Error boundary
- `app/(group)/` — Route groups (tidak mempengaruhi URL)

---

### 5. `useRouter` — Import dari `next/navigation` (BUKAN `next/router`)

```tsx
// ❌ SALAH
import { useRouter } from 'next/router'

// ✅ BENAR
import { useRouter } from 'next/navigation'
```

Hook navigasi lainnya dari `next/navigation`:
- `usePathname()` — ganti `router.pathname`
- `useSearchParams()` — ganti `router.query`
- `useParams()` — akses dynamic route params di Client Component

---

### 6. Default Caching GET Handler — Dynamic (sejak v15)

GET Route Handler **tidak lagi di-cache secara default**. Tidak perlu menambahkan `{ cache: 'no-store' }` secara eksplisit pada setiap fetch internal.

---

### 7. `redirect()` — Jangan di dalam `try/catch`

```ts
// ❌ SALAH — redirect di dalam try block
try {
  redirect('/login') // Akan dicatch sebagai error
} catch (e) { ... }

// ✅ BENAR — redirect di luar try block
if (!user) redirect('/login')

try {
  // logic lain
} catch (e) { ... }
```

---

## Prisma v7 — Catatan Penting

- Client output: `src/generated/prisma` (bukan `node_modules/@prisma/client`)
- Import dari: `@/generated/prisma` (bukan `@prisma/client`)
- Setelah mengubah schema, jalankan: `npx prisma generate`
- Konfigurasi ada di `prisma.config.ts`

```ts
// ✅ Import Prisma yang benar di proyek ini
import { PrismaClient } from '@/generated/prisma'
// atau melalui singleton di:
import { prisma } from '@/infrastructure/database/prisma'
```

---

## NextAuth.js v5 (Auth.js) — Breaking Changes dari v4

- Export dari `src/auth.ts`, bukan dari `next-auth`
- Gunakan `auth()` dari `@/auth` untuk session di Server Components
- Middleware: gunakan `auth` sebagai middleware handler
- Session strategy: **JWT** (bukan database sessions)

```ts
// Di Server Component / Route Handler:
import { auth } from '@/auth'
const session = await auth()

// Di Client Component:
import { useSession } from 'next-auth/react'
```

---

## Zod v4 — Breaking Changes dari v3

- `z.string().nonempty()` → **dihapus**, gunakan `z.string().min(1)`
- Error formatting berubah: gunakan `.error()` bukan `.message`
- `z.object()` strict mode berubah

---

## Tailwind CSS v4 — Breaking Changes dari v3

- **Tidak ada `tailwind.config.js`** — konfigurasi via CSS (`@theme`)
- Import di CSS: `@import "tailwindcss"` (bukan `@tailwind base/components/utilities`)
- Kelas yang berubah: lihat `node_modules/next/dist/docs/01-app/02-guides/tailwind-v3-css.md` untuk migrasi dari v3
- Untuk menggunakan v3 CSS compat: baca panduan di path tersebut

---

## Struktur Proyek

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/admin/      # Route group admin
│   ├── (owner)/owner/      # Route group owner
│   ├── (public)/           # Route group public
│   └── api/                # API Route Handlers
├── application/use-cases/  # Use case / business logic
├── features/               # Service layer (reservation, payment, dll)
├── infrastructure/         # Repositories, database, push-notif
├── validations/            # Zod schemas
├── types/                  # Shared TypeScript types
├── shared/                 # Shared utilities
├── auth.ts                 # NextAuth config & exports
└── auth.config.ts          # Auth config (tanpa adapter, untuk middleware)
```

---

## Perintah Penting

```bash
npm run dev          # Jalankan dev server (Turbopack)
npx prisma generate  # Generate Prisma client setelah ubah schema
npx prisma db push   # Push schema ke database
npm run build        # Build production
npm run lint         # Lint dengan ESLint v9
```

---

## Referensi Docs Lokal

Semua dokumentasi Next.js 16 tersedia di `node_modules/next/dist/docs/`:

```
node_modules/next/dist/docs/
├── 01-app/
│   ├── 02-guides/          # Panduan (auth, forms, redirecting, dll)
│   └── 03-api-reference/
│       ├── 03-file-conventions/  # page, layout, route, dynamic-routes, dll
│       └── 04-functions/         # cookies, headers, redirect, useRouter, dll
```

**Selalu baca docs lokal sebelum menulis kode** — API bisa berbeda dari training data.
