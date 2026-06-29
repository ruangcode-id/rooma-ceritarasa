import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const vipCard = await prisma.vipCard.findUnique({
      where: { token },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          }
        }
      }
    });

    if (!vipCard || !vipCard.isActive) {
      return NextResponse.json(
        { success: false, error: "Token VIP tidak valid atau sudah tidak aktif." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          token: vipCard.token,
          tier: vipCard.tier,
          benefits: vipCard.benefits,
          guest: vipCard.guest,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET VIP BY TOKEN ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
