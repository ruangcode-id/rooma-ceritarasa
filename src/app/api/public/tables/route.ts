import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { PublicTableUseCase } from "@/application/use-cases/table/table.usecase";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  sessionId: z.string().uuid("sessionId harus berupa UUID yang valid."),
});

/**
 * GET /api/public/tables?date=YYYY-MM-DD&sessionId=UUID
 *
 * Mengembalikan daftar semua meja aktif beserta flag `isAvailable`.
 * Dipakai FE untuk menampilkan denah meja dan mengizinkan guest memilih meja yang masih kosong.
 * Meja dengan `isAvailable: false` sudah dipesan atau sedang dalam proses pembayaran (pending ≤15 menit).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const raw = {
      date: searchParams.get("date") ?? "",
      sessionId: searchParams.get("sessionId") ?? "",
    };

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const tables = await PublicTableUseCase.getAvailableTablesAction(
      parsed.data.sessionId,
      parsed.data.date,
    );

    return jsonSuccess(tables);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Public Tables Error:", error);
    return jsonError(message, 500);
  }
}
