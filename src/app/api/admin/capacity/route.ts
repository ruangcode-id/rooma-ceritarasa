import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import {
  autoAssignTable,
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
    await requireRole(["admin", "owner"]);

    const json = await req.json();
    const parsed = bodySchema.parse(json);

    const availability = await getSessionAvailability(parsed.sessionId, parsed.date);

    let capacityOk = true;
    try {
      await validateCapacity(parsed.sessionId, parsed.date, parsed.guestCount);
    } catch {
      capacityOk = false;
    }

    const assigned = await autoAssignTable(parsed.sessionId, parsed.date, parsed.guestCount);

    const tables = parsed.includeTables
      ? await getAvailableTables(parsed.sessionId, parsed.date, parsed.guestCount)
      : undefined;

    return NextResponse.json({
      success: true,
      data: {
        availability: {
          ...availability,
          date: availability.date.toISOString().slice(0, 10),
        },
        capacityOk,
        assignedTable: assigned,
        availableTables: tables,
      },
    });
  } catch (error: any) {
    if (
      typeof error?.message === "string" &&
      (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error?.name === "ZodError" || error?.message === "Invalid date") {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Prisma invalid UUID / malformed id input
    if (error?.code === "P2007" || error?.code === "P2023") {
      return NextResponse.json({ success: false, error: "Invalid sessionId (must be UUID)" }, { status: 400 });
    }

    // Business errors
    if (
      typeof error?.message === "string" &&
      (error.message.includes("Session not found") ||
        error.message.includes("guestCount") ||
        error.message.includes("capacity") ||
        error.message.includes("Not enough capacity") ||
        error.message.includes("No available table"))
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    console.error("/api/admin/capacity error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
