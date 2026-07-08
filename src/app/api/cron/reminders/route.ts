import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { getCronSecret } from "@/config/env";
import { runDailyReminders } from "@/infrastructure/notifications/guest-notification.service";

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
 * GET/POST /api/cron/reminders
 * Job H-1: kirim WA reminder untuk reservasi & event besok.
 * Lindungi dengan CRON_SECRET (Bearer token atau header x-cron-secret).
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const results = await runDailyReminders();
    return jsonSuccess(results);
  } catch (error) {
    console.error("[cron/reminders]", error);
    return jsonError("Reminder job gagal.", 500);
  }
}

export async function POST(request: Request) {
  return GET(request);
}
