import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { prisma } from "@/infrastructure/database/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const { guestId } = await params;
    if (!guestId) {
      return NextResponse.json({ success: false, error: "Guest ID required" }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { vipCard: true },
    });

    if (!guest) {
      return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.guest.update({
        where: { id: guestId },
        data: { isVip: false },
      });

      if (guest.vipCard) {
        await tx.vipCard.delete({
          where: { guestId },
        });
      }
    });

    return NextResponse.json({ success: true, data: { message: "VIP revoked" } });
  } catch (error) {
    console.error("[VIP REVOKE ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to revoke VIP" }, { status: 500 });
  }
}
