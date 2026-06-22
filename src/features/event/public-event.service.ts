import { prisma } from "@/infrastructure/database/prisma";
import { getMidtransSnap } from "@/lib/midtrans";
import { generateOrderId } from "@/features/payments/payment.utils";
import { EventRequestStatus, EventPaymentStatus, EventPaymentType } from "@/generated/prisma/client";

// ─── Get Detail (for public tamu page) ───────────────────────────────────────

export async function getPublicEventRequestDetail(accessToken: string) {
  const eventRequest = await prisma.eventRequest.findUnique({
    where: { accessToken },
    include: {
      eventOffers: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          price: true,
          description: true,
          documentUrl: true,
          status: true,
          createdAt: true,
        },
      },
      eventPayments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          paidAt: true,
        },
      },
    },
  });

  if (!eventRequest) {
    throw new Error("Pengajuan event tidak ditemukan.");
  }

  const latestOffer = eventRequest.eventOffers[0] ?? null;
  const latestPayment = eventRequest.eventPayments[0] ?? null;

  return {
    id: eventRequest.id,
    status: eventRequest.status,
    eventType: eventRequest.eventType,
    eventDate: eventRequest.eventDate,
    partySize: eventRequest.partySize,
    description: eventRequest.description,
    guest: {
      id: eventRequest.guestId,
      name: eventRequest.contactName,
      phone: eventRequest.contactPhone,
      email: eventRequest.contactEmail,
    },
    offer: latestOffer,
    payment: latestPayment,
    canPay:
      eventRequest.status === EventRequestStatus.offered &&
      latestOffer !== null &&
      (!latestPayment || latestPayment.status === EventPaymentStatus.failed),
  };
}

// ─── Create Event Payment (generate Midtrans token) ──────────────────────────

export async function createEventPayment(accessToken: string) {
  const eventRequest = await prisma.eventRequest.findUnique({
    where: { accessToken },
    include: {
      eventOffers: {
        where: { status: "sent" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!eventRequest) {
    throw new Error("Pengajuan event tidak ditemukan.");
  }
  const eventRequestId = eventRequest.id;

  if (eventRequest.status !== EventRequestStatus.offered) {
    throw new Error(
      `Pembayaran tidak bisa dilakukan. Status pengajuan saat ini: '${eventRequest.status}'.`
    );
  }

  const offer = eventRequest.eventOffers[0];
  if (!offer || !offer.price) {
    throw new Error("Penawaran (offer) belum tersedia atau belum memiliki harga.");
  }

  // Cek apakah sudah ada payment yang sedang pending (hindari duplikat)
  const existingPendingPayment = await prisma.eventPayment.findFirst({
    where: {
      eventRequestId,
      status: EventPaymentStatus.pending,
    },
  });

  if (existingPendingPayment) {
    throw new Error(
      "Sudah ada transaksi pembayaran yang sedang menunggu. Harap selesaikan pembayaran sebelumnya."
    );
  }

  const depositAmount = Math.round(Number(offer.price) * 0.3); // 30% DP
  const orderId = generateOrderId("EVENT-DP");

  // Simpan record EventPayment dulu sebelum hit Midtrans
  const payment = await prisma.eventPayment.create({
    data: {
      eventRequestId,
      type: EventPaymentType.deposit,
      amount: depositAmount,
      status: EventPaymentStatus.pending,
      paymentMethod: null,
    },
  });

  const snap = getMidtransSnap();

  let transaction;
  try {
    transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: depositAmount,
      },
      customer_details: {
        first_name: eventRequest.contactName,
        phone: eventRequest.contactPhone,
        email: eventRequest.contactEmail ?? undefined,
      },
      item_details: [
        {
          id: `DP-${eventRequestId}`,
          name: `Uang Muka (DP) Event — ${eventRequest.eventType ?? "Special Event"}`,
          quantity: 1,
          price: depositAmount,
        },
      ],
      metadata: {
        event_request_id: eventRequestId,
        event_payment_id: payment.id,
        type: "event_deposit",
      },
    });
  } catch (err) {
    // Jika Midtrans gagal, hapus payment record yang sudah dibuat
    await prisma.eventPayment.delete({ where: { id: payment.id } });
    throw err;
  }

  // Simpan orderId Midtrans ke payment record (via metadata — karena EventPayment tidak punya midtransOrderId field)
  // Kita akan gunakan metadata dari Midtrans webhook untuk mencocokkan pembayaran
  // Hapus payment yang lama dan buat ulang dengan orderId tersimpan di paymentMethod sementara (workaround)
  // NOTE: EventPayment tidak punya midtransOrderId field di schema. Kita simpan di paymentMethod sebagai prefix.
  await prisma.eventPayment.update({
    where: { id: payment.id },
    data: { paymentMethod: `midtrans:${orderId}` },
  });

  return {
    paymentId: payment.id,
    orderId,
    token: transaction.token,
    redirectUrl: transaction.redirect_url,
    depositAmount,
  };
}
