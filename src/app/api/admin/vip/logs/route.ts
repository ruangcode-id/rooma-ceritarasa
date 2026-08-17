import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where = search
      ? {
          guest: {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          },
        }
      : {};

    const [total, logs] = await Promise.all([
      prisma.vipArrivalLog.count({ where }),
      prisma.vipArrivalLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkedInAt: "desc" },
        include: {
          guest: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        guestId: log.guestId,
        guestName: log.guest.name,
        phone: log.guest.phone,
        email: log.guest.email,
        checkedInAt: log.checkedInAt.toISOString(),
        checkedInBy: log.checkedInBy,
        notes: log.notes,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("[VIP LOGS API ERROR]", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch VIP arrival logs: ${msg}` },
      { status: 500 }
    );
  }
}
