import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus, Prisma, type Reservation } from "@/generated/prisma/client";
import { buildCheckInDeadline } from "@/infrastructure/check-in/grace";

export type GuestInput = {
  name: string;
  phone: string;
  email?: string;
};

export type ReservationInput = {
  sessionId: string;
  date: Date;
  partySize: number;
  specialRequest?: string;
  status: ReservationStatus;
  cancelToken: string;
  checkInToken: string;
  expiresAt: Date;
};

export async function createReservationTransaction(
  guestInput: GuestInput,
  reservationInput: ReservationInput,
  tableIds: string[],
) {
  if (tableIds.length === 0) {
    throw new Error("At least one table is required");
  }

  return prisma.$transaction(async (tx) => {
    let guest = await tx.guest.findFirst({
      where: { phone: guestInput.phone, deletedAt: null },
    });

    if (!guest) {
      guest = await tx.guest.create({
        data: {
          name: guestInput.name,
          phone: guestInput.phone,
          email: guestInput.email,
          isVip: false,
        },
      });
    }

    const session = await tx.restaurantSession.findUniqueOrThrow({
      where: { id: reservationInput.sessionId },
      select: { startTime: true },
    });

    const reservation = await tx.reservation.create({
      data: {
        guestId: guest.id,
        sessionId: reservationInput.sessionId,
        date: reservationInput.date,
        partySize: reservationInput.partySize,
        specialRequest: reservationInput.specialRequest,
        status: reservationInput.status,
        cancelToken: reservationInput.cancelToken,
        checkInToken: reservationInput.checkInToken,
        checkInTokenExpiresAt: buildCheckInDeadline(
          reservationInput.date,
          session.startTime,
        ),
        expiresAt: reservationInput.expiresAt,
      },
    });

    await tx.reservationTable.createMany({
      data: tableIds.map((tableId) => ({
        reservationId: reservation.id,
        tableId,
      })),
    });

    return reservation;
  });
}

const CANCELLABLE: ReservationStatus[] = [
  ReservationStatus.pending,
  ReservationStatus.confirmed,
];

export async function cancelReservationByToken(
  cancelToken: string,
): Promise<{ reservationId: string } | null> {
  const found = await prisma.reservation.findUnique({
    where: { cancelToken },
    select: { id: true, status: true },
  });
  if (!found) return null;
  if (!CANCELLABLE.includes(found.status)) {
    throw new Error("Reservation cannot be cancelled in its current status");
  }
  await prisma.reservation.update({
    where: { id: found.id },
    data: { status: ReservationStatus.cancelled },
  });
  return { reservationId: found.id };
}

/** Lookup check-in admin: UUID internal atau check_in_token QR. */
export async function findReservationByLookup(
  lookup: string,
): Promise<(Reservation & { guest: { name: string } }) | null> {
  const trimmed = lookup.trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(trimmed)) {
    return prisma.reservation.findFirst({
      where: { id: trimmed },
      include: { guest: { select: { name: true } } },
    });
  }

  return prisma.reservation.findFirst({
    where: {
      checkInToken: trimmed,
      OR: [
        { checkInTokenExpiresAt: null },
        { checkInTokenExpiresAt: { gt: new Date() } },
      ],
    },
    include: { guest: { select: { name: true } } },
  });
}

export async function findReservationByIdForAdmin(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      guest: { select: { id: true, name: true, phone: true } },
      session: { select: { id: true, name: true } },
      checkIn: true,
      reservationTables: {
        include: { table: { select: { id: true, tableNumber: true } } },
      },
    },
  });
}

export type AdminReservationFilters = {
  date?: Date;
  status?: ReservationStatus;
  sessionId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export async function getAdminReservations(filters: AdminReservationFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
  const skip = (page - 1) * limit;

  const where: Prisma.ReservationWhereInput = {};

  if (filters.date) where.date = filters.date;
  if (filters.status) where.status = filters.status;
  if (filters.sessionId) where.sessionId = filters.sessionId;

  if (filters.search) {
    where.guest = {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
      ],
    };
  }

  const [total, data] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        guest: { select: { id: true, name: true, phone: true } },
        session: { select: { id: true, name: true, startTime: true, endTime: true } },
        reservationTables: {
          include: {
            table: { select: { id: true, tableNumber: true, capacity: true } },
          },
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  return prisma.reservation.update({
    where: { id },
    data: { status },
    include: { guest: { select: { id: true } } },
  });
}

export async function getReservationById(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      reservationTables: { select: { tableId: true } },
    },
  });
}

export async function updateReservationTablesTransaction(
  reservationId: string,
  tableIds: string[],
) {
  if (tableIds.length === 0) {
    throw new Error("At least one table is required");
  }

  return prisma.$transaction(async (tx) => {
    await tx.reservationTable.deleteMany({ where: { reservationId } });
    await tx.reservationTable.createMany({
      data: tableIds.map((tableId) => ({ reservationId, tableId })),
    });
    return tx.reservation.findUnique({
      where: { id: reservationId },
      include: {
        reservationTables: {
          include: { table: { select: { id: true, tableNumber: true, capacity: true } } },
        },
      },
    });
  });
}
