import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const guests = await prisma.guest.findMany({
    include: { vipCard: true }
  });
  
  return NextResponse.json(guests.map(g => ({
    id: g.id,
    name: g.name,
    isVip: g.isVip,
    hasVipCard: !!g.vipCard,
    vipCard: g.vipCard
  })));
}
