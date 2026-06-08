import {
  jsonError,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { patchNotificationReadSchema } from "@/validations/notification.validation";
import { updateNotificationRead } from "@/infrastructure/repositories/notification.repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = patchNotificationReadSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const row = await updateNotificationRead(authResult.userId, id, parsed.data.isRead);
  if (!row) {
    return jsonError("Notifikasi tidak ditemukan.", 404);
  }

  return jsonSuccess({
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.isRead,
    relatedId: row.relatedId,
    createdAt: row.createdAt.toISOString(),
  });
}
