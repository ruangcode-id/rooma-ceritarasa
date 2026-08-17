import { NextResponse } from "next/server";
import { listPublicMenuPhotos, getPublicMenuCategories } from "@/features/menu/menu.service";

export async function GET() {
  try {
    const [photos, categories] = await Promise.all([
      listPublicMenuPhotos(),
      getPublicMenuCategories(),
    ]);

    return NextResponse.json({ success: true, data: photos, categories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching public menu:", error);
    const msg = error instanceof Error ? error.message : "Failed to load menu";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 },
    );
  }
}
