import { z } from "zod";
import { jsonError, jsonSuccess, jsonSuccessMessage, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  deleteGuestNote,
  findGuestByIdActive,
  updateGuestNote,
} from "@/infrastructure/repositories/admin-guest.repository";
import { guestNoteToJson } from "@/lib/guest-response";
import { patchGuestNoteSchema } from "@/validations/guest.validation";

const idParamSchema = z.string().uuid();
type RouteCtx = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id, noteId } = await context.params;
  const parsedGuestId = idParamSchema.safeParse(id);
  const parsedNoteId = idParamSchema.safeParse(noteId);
  if (!parsedGuestId.success || !parsedNoteId.success) return jsonError("ID tidak valid.", 400);

  const guest = await findGuestByIdActive(parsedGuestId.data);
  if (!guest) return jsonError("Tamu tidak ditemukan.", 404);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = patchGuestNoteSchema.safeParse(json);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const note = await updateGuestNote(parsedGuestId.data, parsedNoteId.data, parsed.data.content);
  if (!note) return jsonError("Catatan tidak ditemukan.", 404);

  return jsonSuccess(guestNoteToJson(note));
}

export async function DELETE(_request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id, noteId } = await context.params;
  const parsedGuestId = idParamSchema.safeParse(id);
  const parsedNoteId = idParamSchema.safeParse(noteId);
  if (!parsedGuestId.success || !parsedNoteId.success) return jsonError("ID tidak valid.", 400);

  const guest = await findGuestByIdActive(parsedGuestId.data);
  if (!guest) return jsonError("Tamu tidak ditemukan.", 404);

  const ok = await deleteGuestNote(parsedGuestId.data, parsedNoteId.data);
  if (!ok) return jsonError("Catatan tidak ditemukan.", 404);

  return jsonSuccessMessage("Guest note deleted successfully");
}
