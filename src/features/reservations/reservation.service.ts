import crypto from "crypto";
import { prisma } from "@/infrastructure/database/prisma";
import {
  Prisma,
  ReservationStatus,
  TableStatus,
} from "@/generated/prisma/client";
import { appEvents, EVENTS } from "@/lib/events";

const RESERVATION_PENDING_EXPIRY_MINUTES = 15;

type TransactionClient = Prisma.TransactionClient;

export type CreateReservationInput = {
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  sessionId: string;
  tableIds: string[];
  date: string;
  partySize: number;
  specialRequest?: string;
  vipToken?: string;
};

export type CreateReservationResult = {
  reservationId: string;
  guestId: string;
  status: string;
  tableIds: string[];
  expiresAt: Date | null;
  /** Token untuk cancel publik & check-in lookup (QR). */
  cancelToken: string;
};

function getReservationExpiry(partySize: number) {
  if (partySize <= 2) {
    return null;
  }

  const expiresAt = new Date();

  expiresAt.setMinutes(
    expiresAt.getMinutes() + RESERVATION_PENDING_EXPIRY_MINUTES
  );

  return expiresAt;
}

async function expireOldPendingReservations(tx: TransactionClient) {
  await tx.reservation.updateMany({
    where: {
      status: ReservationStatus.pending,
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: ReservationStatus.cancelled,
    },
  });
}

export async function createPublicReservation(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  const result = await prisma.$transaction(async (tx) => {
    await expireOldPendingReservations(tx);

    const reservationDate = new Date(input.date);

    const blockedDate = await tx.blockedDate.findFirst({
      where: {
        date: reservationDate,
      },
    });

    if (blockedDate) {
      throw new Error("Tanggal ini sedang tidak tersedia untuk reservasi.");
    }

    const session = await tx.restaurantSession.findFirst({
      where: {
        id: input.sessionId,
        isActive: true,
      },
    });

    if (!session) {
      throw new Error("Session tidak ditemukan atau tidak aktif.");
    }

    let guest = null;
    let isVipValid = false;

    if (input.vipToken) {
      const vipCard = await tx.vipCard.findUnique({
        where: { token: input.vipToken },
        include: { guest: true },
      });
      if (vipCard && vipCard.isActive) {
        guest = vipCard.guest;
        isVipValid = true;
      } else {
        throw new Error("Token VIP tidak valid atau sudah tidak aktif.");
      }
    } else {
      guest = await tx.guest.findFirst({
        where: {
          phone: input.guestPhone,
          deletedAt: null,
        },
      });

      if (!guest) {
        guest = await tx.guest.create({
          data: {
            name: input.guestName,
            phone: input.guestPhone,
            email: input.guestEmail ?? null,
            isVip: false,
            tags: [],
          },
        });
      } else {
        guest = await tx.guest.update({
          where: {
            id: guest.id,
          },
          data: {
            name: input.guestName,
            email: input.guestEmail ?? guest.email,
          },
        });
      }
    }

    const activeReservations = await tx.reservation.findMany({
      where: {
        date: reservationDate,
        sessionId: input.sessionId,
        OR: [
          {
            status: {
              in: [
                ReservationStatus.confirmed,
                ReservationStatus.checked_in,
              ],
            },
          },
          {
            status: ReservationStatus.pending,
            OR: [
              {
                expiresAt: null,
              },
              {
                expiresAt: {
                  gt: new Date(),
                },
              },
            ],
          },
        ],
      },
      include: {
        reservationTables: true,
      },
    });

    const usedTableIds = activeReservations.flatMap((reservation) =>
      reservation.reservationTables.map(
        (reservationTable) => reservationTable.tableId
      )
    );

    const selectedTableIds = Array.from(new Set(input.tableIds));

    if (selectedTableIds.length === 0) {
      throw new Error("Minimal satu meja harus dipilih.");
    }

    const unavailableTableIds = selectedTableIds.filter((tableId) =>
      usedTableIds.includes(tableId)
    );

    if (unavailableTableIds.length > 0) {
      throw new Error(
        "Meja yang dipilih sudah dipesan atau sedang dalam proses pembayaran. Silakan pilih meja lain."
      );
    }

    const selectedTables = await tx.table.findMany({
      where: {
        id: {
          in: selectedTableIds,
        },
        isActive: true,
        status: {
          notIn: [
            TableStatus.MAINTENANCE,
            TableStatus.OCCUPIED,
            TableStatus.RESERVED,
          ],
        },
      },
      select: {
        id: true,
        capacity: true,
        tableNumber: true,
      },
      orderBy: {
        capacity: "asc",
      },
    });

    if (selectedTables.length !== selectedTableIds.length) {
      throw new Error(
        "Beberapa meja tidak ditemukan atau tidak tersedia untuk reservasi."
      );
    }

    const selectedCapacity = selectedTables.reduce(
      (total, table) => total + table.capacity,
      0
    );

    if (selectedCapacity < input.partySize) {
      throw new Error(
        `Kapasitas total meja yang dipilih (${selectedCapacity} orang) tidak mencukupi untuk jumlah tamu (${input.partySize} orang). Silakan pilih meja tambahan.`
      );
    }

    const reservationStatus =
      isVipValid || input.partySize <= 2
        ? ReservationStatus.confirmed
        : ReservationStatus.pending;

    const expiresAt = isVipValid ? null : getReservationExpiry(input.partySize);
    const cancelToken = crypto.randomBytes(16).toString("hex");

    const reservation = await tx.reservation.create({
      data: {
        guestId: guest.id,
        sessionId: input.sessionId,
        date: reservationDate,
        partySize: input.partySize,
        status: reservationStatus,
        specialRequest: input.specialRequest ?? null,
        expiresAt,
        cancelToken,
      },
    });

    await tx.reservationTable.createMany({
      data: selectedTables.map((table) => ({
        reservationId: reservation.id,
        tableId: table.id,
      })),
    });

    return {
      reservationId: reservation.id,
      guestId: guest.id,
      status: reservation.status,
      tableIds: selectedTables.map((table) => table.id),
      expiresAt: reservation.expiresAt,
      cancelToken: reservation.cancelToken!,
    };
  });

  appEvents.emit(EVENTS.RESERVATION_CREATED, {
    reservationId: result.reservationId,
    status: result.status,
    guestId: result.guestId,
  });

  return result;
}

export async function getVipInvitationByToken(token: string) {
  const vipCard = await prisma.vipCard.findUnique({
    where: { token },
    include: { guest: true },
  });

  if (!vipCard || !vipCard.isActive) return null;

  return {
    token: vipCard.token,
    guestName: vipCard.guest.name,
    vipTier: vipCard.tier,
    benefits: vipCard.benefits,
    qrCodeUrl: vipCard.qrCodeUrl,
  };
}
