import { prisma } from "@/infrastructure/database/prisma";
import {
  Prisma,
  ReservationStatus,
  TableStatus,
} from "@/generated/prisma/client";

const RESERVATION_PENDING_EXPIRY_MINUTES = 15;

type TransactionClient = Prisma.TransactionClient;

type TableOption = {
  id: string;
  capacity: number;
};

export type CreateReservationInput = {
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  sessionId: string;
  tableIds: string[];
  date: string;
  partySize: number;
  specialRequest?: string;
};

export type CreateReservationResult = {
  reservationId: string;
  guestId: string;
  status: string;
  tableIds: string[];
  expiresAt: Date | null;
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

function findBestTableCombination(
  tables: TableOption[],
  partySize: number
): TableOption[] {
  const combinations: TableOption[][] = [];

  function backtrack(
    startIndex: number,
    selectedTables: TableOption[],
    selectedCapacity: number
  ) {
    if (selectedCapacity >= partySize) {
      combinations.push([...selectedTables]);
      return;
    }

    for (let index = startIndex; index < tables.length; index += 1) {
      const table = tables[index];

      backtrack(
        index + 1,
        [...selectedTables, table],
        selectedCapacity + table.capacity
      );
    }
  }

  backtrack(0, [], 0);

  const sortedCombinations = combinations.sort((a, b) => {
    const capacityA = a.reduce((total, table) => total + table.capacity, 0);
    const capacityB = b.reduce((total, table) => total + table.capacity, 0);

    if (capacityA !== capacityB) {
      return capacityA - capacityB;
    }

    return a.length - b.length;
  });

  return sortedCombinations[0] ?? [];
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

    let guest = await tx.guest.findFirst({
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

    const availableTables = await tx.table.findMany({
      where: {
        isActive: true,
        status: {
          not: TableStatus.MAINTENANCE,
        },
        id: {
          notIn: usedTableIds,
        },
      },
      select: {
        id: true,
        capacity: true,
      },
      orderBy: {
        capacity: "asc",
      },
    });

    const selectedTables = findBestTableCombination(
      availableTables,
      input.partySize
    );

    if (selectedTables.length === 0) {
      throw new Error(
        "Meja tidak tersedia untuk jumlah tamu dan session yang dipilih."
      );
    }

    const reservationStatus =
      input.partySize <= 2
        ? ReservationStatus.confirmed
        : ReservationStatus.pending;

    const expiresAt = getReservationExpiry(input.partySize);

    const reservation = await tx.reservation.create({
      data: {
        guestId: guest.id,
        sessionId: input.sessionId,
        date: reservationDate,
        partySize: input.partySize,
        status: reservationStatus,
        specialRequest: input.specialRequest ?? null,
        expiresAt,
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
    };
  });

  return result;
}