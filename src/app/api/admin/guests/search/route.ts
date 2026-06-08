import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { findManyGuestsPaginated } from "@/infrastructure/repositories/admin-guest.repository";
import { guestListRowToJson } from "@/lib/guest-response";

function normalizePhoneQuery(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("62")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();

  if (!q) {
    return jsonError("Query pencarian wajib diisi.", 400);
  }

  const normalizedPhone = normalizePhoneQuery(q);

  const rows = await findManyGuestsPaginated({
    page: 1,
    limit: 10,
    sortBy: "totalVisits",
    sortOrder: "desc",
    q: normalizedPhone || q,
  });

  return jsonSuccess(rows.map(guestListRowToJson));
}