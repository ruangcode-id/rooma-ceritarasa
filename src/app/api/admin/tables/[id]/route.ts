import { NextRequest, NextResponse } from "next/server";
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import { updateTableSchema } from "@/infrastructure/validations/table.validation";

async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Terjadi kesalahan internal";
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
  try {
    const { id } = await context.params;

    const body = await parseJsonBody(req);

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          message: "Request body is required",
        },
        { status: 400 }
      );
    }

    const validation = updateTableSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Ensure we don't pass duplicate `id` property if present in validation.data
    const { id: _maybeId, ...data } = validation.data as { [key: string]: any };

    const updatedTable = await tableRepository.update({
      id,
      ...data,
    });

    return NextResponse.json(updatedTable, { status: 200 });
  } catch (error) {
    console.error("Error updating table:", error);

    if (isPrismaError(error, "P2025")) {
      return NextResponse.json(
        {
          success: false,
          message: "Meja tidak ditemukan",
        },
        { status: 404 }
      );
    }

    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor meja sudah digunakan",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal update meja",
        detail: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete table by ID
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(
        {
          success: false,
          message: "Meja tidak ditemukan",
        },
        { status: 404 }
      );
    }

    if (isPrismaError(error, "P2003")) {
      return NextResponse.json(
        {
          success: false,
          message: "Meja ini tidak dapat dihapus karena sudah terkait dengan reservasi tamu.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal menghapus meja",
        detail: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}