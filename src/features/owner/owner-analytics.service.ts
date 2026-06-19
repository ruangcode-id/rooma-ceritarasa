import { listPayments } from "@/features/payments/payment.service";

type PaymentListItem = Awaited<ReturnType<typeof listPayments>>["data"][number];

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
  currentMonthRevenue: number;
  totalPaidRevenue: number;
  pendingAmount: number;
  refundedAmount: number;
  paidPaymentCount: number;
  totalPaymentCount: number;
  reservationCount: number;
  guestCount: number;
  averagePaidBookingLoadRate: number;
  monthlyMetrics: OwnerMonthlyMetric[];
  paidBookingLoadBySession: OwnerSessionPaidBookingLoad[];
  statusSummary: OwnerStatusSummary[];
  paymentRows: OwnerPaymentRow[];
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "short",
});

function getPaymentDate(payment: PaymentListItem) {
  return payment.paidAt ?? payment.createdAt;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLastMonthBuckets(count: number, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
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
    orderId: payment.orderId,
    guestName: payment.reservation.guest.name,
    reservationDate: payment.reservation.date.toISOString(),
    sessionName: payment.reservation.session.name,
    partySize: payment.reservation.partySize,
    paymentType: payment.type,
    paymentMethod: payment.paymentMethod ?? "-",
    amount: payment.amount ?? 0,
    status: normalizeStatus(payment.status),
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export async function getOwnerPaymentAnalytics(): Promise<OwnerPaymentAnalytics> {
  const result = await listPayments({ page: 1, limit: 500 });
  const payments = result.data;
  const now = new Date();
  const currentMonthKey = getMonthKey(now);
  const monthlyBuckets = getLastMonthBuckets(6, now);
  const monthlyBucketMap = new Map(monthlyBuckets.map((bucket) => [bucket.key, bucket]));
  const reservationMap = new Map<string, PaymentListItem["reservation"]>();
  const paidReservationMap = new Map<string, PaymentListItem["reservation"]>();
  const sessionMap = new Map<
    string,
    {
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

  let currentMonthRevenue = 0;
  let totalPaidRevenue = 0;
  let pendingAmount = 0;
  let refundedAmount = 0;
  let paidPaymentCount = 0;

  for (const payment of payments) {
    const status = normalizeStatus(payment.status);
    const amount = payment.amount ?? 0;
    const summary = statusSummary.get(status);

    if (summary) {
      summary.count += 1;
      summary.amount += amount;
    }

    if (!reservationMap.has(payment.reservation.id)) {
      reservationMap.set(payment.reservation.id, payment.reservation);
    }

    if (status === "paid") {
      if (!paidReservationMap.has(payment.reservation.id)) {
        paidReservationMap.set(payment.reservation.id, payment.reservation);
      }

      const date = getPaymentDate(payment);
      const monthKey = getMonthKey(date);
      const bucket = monthlyBucketMap.get(monthKey);

      paidPaymentCount += 1;
      totalPaidRevenue += amount;

      if (monthKey === currentMonthKey) {
        currentMonthRevenue += amount;
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
    const sessionName = reservation.session.name;
    const current = sessionMap.get(sessionName) ?? {
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

    sessionMap.set(sessionName, current);
  }

  const paidBookingLoadBySession = Array.from(sessionMap.entries()).map(
    ([label, value]) => ({
      label,
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
  const guestCount = Array.from(reservationMap.values()).reduce(
    (sum, reservation) => sum + reservation.partySize,
    0
  );

  return {
    generatedAt: now.toISOString(),
    currentMonthRevenue,
    totalPaidRevenue,
    pendingAmount,
    refundedAmount,
    paidPaymentCount,
    totalPaymentCount: payments.length,
    reservationCount: reservationMap.size,
    guestCount,
    averagePaidBookingLoadRate:
      totalPaidBookingCapacity > 0
        ? Math.round((paidBookingGuestCount / totalPaidBookingCapacity) * 100)
        : 0,
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
    paymentRows: payments.map(toPaymentRow),
  };
}
