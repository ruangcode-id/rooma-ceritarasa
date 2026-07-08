import { NextRequest, NextResponse } from "next/server";
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import { bulkUpdatePositionSchema } from "@/infrastructure/validations/table.validation";

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

export async function PATCH(req: NextRequest) {
  try {
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

    const payload = Array.isArray(body)
      ? { updates: body }
      : body;

    const validation =
      bulkUpdatePositionSchema.safeParse(payload);

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

    return NextResponse.json(
      {
        success: false,
        message: "Gagal update posisi meja",
        detail: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}