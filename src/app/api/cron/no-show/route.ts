import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { getCronSecret } from "@/config/env";
import { runAutoNoShowJob } from "@/infrastructure/repositories/check-in.repository";
import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";

export const runtime = "nodejs";

function authorizeCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

/**
 * GET/POST /api/cron/no-show
 * Tandai reservasi confirmed yang lewat grace check-in sebagai no_show.
 * Tidak melakukan refund DP (kebijakan owner).
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const results = await runAutoNoShowJob();

    if (results.marked > 0) {
      await broadcastStaffNotification({
        type: "check_in",
        title: "Auto no-show",
        body: `${results.marked} reservasi ditandai no-show (lewat batas check-in).`,
        relatedId: results.reservationIds[0] ?? null,
      }).catch((err) => console.error("[cron/no-show] staff notify failed:", err));
    }

    return jsonSuccess(results);
  } catch (error) {
    console.error("[cron/no-show]", error);
    return jsonError("No-show job gagal.", 500);
  }
}

export async function POST(request: Request) {
  return GET(request);
}
