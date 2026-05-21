import { jsonError, jsonSuccessMessage } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { deletePushSubscriptionForUser } from "@/infrastructure/repositories/notification.repository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const ok = await deletePushSubscriptionForUser(authResult.userId, id);
  if (!ok) {
    return jsonError("Subscription tidak ditemukan.", 404);
  }
  return jsonSuccessMessage("Subscription dihapus.");
}
