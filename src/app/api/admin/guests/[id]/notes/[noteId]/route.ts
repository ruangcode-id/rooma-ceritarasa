import { z } from "zod";
import {
  jsonError,
  jsonSuccess,
  jsonSuccessMessage,
  jsonValidationError,
} from "@/lib/api-envelope";
import { patchGuestNoteSchema } from "@/validations/guest.validation";
import { guestNoteToJson } from "@/lib/guest-response";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  deleteGuestNote,
  findGuestNoteById,
  updateGuestNote,
} from "@/infrastructure/repositories/admin-guest.repository";

const idParamSchema = z.string().uuid();
const noteIdParamSchema = z.string().uuid();

type RouteCtx = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id, noteId } = await context.params;

  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError("ID guest tidak valid.", 400);
  }

  const noteIdParsed = noteIdParamSchema.safeParse(noteId);
  if (!noteIdParsed.success) {
    return jsonError("ID note tidak valid.", 400);
  }

  const existingNote = await findGuestNoteById(noteIdParsed.data);
  if (!existingNote) {
    return jsonError("Catatan tidak ditemukan.", 404);
  }

  if (existingNote.guestId !== idParsed.data) {
    return jsonError("Catatan tidak принадлежит tamu ini.", 404);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = patchGuestNoteSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const updated = await updateGuestNote(noteIdParsed.data, {
    content: parsed.data.content,
    tags: parsed.data.tags,
  });

  return jsonSuccess(guestNoteToJson(updated));
}

export async function DELETE(_request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id, noteId } = await context.params;

  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError("ID guest tidak valid.", 400);
  }

  const noteIdParsed = noteIdParamSchema.safeParse(noteId);
  if (!noteIdParsed.success) {
    return jsonError("ID note tidak valid.", 400);
  }

  const existingNote = await findGuestNoteById(noteIdParsed.data);
  if (!existingNote) {
    return jsonError("Catatan tidak ditemukan.", 404);
  }

  if (existingNote.guestId !== idParsed.data) {
    return jsonError("Catatan tidak принадлежит tamu ini.", 404);
  }

  await deleteGuestNote(noteIdParsed.data);

  return jsonSuccessMessage("Catatan berhasil dihapus");
}