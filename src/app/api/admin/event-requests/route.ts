import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonError, jsonSuccessList } from "@/lib/api-envelope";
import { getEventRequests } from "@/features/event/admin-event.service";

/**
 * GET /api/admin/event-requests
 *
 * Admin: Daftar pengajuan event dari tamu.
 * Query params: page, limit, status (optional)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin", "owner"]);

    const { searchParams } = req.nextUrl;
    const result = await getEventRequests({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
    });

    return jsonSuccessList(result.data, result.meta);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return jsonError(message, 401);
    }

    console.error("[GET /api/admin/event-requests]", error);
    return jsonError("Gagal mengambil daftar event request.", 500);
  }
}
