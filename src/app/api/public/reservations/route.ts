import { NextRequest, NextResponse } from "next/server";
import { createPublicReservation } from "@/features/reservations/reservation.service";
import { publicReservationSchema } from "@/validations/reservation.validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const parsed = publicReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await createPublicReservation({
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone,
      guestEmail: parsed.data.guestEmail,
      sessionId: parsed.data.sessionId,
      date: parsed.data.date,
      partySize: parsed.data.partySize,
      specialRequest: parsed.data.specialRequest,
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