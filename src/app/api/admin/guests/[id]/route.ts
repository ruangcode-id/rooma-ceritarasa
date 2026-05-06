import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  jsonError,
  jsonSuccess,
  jsonSuccessMessage,
  jsonValidationError,
} from "@/lib/api-envelope";
import { patchGuestSchema } from "@/validations/guest.validation";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  countConfirmedVisitsForGuest,
  findActiveGuestByPhone,
  findGuestByIdActive,
  softDeleteGuest,
  updateGuest,
} from "@/infrastructure/repositories/admin-guest.repository";
import { guestListRowToJson, reservationVisitToJson, guestNoteToJson } from "@/lib/guest-response";

const idParamSchema = z.string().uuid();

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError("ID tidak valid.", 400);
  }

  const guest = await findGuestByIdActive(idParsed.data);
  if (!guest) {
    return jsonError("Tamu tidak ditemukan.", 404);
  }

  const totalVisits = await countConfirmedVisitsForGuest(guest.id);

  return jsonSuccess({
    ...guestListRowToJson({
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      birthdate: guest.birthdate,
      isVip: guest.isVip,
      tags: guest.tags as any,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      totalVisits,
    }),
    visitHistory: guest.reservations.map(reservationVisitToJson),
    notes: guest.guestNotes.map(guestNoteToJson),
  });
}

export async function PATCH(request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError("ID tidak valid.", 400);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = patchGuestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const body = parsed.data;

  if (body.phone !== undefined) {
    const dup = await findActiveGuestByPhone(body.phone);
    if (dup && dup.id !== idParsed.data) {
      return jsonError("Nomor telepon sudah dipakai tamu lain.", 409);
    }
  }

  const data: Prisma.GuestUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.email !== undefined) data.email = body.email;
  if (body.isVip !== undefined) data.isVip = body.isVip;
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.birthdate !== undefined) {
    data.birthdate = body.birthdate === null ? null : body.birthdate;
  }

  try {
    const updated = await updateGuest(idParsed.data, data);
    if (!updated) {
      return jsonError("Tamu tidak ditemukan.", 404);
    }

    const guest = await findGuestByIdActive(updated.id);
    if (!guest) {
      return jsonError("Tamu tidak ditemukan.", 404);
    }

    const totalVisits = await countConfirmedVisitsForGuest(guest.id);

    return jsonSuccess(
      guestListRowToJson({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        birthdate: guest.birthdate,
        isVip: guest.isVip,
        tags: guest.tags as any,
        createdAt: guest.createdAt,
        updatedAt: guest.updatedAt,
        totalVisits,
      }),
    );
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      return jsonError("Nomor telepon sudah dipakai tamu lain.", 409);
    }
    throw e;
  }
}

export async function DELETE(_request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError("ID tidak valid.", 400);
  }

  const ok = await softDeleteGuest(idParsed.data);
  if (!ok) {
    return jsonError("Tamu tidak ditemukan.", 404);
  }

  return jsonSuccessMessage("Guest deleted successfully");
}
