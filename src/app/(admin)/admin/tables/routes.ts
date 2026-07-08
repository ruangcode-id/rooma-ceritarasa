import { NextRequest, NextResponse } from "next/server";
// Import dari infrastructure yang sudah kita buat
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import { createTableSchema, bulkUpdatePositionSchema } from "@/infrastructure/validations/table.validation";

// GET: List all tables
export async function GET() {
  try {
    const tables = await tableRepository.getAll();
    return NextResponse.json(tables);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json({ error: "Gagal mengambil data meja" }, { status: 500 });
  }
}

// POST: Create new table
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createTableSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const newTable = await tableRepository.create(validation.data);
    return NextResponse.json(newTable, { status: 201 });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json({ error: "Gagal membuat meja baru" }, { status: 500 });
  }
}

// PATCH (Bulk): Bulk Update Position
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (body.updates && Array.isArray(body.updates)) {
      const validation = bulkUpdatePositionSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: "Format bulk update salah" }, { status: 400 });
      }
      
      await tableRepository.bulkUpdatePosition(validation.data);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Unknown update format" }, { status: 400 });

  } catch (error) {
    console.error("Error bulk updating tables:", error);
    return NextResponse.json({ error: "Gagal update posisi meja" }, { status: 500 });
  }
}