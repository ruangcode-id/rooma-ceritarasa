import { z } from "zod";
import { jsonError, jsonSuccess, jsonSuccessList, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  createGuestNote,
  findGuestByIdActive,
  findGuestNotesByGuestId,
} from "@/infrastructure/repositories/admin-guest.repository";
import { guestNoteToJson } from "@/lib/guest-response";
import { createGuestNoteSchema, guestNotesListQuerySchema } from "@/validations/guest.validation";

const idParamSchema = z.string().uuid();
type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idParamSchema.safeParse(id);
  if (!parsedId.success) return jsonError("ID tidak valid.", 400);

  const guest = await findGuestByIdActive(parsedId.data);
  if (!guest) return jsonError("Tamu tidak ditemukan.", 404);

  const url = new URL(request.url);
  const query = guestNotesListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!query.success) return jsonValidationError(query.error);

  const { page, limit } = query.data;
  const { rows, total } = await findGuestNotesByGuestId(parsedId.data, page, limit);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return jsonSuccessList(rows.map(guestNoteToJson), {
    total,
    page,
    limit,
    totalPages,
  });
}

export async function POST(request: Request, context: RouteCtx) {
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

  const parsed = createGuestNoteSchema.safeParse(json);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const note = await createGuestNote(parsedId.data, parsed.data.content);
  return jsonSuccess(guestNoteToJson(note), { status: 201 });
}
