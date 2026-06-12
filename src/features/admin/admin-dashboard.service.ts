import {
  PaymentStatus,
  ReservationStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";

export type AdminDashboardStatus = `${ReservationStatus}`;

export type AdminDashboardMetric = {
  totalReservations: number;
  expectedGuests: number;
  checkedInGuests: number;
  pendingReservations: number;
  paidRevenueToday: number;
  occupancyRate: number;
};

export type AdminDashboardSessionRow = {
  id: string;
  name: string;
  time: string;
  reservations: number;
  guests: number;
  checkedIn: number;
  capacity: number;
  occupancyRate: number;
};

export type AdminDashboardReservationRow = {
  id: string;
  guestName: string;
  guestPhone: string;
  sessionName: string;
  sessionTime: string;
  partySize: number;
  status: AdminDashboardStatus;
  tables: string;
  paymentStatus: string;
};

export type AdminDashboardData = {
  generatedAt: string;
  dateLabel: string;
  metrics: AdminDashboardMetric;
  statusCounts: Array<{ status: AdminDashboardStatus; count: number }>;
  sessions: AdminDashboardSessionRow[];
  reservations: AdminDashboardReservationRow[];
};

const ACTIVE_OPERATIONAL_STATUSES: ReservationStatus[] = [
  ReservationStatus.pending,
  ReservationStatus.confirmed,
  ReservationStatus.checked_in,
];

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function getTodayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function formatSessionTime(startTime: Date, endTime: Date) {
  return `${startTime.toISOString().slice(11, 16)} - ${endTime
    .toISOString()
    .slice(11, 16)}`;
}

export async function getAdminOperationalDashboard(): Promise<AdminDashboardData> {
  const now = new Date();
  const { start, end } = getTodayRange(now);
  const dayOfWeek = now.getDay();

  const [reservations, activeSessions, paidRevenue] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        guest: {
          select: {
            name: true,
            phone: true,
          },
        },
        session: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            maxCapacity: true,
          },
        },
        reservationTables: {
          include: {
            table: {
              select: {
                tableNumber: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            status: true,
          },
          take: 1,
        },
      },
    }),
    prisma.restaurantSession.findMany({
      where: {
        isActive: true,
        dayOfWeek: {
          has: dayOfWeek,
        },
      },
      orderBy: {
        startTime: "asc",
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        maxCapacity: true,
      },
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.paid,
        paidAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const operationalReservations = reservations.filter((reservation) =>
    ACTIVE_OPERATIONAL_STATUSES.includes(reservation.status)
  );
  const expectedGuests = operationalReservations.reduce(
    (sum, reservation) => sum + reservation.partySize,
    0
  );
  const checkedInGuests = reservations
    .filter((reservation) => reservation.status === ReservationStatus.checked_in)
    .reduce((sum, reservation) => sum + reservation.partySize, 0);
  const totalCapacity = activeSessions.reduce(
    (sum, session) => sum + session.maxCapacity,
    0
  );

  const statusCounts = Object.values(ReservationStatus).map((status) => ({
    status,
    count: reservations.filter((reservation) => reservation.status === status)
      .length,
  }));

  const sessionMap = new Map(
    activeSessions.map((session) => [
      session.id,
      {
        id: session.id,
        name: session.name,
        time: formatSessionTime(session.startTime, session.endTime),
        reservations: 0,
        guests: 0,
        checkedIn: 0,
        capacity: session.maxCapacity,
      },
    ])
  );

  for (const reservation of operationalReservations) {
    const row =
      sessionMap.get(reservation.session.id) ??
      {
        id: reservation.session.id,
        name: reservation.session.name,
        time: formatSessionTime(
          reservation.session.startTime,
          reservation.session.endTime
        ),
        reservations: 0,
        guests: 0,
        checkedIn: 0,
        capacity: reservation.session.maxCapacity,
      };

    row.reservations += 1;
    row.guests += reservation.partySize;
    if (reservation.status === ReservationStatus.checked_in) {
      row.checkedIn += reservation.partySize;
    }
    sessionMap.set(row.id, row);
  }

  const sessions = Array.from(sessionMap.values()).map((session) => ({
    ...session,
    occupancyRate:
      session.capacity > 0
        ? Math.round((session.guests / session.capacity) * 100)
        : 0,
  }));

  return {
    generatedAt: now.toISOString(),
    dateLabel: DATE_FORMATTER.format(now),
    metrics: {
      totalReservations: reservations.length,
      expectedGuests,
      checkedInGuests,
      pendingReservations: reservations.filter(
        (reservation) => reservation.status === ReservationStatus.pending
      ).length,
      paidRevenueToday: Number(paidRevenue._sum.amount ?? 0),
      occupancyRate:
        totalCapacity > 0
          ? Math.round((expectedGuests / totalCapacity) * 100)
          : 0,
    },
    statusCounts,
    sessions,
    reservations: reservations.map((reservation) => ({
      id: reservation.id,
      guestName: reservation.guest.name,
      guestPhone: reservation.guest.phone,
      sessionName: reservation.session.name,
      sessionTime: formatSessionTime(
        reservation.session.startTime,
        reservation.session.endTime
      ),
      partySize: reservation.partySize,
      status: reservation.status,
      tables:
        reservation.reservationTables
          .map((reservationTable) => reservationTable.table.tableNumber)
          .join(", ") || "-",
      paymentStatus: reservation.payments[0]?.status ?? "-",
    })),
  };
}
