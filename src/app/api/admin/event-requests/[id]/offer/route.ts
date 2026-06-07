import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { submitEventOffer } from "@/features/event/admin-event.service";
import { submitOfferSchema } from "@/features/event/admin-event.validation";

/**
 * POST /api/admin/event-requests/[id]/offer
 *
 * Admin mengirimkan penawaran (PDF + harga) ke tamu.
 * Body: multipart/form-data
 *   - pdf: File (PDF)
 *   - price: number
 *   - description: string (optional)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(["admin", "owner"]);
    const { id } = await params;

    let formData;
    try {
      formData = await req.formData();
    } catch {
      return jsonError("Body harus berupa multipart/form-data.", 400);
    }

    const pdfFile = formData.get("pdf");
    if (!pdfFile || !(pdfFile instanceof File)) {
      return jsonError("File PDF penawaran wajib dilampirkan (field: 'pdf').", 400);
    }

    const priceRaw = formData.get("price");
    const price = Number(priceRaw);
    if (!priceRaw || isNaN(price)) {
      return jsonError("Field 'price' wajib berupa angka.", 400);
    }

    const description = formData.get("description");

    // Validasi input dengan Zod
    const parsed = submitOfferSchema.parse({
      price,
      description: description ? String(description) : undefined,
    });

    // Konversi File ke Buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const result = await submitEventOffer(
      id,
      parsed,
      pdfBuffer,
      pdfFile.name,
      admin.id as string
    );

    return jsonSuccess(result);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return jsonError(message, 401);
    }

    if (
      message.includes("tidak ditemukan") ||
      message.includes("Tidak bisa") ||
      message.includes("sudah dalam status")
    ) {
      return jsonError(message, 422);
    }

    console.error("[POST /api/admin/event-requests/[id]/offer]", error);
    return jsonError("Gagal mengirim penawaran.", 500);
  }
}
