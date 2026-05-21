import {
  jsonError,
  jsonSuccess,
  jsonSuccessList,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { paginate } from "@/lib/pagination";
import {
  notificationListQuerySchema,
  markNotificationsReadBodySchema,
} from "@/validations/notification.validation";
import {
  countNotificationsForUser,
  findManyNotificationsForUser,
  markAllNotificationsRead,
  markNotificationsReadByIds,
} from "@/infrastructure/repositories/notification.repository";

function serializeNotification(row: {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  body: string | null;
  isRead: boolean;
  relatedId: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.isRead,
    relatedId: row.relatedId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const parsed = notificationListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const { page, limit, isRead, type } = parsed.data;
  const filters = { isRead, type };

  const { data, meta } = await paginate(
    { page, limit },
    (skip, take) =>
      findManyNotificationsForUser(authResult.userId, filters, skip, take),
    () => countNotificationsForUser(authResult.userId, filters),
  );

  return jsonSuccessList(data.map(serializeNotification), meta);
}

export async function PATCH(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = markNotificationsReadBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  if ("markAllRead" in parsed.data) {
    const updated = await markAllNotificationsRead(authResult.userId);
    return jsonSuccess({ updated });
  }

  const updated = await markNotificationsReadByIds(authResult.userId, parsed.data.ids);
  return jsonSuccess({ updated });
}
