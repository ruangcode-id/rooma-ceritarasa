import { NextRequest, NextResponse } from "next/server";
// Import dari infrastructure yang sudah kita buat
import { tableRepository } from "@/infrastructure/repositories/table.repository";
import { updateTableSchema } from "@/infrastructure/validations/table.validation";

// PATCH (Single)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
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

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    await tableRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json({ error: "Gagal menghapus meja" }, { status: 500 });
  }
}