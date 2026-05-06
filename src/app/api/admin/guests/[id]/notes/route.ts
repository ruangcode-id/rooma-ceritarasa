import { z } from "zod";
import {
  jsonError,
  jsonSuccess,
  jsonSuccessList,
  jsonValidationError,
} from "@/lib/api-envelope";
import { createGuestNoteSchema } from "@/validations/guest.validation";
import { guestNoteToJson } from "@/lib/guest-response";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  createGuestNote,
  findGuestByIdActive,
} from "@/infrastructure/repositories/admin-guest.repository";

const idParamSchema = z.string().uuid();

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteCtx) {
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

  const notes = guest.guestNotes.map(guestNoteToJson);

  return jsonSuccessList(notes);
}

export async function POST(request: Request, context: RouteCtx) {
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

  const parsed = createGuestNoteSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const note = await createGuestNote({
    guestId: idParsed.data,
    content: parsed.data.content,
    tags: parsed.data.tags,
  });

  return jsonSuccess(guestNoteToJson(note), { status: 201 });
}