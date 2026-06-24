import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";

type PaymentListItem = Prisma.PaymentGetPayload<{
  include: {
    reservation: {
      include: {
        guest: true;
        session: true;
      };
    };
  };
}>;

export type OwnerPaymentStatus = "paid" | "pending" | "failed" | "refunded";

export type OwnerPaymentRow = {
  orderId: string;
  guestName: string;
  reservationDate: string;
  sessionName: string;
  partySize: number;
  paymentType: string;
  paymentMethod: string;
  amount: number;
  status: OwnerPaymentStatus;
  paidAt: string | null;
  createdAt: string;
};

export type OwnerMonthlyMetric = {
  label: string;
  revenue: number;
  deposits: number;
  fullPayments: number;
  reservations: number;
  guests: number;
};

export type OwnerSessionPaidBookingLoad = {
  label: string;
  guests: number;
  capacity: number;
  loadRate: number;
};

export type OwnerStatusSummary = {
  status: OwnerPaymentStatus;
  count: number;
  amount: number;
};

export type OwnerPaymentAnalytics = {
  generatedAt: string;
  currentMonthLabel: string;
  reportRangeLabel: string;
  currentMonthRevenue: number;
  currentMonthPaidPaymentCount: number;
  currentMonthPaidReservationCount: number;
  currentMonthPaidGuestCount: number;
  currentMonthPendingReservationCount: number;
  totalPaidRevenue: number;
  pendingAmount: number;
  refundedAmount: number;
  paidPaymentCount: number;
  totalPaymentCount: number;
  reservationCount: number;
  guestCount: number;
  averagePaidBookingLoadRate: number;
  checkInConversionRate: number;
  cancellationCount: number;
  noShowCount: number;
  monthlyMetrics: OwnerMonthlyMetric[];
  paidBookingLoadBySession: OwnerSessionPaidBookingLoad[];
  statusSummary: OwnerStatusSummary[];
  currentMonthStatusSummary: OwnerStatusSummary[];
  paymentRows: OwnerPaymentRow[];
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

function getPaymentDate(payment: PaymentListItem) {
  return payment.paidAt ?? payment.createdAt;
}

function getMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

function getLastMonthBuckets(count: number, now = new Date()) {
  const [currentYear, currentMonth] = getMonthKey(now)
    .split("-")
    .map(Number);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(
        currentYear,
        currentMonth - 1 - (count - 1 - index),
        15,
        12,
      ),
    );
    return {
      key: getMonthKey(date),
      label: MONTH_FORMATTER.format(date),
      revenue: 0,
      deposits: 0,
      fullPayments: 0,
      reservationIds: new Set<string>(),
      guestCountByReservation: new Map<string, number>(),
    };
  });
}

function normalizeStatus(status: PaymentListItem["status"]): OwnerPaymentStatus {
  return status as OwnerPaymentStatus;
}

function toPaymentRow(payment: PaymentListItem): OwnerPaymentRow {
  return {
    orderId: payment.midtransOrderId ?? payment.id,
    guestName: payment.reservation.guest.name,
    reservationDate: payment.reservation.date.toISOString(),
    sessionName: payment.reservation.session.name,
    partySize: payment.reservation.partySize,
    paymentType: payment.type,
    paymentMethod: payment.paymentMethod ?? "-",
    amount: Number(payment.amount),
    status: normalizeStatus(payment.status),
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export async function getOwnerPaymentAnalytics(): Promise<OwnerPaymentAnalytics> {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reservation: {
        include: {
          guest: true,
          session: true,
        },
      },
    },
  });
  const now = new Date();
  const currentMonthKey = getMonthKey(now);
  const monthlyBuckets = getLastMonthBuckets(6, now);
  const monthlyBucketMap = new Map(monthlyBuckets.map((bucket) => [bucket.key, bucket]));
  const paidReservationMap = new Map<string, PaymentListItem["reservation"]>();
  const currentMonthPaidReservationMap = new Map<
    string,
    PaymentListItem["reservation"]
  >();
  const sessionMap = new Map<
    string,
    {
      label: string;
      guests: number;
      capacity: number;
      reservationIds: Set<string>;
      sessionDateKeys: Set<string>;
    }
  >();

  const statusSummary = new Map<OwnerPaymentStatus, OwnerStatusSummary>(
    (["paid", "pending", "failed", "refunded"] as OwnerPaymentStatus[]).map(
      (status) => [status, { status, count: 0, amount: 0 }]
    )
  );
  const currentMonthStatusSummary = new Map<OwnerPaymentStatus, OwnerStatusSummary>(
    (["paid", "pending", "failed", "refunded"] as OwnerPaymentStatus[]).map(
      (status) => [status, { status, count: 0, amount: 0 }]
    )
  );

  let currentMonthRevenue = 0;
  let currentMonthPaidPaymentCount = 0;
  let totalPaidRevenue = 0;
  let pendingAmount = 0;
  let refundedAmount = 0;
  let paidPaymentCount = 0;

  for (const payment of payments) {
    const status = normalizeStatus(payment.status);
    const amount = Number(payment.amount);
    const summary = statusSummary.get(status);
    const date = getPaymentDate(payment);
    const monthKey = getMonthKey(date);
    const currentMonthSummary = currentMonthStatusSummary.get(status);

    if (summary) {
      summary.count += 1;
      summary.amount += amount;
    }

    if (monthKey === currentMonthKey && currentMonthSummary) {
      currentMonthSummary.count += 1;
      currentMonthSummary.amount += amount;
    }

    if (status === "paid") {
      if (!paidReservationMap.has(payment.reservation.id)) {
        paidReservationMap.set(payment.reservation.id, payment.reservation);
      }

      const bucket = monthlyBucketMap.get(monthKey);

      paidPaymentCount += 1;
      totalPaidRevenue += amount;

      if (monthKey === currentMonthKey) {
        currentMonthRevenue += amount;
        currentMonthPaidPaymentCount += 1;
        if (!currentMonthPaidReservationMap.has(payment.reservation.id)) {
          currentMonthPaidReservationMap.set(
            payment.reservation.id,
            payment.reservation
          );
        }
      }

      if (bucket) {
        bucket.revenue += amount;
        if (payment.type === "deposit") bucket.deposits += amount;
        if (payment.type === "full") bucket.fullPayments += amount;
        bucket.reservationIds.add(payment.reservation.id);
        bucket.guestCountByReservation.set(
          payment.reservation.id,
          payment.reservation.partySize
        );
      }
    }

    if (status === "pending") {
      pendingAmount += amount;
    }

    if (status === "refunded") {
      refundedAmount += amount;
    }
  }

  for (const reservation of paidReservationMap.values()) {
    const sessionId = reservation.session.id;
    const current = sessionMap.get(sessionId) ?? {
      label: reservation.session.name,
      guests: 0,
      capacity: 0,
      reservationIds: new Set<string>(),
      sessionDateKeys: new Set<string>(),
    };

    if (!current.reservationIds.has(reservation.id)) {
      current.reservationIds.add(reservation.id);
      current.guests += reservation.partySize;
    }

    const sessionDateKey = `${reservation.session.id}:${reservation.date
      .toISOString()
      .slice(0, 10)}`;

    if (!current.sessionDateKeys.has(sessionDateKey)) {
      current.sessionDateKeys.add(sessionDateKey);
      current.capacity += reservation.session.maxCapacity;
    }

    sessionMap.set(sessionId, current);
  }

  const paidBookingLoadBySession = Array.from(sessionMap.entries()).map(
    ([, value]) => ({
      label: value.label,
      guests: value.guests,
      capacity: value.capacity,
      loadRate:
        value.capacity > 0 ? Math.round((value.guests / value.capacity) * 100) : 0,
    })
  );

  const totalPaidBookingCapacity = paidBookingLoadBySession.reduce(
    (sum, session) => sum + session.capacity,
    0
  );
  const paidBookingGuestCount = Array.from(paidReservationMap.values()).reduce(
    (sum, reservation) => sum + reservation.partySize,
    0
  );
  const guestCount = paidBookingGuestCount;

  const paidReservationIds = new Set(paidReservationMap.keys());
  const checkedInCount = await prisma.checkIn.count({
    where: {
      reservationId: { in: Array.from(paidReservationIds) },
    },
  });

  const [currentYear, currentMonth] = currentMonthKey.split("-").map(Number);
  const currentMonthStart = new Date(`${currentMonthKey}-01T00:00:00.000+07:00`);
  const nextMonthDate = new Date(
    Date.UTC(currentYear, currentMonth, 1, 12, 0, 0)
  );
  const nextMonthKey = getMonthKey(nextMonthDate);
  const currentMonthEnd = new Date(`${nextMonthKey}-01T00:00:00.000+07:00`);
  const currentMonthReservationWhere = {
    date: {
      gte: currentMonthStart,
      lt: currentMonthEnd,
    },
  };

  const currentMonthPendingReservationCount = await prisma.reservation.count({
    where: {
      ...currentMonthReservationWhere,
      status: "pending",
    },
  });

  const cancellationCount = await prisma.reservation.count({
    where: {
      ...currentMonthReservationWhere,
      status: "cancelled",
    },
  });

  const noShowCount = await prisma.reservation.count({
    where: {
      ...currentMonthReservationWhere,
      status: "no_show",
    },
  });

  const checkInConversionRate =
    paidReservationIds.size > 0
      ? Math.round((checkedInCount / paidReservationIds.size) * 100)
      : 0;

  return {
    generatedAt: now.toISOString(),
    currentMonthLabel: MONTH_FORMATTER.format(now),
    reportRangeLabel: `${monthlyBuckets[0]?.label ?? ""} - ${
      monthlyBuckets[monthlyBuckets.length - 1]?.label ?? ""
    }`,
    currentMonthRevenue,
    currentMonthPaidPaymentCount,
    currentMonthPaidReservationCount: currentMonthPaidReservationMap.size,
    currentMonthPaidGuestCount: Array.from(
      currentMonthPaidReservationMap.values()
    ).reduce((sum, reservation) => sum + reservation.partySize, 0),
    currentMonthPendingReservationCount,
    totalPaidRevenue,
    pendingAmount,
    refundedAmount,
    paidPaymentCount,
    totalPaymentCount: payments.length,
    reservationCount: paidReservationMap.size,
    guestCount,
    averagePaidBookingLoadRate:
      totalPaidBookingCapacity > 0
        ? Math.round((paidBookingGuestCount / totalPaidBookingCapacity) * 100)
        : 0,
    checkInConversionRate,
    cancellationCount,
    noShowCount,
    monthlyMetrics: monthlyBuckets.map((bucket) => ({
      label: bucket.label,
      revenue: bucket.revenue,
      deposits: bucket.deposits,
      fullPayments: bucket.fullPayments,
      reservations: bucket.reservationIds.size,
      guests: Array.from(bucket.guestCountByReservation.values()).reduce(
        (sum, value) => sum + value,
        0
      ),
    })),
    paidBookingLoadBySession,
    statusSummary: Array.from(statusSummary.values()),
    currentMonthStatusSummary: Array.from(currentMonthStatusSummary.values()),
    paymentRows: payments.map(toPaymentRow),
  };
}
