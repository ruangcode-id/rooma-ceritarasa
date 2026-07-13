import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import { bulkUpdatePositionSchema } from "@/infrastructure/validations/table.validation";

async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await parseJsonBody(req);

    if (!body) {
      return jsonError("Request body is required", 400);
    }

    const payload = Array.isArray(body)
      ? { updates: body }
      : body;

    const validation =
      bulkUpdatePositionSchema.safeParse(payload);

    if (!validation.success) {
      return jsonError("Validation error", 400, {
        errors: validation.error.flatten(),
      });
    }

    await tableRepository.bulkUpdatePosition(
      validation.data
    );

    return NextResponse.json(
      {
        success: true,
        message: "Posisi meja berhasil diperbarui",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error bulk updating table positions:",
      error
    );

    return jsonError("Gagal update posisi meja", 500);
  }
}
