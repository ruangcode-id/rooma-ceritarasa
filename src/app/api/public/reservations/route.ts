import { NextRequest, NextResponse } from "next/server";
import { createPublicReservation } from "@/features/reservations/reservation.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (
      !body ||
      typeof body.guestName !== "string" ||
      typeof body.guestPhone !== "string" ||
      typeof body.sessionId !== "string" ||
      typeof body.date !== "string" ||
      typeof body.partySize !== "number"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    const guestName = body.guestName.trim();
    const guestPhone = body.guestPhone.trim();

    if (!guestName) {
      return NextResponse.json(
        { success: false, error: "Guest name is required" },
        { status: 400 }
      );
    }

    if (!/^\d{8,15}$/.test(guestPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const result = await createPublicReservation({
      guestName,
      guestPhone,
      guestEmail:
        typeof body.guestEmail === "string" && body.guestEmail.trim()
          ? body.guestEmail.trim()
          : undefined,
      sessionId: body.sessionId,
      date: body.date,
      partySize: body.partySize,
      specialRequest:
        typeof body.specialRequest === "string" && body.specialRequest.trim()
          ? body.specialRequest.trim()
          : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating reservation:", error);

    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}