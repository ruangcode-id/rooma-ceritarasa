import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { jsonError } from "@/lib/api-envelope";
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import {
  createTableSchema,
  bulkUpdatePositionSchema,
} from "@/infrastructure/validations/table.validation";

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

// GET: List all tables
export async function GET() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

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

    return jsonError("Gagal mengambil data meja", 500);
  }
}

// POST: Create new table
export async function POST(req: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await parseJsonBody(req);

    if (!body) {
      return jsonError("Request body is required", 400);
    }

    const validation = createTableSchema.safeParse(body);

    if (!validation.success) {
      return jsonError("Validation error", 400, {
        errors: validation.error.flatten(),
      });
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
      return jsonError("Nomor meja sudah digunakan", 409);
    }

    return jsonError("Gagal membuat meja baru", 500);
  }
}

// PATCH: Bulk update positions
export async function PATCH(req: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await parseJsonBody(req);

    if (!body) {
      return jsonError("Request body is required", 400);
    }

    const payload = Array.isArray(body) ? { updates: body } : body;

    if (!payload.updates || !Array.isArray(payload.updates)) {
      return jsonError(
        "Format bulk update salah. Gunakan array [{ id, posX, posY }] atau { updates: [...] }",
        400,
      );
    }

    const validation = bulkUpdatePositionSchema.safeParse(payload);

    if (!validation.success) {
      return jsonError("Validation error", 400, {
        errors: validation.error.flatten(),
      });
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

    return jsonError("Gagal update posisi meja", 500);
  }
}
