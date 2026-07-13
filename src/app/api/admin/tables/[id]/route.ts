import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import { updateTableSchema } from "@/infrastructure/validations/table.validation";

async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

// PATCH: Update table by ID
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const { id } = await context.params;

    const body = await parseJsonBody(req);

    if (!body) {
      return jsonError("Request body is required", 400);
    }

    const validation = updateTableSchema.safeParse(body);

    if (!validation.success) {
      return jsonError("Validation error", 400, {
        errors: validation.error.flatten(),
      });
    }

    // Route params remain the source of truth; never forward a body ID to the repository.
    const { id: bodyId, ...data } = validation.data;
    void bodyId;

    const updatedTable = await tableRepository.update({
      id,
      ...data,
    });

    return NextResponse.json(updatedTable, { status: 200 });
  } catch (error) {
    console.error("Error updating table:", error);

    if (isPrismaError(error, "P2025")) {
      return jsonError("Meja tidak ditemukan", 404);
    }

    if (isPrismaError(error, "P2002")) {
      return jsonError("Nomor meja sudah digunakan", 409);
    }

    return jsonError("Gagal update meja", 500);
  }
}

// DELETE: Delete table by ID
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const { id } = await context.params;

    await tableRepository.delete(id);

    return NextResponse.json(
      {
        success: true,
        message: "Meja berhasil dihapus",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting table:", error);

    if (isPrismaError(error, "P2025")) {
      return jsonError("Meja tidak ditemukan", 404);
    }

    if (isPrismaError(error, "P2003")) {
      return jsonError(
        "Meja ini tidak dapat dihapus karena sudah terkait dengan reservasi tamu.",
        400,
      );
    }

    return jsonError("Gagal menghapus meja", 500);
  }
}
