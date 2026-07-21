import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { z } from "zod";
import {
  autoAssignTables,
  getAvailableTables,
  getSessionAvailability,
  validateCapacity,
} from "@/features/tables/table.service";

const bodySchema = z.object({
  sessionId: z.string().uuid("Invalid sessionId (must be UUID)"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  guestCount: z.coerce.number().int().positive(),
  includeTables: z.coerce.boolean().optional().default(true),
});

/**
 * Admin/Owner capacity utilities (Sprint 2 helper testing)
 * POST /api/admin/capacity
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const json = await req.json();
    const parsed = bodySchema.parse(json);

    const availability = await getSessionAvailability(parsed.sessionId, parsed.date);

    let capacityOk = true;
    try {
      await validateCapacity(parsed.sessionId, parsed.date, parsed.guestCount);
    } catch {
      capacityOk = false;
    }

    const assignedTables = capacityOk
      ? await autoAssignTables(parsed.sessionId, parsed.date, parsed.guestCount)
      : [];

    const tables = parsed.includeTables
      ? await getAvailableTables(parsed.sessionId, parsed.date, parsed.guestCount)
      : undefined;

    return NextResponse.json({
      success: true,
      data: {
        availability,
        capacityOk,
        assignedTables,
        assignedTable: assignedTables[0] ?? null,
        availableTables: tables,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const name = error instanceof Error ? error.name : "";
    const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";


    if (name === "ZodError" || message === "Invalid date") {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    // Prisma invalid UUID / malformed id input
    if (code === "P2007" || code === "P2023") {
      return NextResponse.json({ success: false, error: "Invalid sessionId (must be UUID)" }, { status: 400 });
    }

    // Business errors
    if (
      message &&
      (message.includes("Session not found") ||
        message.includes("guestCount") ||
        message.includes("capacity") ||
        message.includes("Not enough capacity") ||
        message.includes("No available table"))
    ) {
      return NextResponse.json({ success: false, error: "Invalid request capacity or availability" }, { status: 400 });
    }

    console.error("/api/admin/capacity error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
