import { NextRequest, NextResponse } from "next/server";
import { paymentRepository } from "@/infrastructure/repositories/payment.repository";
import { prisma } from "@/infrastructure/database/prisma";
import rateLimit from "@/lib/rate-limit";

const limiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 60000,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    try {
      await limiter.check(20, ip);
    } catch {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const { orderId } = await params;
    const paymentToken = req.nextUrl.searchParams.get("paymentToken");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!paymentToken) {
      return NextResponse.json(
        { success: false, error: "Payment token is required" },
        { status: 401 }
      );
    }

    const payment = await paymentRepository.findByOrderId(orderId);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { paymentToken },
      select: { id: true },
    });

    if (!reservation || reservation.id !== payment.reservationId) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: payment.midtransOrderId ?? payment.id,
        status: payment.status,
        type: payment.type,
        amount: payment.amount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}