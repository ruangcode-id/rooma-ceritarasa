import {
  jsonError,
  jsonSuccess,
  jsonSuccessList,
  jsonValidationError,
} from "@/lib/api-envelope";
import {
  createGuestSchema,
  guestListQuerySchema,
} from "@/validations/guest.validation";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  countActiveGuests,
  createGuest,
  findActiveGuestByPhone,
  findManyGuestsPaginated,
  searchGuests,
} from "@/infrastructure/repositories/admin-guest.repository";
import { guestListRowToJson } from "@/lib/guest-response";
import { z } from "zod";

const searchQuerySchema = z.object({
  q: z.string().min(1, "Query tidak boleh kosong"),
});

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (q !== null) {
    const parsed = searchQuerySchema.safeParse({ q });
    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const results = await searchGuests(parsed.data.q);
    return jsonSuccessList(results.map(guestListRowToJson), {
      total: results.length,
    });
  }

  const parsed = guestListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const { page, limit, sortBy, sortOrder } = parsed.data;
  const total = await countActiveGuests();
  const rows = await findManyGuestsPaginated({
    page,
    limit,
    sortBy,
    sortOrder,
  });

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return jsonSuccessList(rows.map(guestListRowToJson), {
    total,
    page,
    limit,
    totalPages,
  });
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = createGuestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const body = parsed.data;

  const dup = await findActiveGuestByPhone(body.phone);
  if (dup) {
    return jsonError("Nomor telepon sudah terdaftar.", 409);
  }

  try {
    const guest = await createGuest({
      name: body.name,
      phone: body.phone,
      email: body.email,
      birthdate: body.birthdate,
      isVip: body.isVip,
      notes: body.notes,
    });

    const totalVisits = 0;

    return jsonSuccess(
      guestListRowToJson({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        birthdate: guest.birthdate,
        isVip: guest.isVip,
        notes: guest.notes,
        createdAt: guest.createdAt,
        updatedAt: guest.updatedAt,
        totalVisits,
      }),
      { status: 201 },
    );
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      return jsonError("Nomor telepon sudah terdaftar.", 409);
    }
    throw e;
  }
}
