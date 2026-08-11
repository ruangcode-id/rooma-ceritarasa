import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { SpecialOpenDateRepository } from "@/infrastructure/repositories/special-open-date.repository";
import { z } from "zod";

const createSpecialOpenDateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reason: z.string().optional().nullable(),
});

export async function GET() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const dates = await SpecialOpenDateRepository.getSpecialOpenDates();
    return NextResponse.json({ success: true, data: dates });
  } catch (error) {
    console.error("[GET /api/admin/special-open-dates] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch special open dates" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await req.json();
    const parsed = createSpecialOpenDateSchema.parse(body);

    const dateObj = new Date(`${parsed.date}T00:00:00.000Z`);
    if (Number.isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (dateObj.getUTCDay() !== 1) {
      return NextResponse.json(
        { success: false, error: "Special open dates can only be registered for Mondays." },
        { status: 400 },
      );
    }

    const created = await SpecialOpenDateRepository.createSpecialOpenDates({
      dates: [dateObj],
      reason: parsed.reason ?? null,
      createdBy: authResult.userId,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("[POST /api/admin/special-open-dates] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to create special open date";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
