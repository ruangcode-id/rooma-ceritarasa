import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonError, jsonSuccess, jsonSuccessList, jsonValidationError } from "@/lib/api-envelope";
import { listAllEvents, createEventContent } from "@/features/event/event-content.service";
import { createEventContentSchema } from "@/features/event/event-content.validation";

/**
 * GET /api/admin/events
 * Admin: Daftar semua artikel promosi event (termasuk yang belum dipublish).
 *
 * POST /api/admin/events
 * Admin: Buat artikel event baru.
 */

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin", "owner"]);

    const { searchParams } = req.nextUrl;
    const result = await listAllEvents({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    return jsonSuccessList(result.data, result.meta);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return jsonError(message, 401);
    }

    console.error("[GET /api/admin/events]", error);
    return jsonError("Gagal mengambil daftar artikel event.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole(["admin", "owner"]);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Body harus berupa JSON.", 400);
    }

    const parsed = createEventContentSchema.parse(body);
    const result = await createEventContent(parsed, admin.id as string);

    return jsonSuccess(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return jsonError(message, 401);
    }

    console.error("[POST /api/admin/events]", error);
    return jsonError("Gagal membuat artikel event.", 500);
  }
}
