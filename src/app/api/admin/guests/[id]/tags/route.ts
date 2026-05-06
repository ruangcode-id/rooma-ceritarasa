import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  findGuestByIdActive,
  updateGuestTags,
} from "@/infrastructure/repositories/admin-guest.repository";
import { patchGuestTagsSchema } from "@/validations/guest.validation";

const idParamSchema = z.string().uuid();
type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idParamSchema.safeParse(id);
  if (!parsedId.success) return jsonError("ID tidak valid.", 400);

  const guest = await findGuestByIdActive(parsedId.data);
  if (!guest) return jsonError("Tamu tidak ditemukan.", 404);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = patchGuestTagsSchema.safeParse(json);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const tags = new Set(guest.tags);
  for (const t of parsed.data.add) tags.add(t);
  for (const t of parsed.data.remove) tags.delete(t);

  const updated = await updateGuestTags(parsedId.data, [...tags]);
  if (!updated) return jsonError("Tamu tidak ditemukan.", 404);

  return jsonSuccess({
    id: updated.id,
    tags: updated.tags,
  });
}
