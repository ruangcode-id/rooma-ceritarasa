import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { assignVipCard } from "@/features/vip/vip.service";
import { assignVipCardSchema } from "@/features/vip/vip.validation";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const body = await req.json().catch(() => null);
    const parsed = assignVipCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid payload",
        },
        { status: 400 },
      );
    }

    const result = await assignVipCard(parsed.data);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "GUEST_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: "Tamu tidak ditemukan" },
          { status: 404 },
        );
      }
      if (
        error.message === "ACTIVE_VIP_CARD_EXISTS" ||
        error.message === "VIP_CARD_EXISTS"
      ) {
        return NextResponse.json(
          { success: false, error: "Tamu ini sudah menjadi VIP" },
          { status: 400 },
        );
      }
    }

    console.error("[VIP ASSIGN ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal mendaftarkan VIP. Coba lagi." },
      { status: 500 },
    );
  }
}
