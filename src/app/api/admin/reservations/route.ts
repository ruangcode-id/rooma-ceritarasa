import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const date = searchParams.get("date");

    const reservations = await prisma.reservation.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(date ? { date: new Date(date) } : {}),
      },
      include: {
        guest: true,
        session: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        reservationTables: {
          include: {
            table: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: reservations.map((reservation) => ({
        id: reservation.id,
        date: reservation.date,
        partySize: reservation.partySize,
        status: reservation.status,
        specialRequest: reservation.specialRequest,
        expiresAt: reservation.expiresAt,
        createdAt: reservation.createdAt,
        guest: {
          id: reservation.guest.id,
          name: reservation.guest.name,
          phone: reservation.guest.phone,
          email: reservation.guest.email,
        },
        session: {
          id: reservation.session.id,
          name: reservation.session.name,
          startTime: reservation.session.startTime,
          endTime: reservation.session.endTime,
        },
        payment: reservation.payments[0]
          ? {
              id: reservation.payments[0].id,
              type: reservation.payments[0].type,
              amount: Number(reservation.payments[0].amount),
              status: reservation.payments[0].status,
              midtransOrderId: reservation.payments[0].midtransOrderId,
              paidAt: reservation.payments[0].paidAt,
            }
          : null,
        tables: reservation.reservationTables.map((item) => ({
          id: item.table.id,
          tableNumber: item.table.tableNumber,
          capacity: item.table.capacity,
        })),
      })),
    });
  } catch (error) {
    console.error("Admin reservations error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data reservasi.",
      },
      { status: 500 }
    );
  }
}