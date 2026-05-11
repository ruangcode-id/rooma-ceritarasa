import { auth } from "@/auth";
import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-envelope";

export async function requireAdminApiSession(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: jsonError("Unauthorized", 401),
    };
  }
  if (session.user.role !== "admin" && session.user.role !== "owner") {
    return {
      ok: false,
      response: jsonError("Forbidden", 403),
    };
  }
  return { ok: true, userId: session.user.id };
}
