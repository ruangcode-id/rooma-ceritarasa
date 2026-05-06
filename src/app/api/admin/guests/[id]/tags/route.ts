import { z } from "zod";
import {
  jsonError,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  findGuestByIdActive,
  updateGuest,
} from "@/infrastructure/repositories/admin-guest.repository";
import { updateGuestTagsSchema } from "@/validations/guest.validation";

const idParamSchema = z.string().uuid();

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError("ID guest tidak valid.", 400);
  }

  const guest = await findGuestByIdActive(idParsed.data);
  if (!guest) {
    return jsonError("Tamu tidak ditemukan.", 404);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = updateGuestTagsSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  await updateGuest(idParsed.data, { tags: parsed.data.tags });

  const updated = await findGuestByIdActive(idParsed.data);

  return jsonSuccess({
    id: updated!.id,
    tags: updated!.tags,
  });
}