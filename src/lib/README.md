# Server Auth Helpers

Dokumen singkat untuk helper auth yang dipakai lintas tim.

## Helpers

- `getCurrentUser()`
  - Server-only helper untuk mengambil `session.user` via `auth()`.

- `requireRole(allowedRoles)`
  - Server-only helper untuk memastikan user login dan memiliki role yang diizinkan.
  - Jika tidak login → throw error (Unauthorized).
  - Jika role tidak sesuai → throw error (Forbidden).

## Contoh pemakaian

### Route Handler

```ts
import { requireRole } from "@/lib/auth";

export async function POST() {
  await requireRole(["admin", "owner"]);
  // ...logic
}
```

### Server Component

```ts
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();
  return <pre>{JSON.stringify(session?.user, null, 2)}</pre>;
}
```
