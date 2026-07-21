import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // 'all' or 'vip'

    const where: Prisma.GuestWhereInput = {
      deletedAt: null,
    };

    if (filter === "vip") {
      where.OR = [
        { isVip: true },
        { vipCard: { isNot: null } }
      ];
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        vipCard: true,
      },
      take: 100, // Limiting for simple UI
    });

    return NextResponse.json({ success: true, data: guests });
  } catch (error: unknown) {
    console.error("API [Admin VIP Guests] Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan internal pada server." }, { status: 500 });
  }
}
