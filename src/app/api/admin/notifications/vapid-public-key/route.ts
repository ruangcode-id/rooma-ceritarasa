import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { getVapidPublicKeyAndSubject } from "@/infrastructure/push-notification/web-push";

export async function GET() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const cfg = getVapidPublicKeyAndSubject();
  if (!cfg) {
    return jsonError(
      "Web Push belum dikonfigurasi. Set VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY di environment.",
      503,
    );
  }

  return jsonSuccess({
    publicKey: cfg.publicKey,
    subject: cfg.subject,
  });
}
