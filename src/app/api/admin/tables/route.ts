import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import {
  createTableSchema,
  bulkUpdatePositionSchema,
} from "@/infrastructure/validations/table.validation";

async function requireAdminOrOwner() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) {
    return authResult.response;
  }
  return null;
}

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

// GET: List all tables
export async function GET() {
  const guardResponse = await requireAdminOrOwner();
  if (guardResponse) return guardResponse;

  try {
    const tables = await tableRepository.getAll();

    return NextResponse.json(
      {
        success: true,
        data: tables,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tables:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data meja",
        detail: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

// POST: Create new table
export async function POST(req: NextRequest) {
  const guardResponse = await requireAdminOrOwner();
  if (guardResponse) return guardResponse;

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

    const validation = createTableSchema.safeParse(body);

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

    const newTable = await tableRepository.create(validation.data);

    return NextResponse.json(
      {
        success: true,
        data: newTable,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating table:", error);

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
        message: "Gagal membuat meja baru",
        detail: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

// PATCH: Bulk update positions
export async function PATCH(req: NextRequest) {
  const guardResponse = await requireAdminOrOwner();
  if (guardResponse) return guardResponse;

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

    const payload = Array.isArray(body) ? { updates: body } : body;

    if (!payload.updates || !Array.isArray(payload.updates)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Format bulk update salah. Gunakan array [{ id, posX, posY }] atau { updates: [...] }",
        },
        { status: 400 }
      );
    }

    const validation = bulkUpdatePositionSchema.safeParse(payload);

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

    await tableRepository.bulkUpdatePosition(validation.data);

    return NextResponse.json(
      {
        success: true,
        message: "Posisi meja berhasil diperbarui",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error bulk updating tables:", error);

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