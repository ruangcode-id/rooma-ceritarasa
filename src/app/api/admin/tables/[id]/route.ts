import { NextRequest, NextResponse } from "next/server";
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import { updateTableSchema } from "@/infrastructure/validations/table.validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const table = await tableRepository.getById(id);
    
    if (!table) {
      return NextResponse.json({ error: "Meja tidak ditemukan" }, { status: 404 });
    }
    
    return NextResponse.json(table);
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json({ error: "Gagal mengambil data meja" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validation = updateTableSchema.safeParse({ ...body, id });

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const updatedTable = await tableRepository.update(validation.data);
    return NextResponse.json(updatedTable);
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json({ error: "Gagal update meja" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await tableRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json({ error: "Gagal menghapus meja" }, { status: 500 });
  }
}