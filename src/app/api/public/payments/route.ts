import { NextRequest } from "next/server";
import { createPayment } from "@/features/payments/payment.service";
import { ReservationPaymentType } from "@/features/payments/payment.types";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (
      !body ||
      typeof body.amount !== "number" ||
      typeof body.reservationId !== "string" ||
      !Object.values(ReservationPaymentType).includes(body.paymentType)
    ) {
      return jsonError("Invalid payload", 400);
    }

    const result = await createPayment(body);

    return jsonSuccess(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return jsonError(message, 500);
  }
}
