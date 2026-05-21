import { NextRequest } from "next/server";

import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";

import { createPayment } from "@/features/payments/payment.service";
import { ReservationPaymentType } from "@/features/payments/payment.types";

const DEPOSIT_POLICY = {
  noDepositMaxGuests: 2,
  depositForThreeToFourGuests: 150_000,
  depositForFivePlusGuests: 300_000,
  minimumOrderForTenPlusGuests: 1_000_000,
} as const;

function getDepositAmountByPartySize(partySize: number) {
  if (partySize <= DEPOSIT_POLICY.noDepositMaxGuests) {
    return 0;
  }

  if (partySize >= 3 && partySize <= 4) {
    return DEPOSIT_POLICY.depositForThreeToFourGuests;
  }

  if (partySize >= 5) {
    return DEPOSIT_POLICY.depositForFivePlusGuests;
  }

  return 0;
}

function getMinimumOrderByPartySize(partySize: number) {
  if (partySize >= 10) {
    return DEPOSIT_POLICY.minimumOrderForTenPlusGuests;
  }

  return null;
}

function getPaymentItemName(
  partySize: number,
  paymentType: ReservationPaymentType
) {
  if (paymentType === ReservationPaymentType.Full) {
    return "Pembayaran Reservasi";
  }

  if (partySize <= 2) {
    return "Reservasi tanpa deposit";
  }

  if (partySize >= 3 && partySize <= 4) {
    return "Deposit Reservasi 3-4 Tamu";
  }

  if (partySize >= 5) {
    return "Deposit Reservasi 5+ Tamu";
  }

  return "Deposit Reservasi";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (
      !body ||
      typeof body.reservationId !== "string" ||
      !Object.values(ReservationPaymentType).includes(body.paymentType)
    ) {
      return jsonError("Invalid payload", 400);
    }

    const reservation = await prisma.reservation.findUnique({
      where: {
        id: body.reservationId,
      },
      include: {
        guest: true,
      },
    });

    if (!reservation) {
      return jsonError("Reservasi tidak ditemukan.", 404);
    }

    const partySize = reservation.partySize;

    const depositAmount = getDepositAmountByPartySize(partySize);

    const minimumOrder = getMinimumOrderByPartySize(partySize);

    if (depositAmount === 0) {
      return jsonSuccess(
        {
          paymentRequired: false,
          reservationId: reservation.id,
          partySize,
          amount: 0,
          minimumOrder,
          depositPolicy: DEPOSIT_POLICY,
          message:
            "Reservasi untuk 2 tamu tidak memerlukan deposit.",
        },
        { status: 200 }
      );
    }

    const amount = depositAmount;

    const result = await createPayment({
      reservationId: reservation.id,
      paymentType: body.paymentType,
      amount,

      customer: {
        name: reservation.guest?.name ?? "Guest",

        email: reservation.guest?.email ?? undefined,

        phone: reservation.guest?.phone ?? undefined,
      },

      items: [
        {
          id: body.paymentType,
          name: getPaymentItemName(partySize, body.paymentType),
          price: amount,
          quantity: 1,
        },
      ],

      metadata: {
        partySize,
        minimumOrder,
      },
    });

    return jsonSuccess(
      {
        ...result,

        paymentRequired: true,
        reservationId: reservation.id,
        partySize,
        amount,
        minimumOrder,

        depositPolicy: DEPOSIT_POLICY,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal Server Error";

    console.error("Public Payment Error:", error);

    return jsonError(message, 500);
  }
}