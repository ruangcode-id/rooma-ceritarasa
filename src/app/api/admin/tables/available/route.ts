import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { getAvailableTables } from "@/features/tables/table.service";

export async function GET(req: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const { searchParams } = new URL(req.url);

    const sessionId = searchParams.get("sessionId");
    const date = searchParams.get("date");
    const capacity = searchParams.get("capacity");

    if (!sessionId || !date || !capacity) {
      return jsonError("sessionId, date, and capacity are required", 400);
    }

    const tables = await getAvailableTables(sessionId, date, Number(capacity));

    return NextResponse.json(
      {
        success: true,
        data: tables,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET AVAILABLE TABLES ERROR:", error);
    return jsonError("Failed to get available tables", 400);
  }
}
