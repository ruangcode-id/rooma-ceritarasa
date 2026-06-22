import { prisma } from "@/infrastructure/database/prisma";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { eventNotificationService } from "@/infrastructure/services/notification.service";
import {
  EventRequestStatus,
  EventOfferStatus,
} from "@/generated/prisma/client";
import type { SubmitOfferInput, UpdateEventRequestStatusInput } from "./admin-event.validation";

const ALLOWED_TERMINAL_STATUSES: EventRequestStatus[] = [
  EventRequestStatus.accepted,
  EventRequestStatus.rejected,
  EventRequestStatus.cancelled,
];

const ALLOWED_TRANSITIONS: Partial<Record<EventRequestStatus, EventRequestStatus[]>> = {
  [EventRequestStatus.pending]: [EventRequestStatus.rejected, EventRequestStatus.cancelled],
  [EventRequestStatus.offered]: [EventRequestStatus.rejected, EventRequestStatus.cancelled],
};

function getEventTrackingUrl(accessToken: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${appUrl.replace(/\/+$/, "")}/event/request/${accessToken}`;
}

function createOfferPdfPublicId(
  eventRequestId: string,
  originalName: string,
) {
  const fileStem =
    originalName
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "penawaran";

  return `offer-${eventRequestId}-${Date.now()}-${fileStem}.pdf`;
}

// ─── List Event Requests ──────────────────────────────────────────────────────

export async function getEventRequests(query: {
  page?: string | null;
  limit?: string | null;
  status?: string | null;
}) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "10", 10) || 10));
  const skip = (page - 1) * limit;

  const whereStatus =
    query.status &&
    Object.values(EventRequestStatus).includes(query.status as EventRequestStatus)
      ? (query.status as EventRequestStatus)
      : undefined;

  const where = whereStatus ? { status: whereStatus } : {};

  const [total, rows] = await Promise.all([
    prisma.eventRequest.count({ where }),
    prisma.eventRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        eventOffers: {
          select: { id: true, price: true, documentUrl: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: rows.map((r) => ({
      id: r.id,
      guest: {
        id: r.guestId,
        name: r.contactName,
        phone: r.contactPhone,
        email: r.contactEmail,
      },
      eventType: r.eventType,
      eventDate: r.eventDate,
      partySize: r.partySize,
      description: r.description,
      status: r.status,
      latestOffer: r.eventOffers[0] ?? null,
      createdAt: r.createdAt,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ─── Submit Offer ─────────────────────────────────────────────────────────────

export async function submitEventOffer(
  eventRequestId: string,
  input: SubmitOfferInput,
  pdfBuffer: Buffer,
  pdfOriginalName: string,
  adminId: string
) {
  // 1. Pastikan EventRequest ada dan statusnya 'pending'
  const eventRequest = await prisma.eventRequest.findUnique({
    where: { id: eventRequestId },
  });

  if (!eventRequest) {
    throw new Error("EventRequest tidak ditemukan.");
  }

  if (eventRequest.status !== EventRequestStatus.pending) {
    throw new Error(
      `Tidak bisa mengirim penawaran pada event dengan status '${eventRequest.status}'. Hanya status 'pending' yang diizinkan.`
    );
  }

  if (ALLOWED_TERMINAL_STATUSES.includes(eventRequest.status)) {
    throw new Error("Event request ini sudah dalam status final dan tidak bisa diubah.");
  }

  // 2. Upload PDF ke Cloudinary
  const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
  const uploadResult = await uploadToCloudinary(pdfDataUri, {
    folder: "events/offers",
    resourceType: "raw",
    publicId: createOfferPdfPublicId(eventRequestId, pdfOriginalName),
    unique_filename: false,
  });

  // 3. Buat EventOffer dan ubah status EventRequest dalam satu transaksi
  const [offer] = await prisma.$transaction([
    prisma.eventOffer.create({
      data: {
        eventRequestId,
        createdBy: adminId,
        price: input.price,
        description: input.description,
        documentUrl: uploadResult.secure_url,
        status: EventOfferStatus.sent,
      },
    }),
    prisma.eventRequest.update({
      where: { id: eventRequestId },
      data: { status: EventRequestStatus.offered },
    }),
  ]);

  // 4. Trigger notifikasi untuk Dev C (fire & forget)
  eventNotificationService
    .triggerEventNotification({
      type: "event_offer_sent",
      eventRequestId,
      picName: eventRequest.contactName,
      picPhone: eventRequest.contactPhone,
      picEmail: eventRequest.contactEmail,
      eventDate: eventRequest.eventDate,
      offerPdfUrl: uploadResult.secure_url,
      offerPrice: input.price,
      trackingUrl: getEventTrackingUrl(eventRequest.accessToken),
    })
    .catch((err) => console.error("[event-admin] Notification trigger failed:", err));

  return {
    offerId: offer.id,
    documentUrl: offer.documentUrl,
    price: offer.price,
    status: offer.status,
  };
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateEventRequestStatus(
  eventRequestId: string,
  input: UpdateEventRequestStatusInput
) {
  const eventRequest = await prisma.eventRequest.findUnique({
    where: { id: eventRequestId },
  });

  if (!eventRequest) {
    throw new Error("EventRequest tidak ditemukan.");
  }

  // Guard: cek apakah transisi diizinkan
  const allowedNext = ALLOWED_TRANSITIONS[eventRequest.status];
  const targetStatus = input.status as EventRequestStatus;

  if (!allowedNext || !allowedNext.includes(targetStatus)) {
    throw new Error(
      `Tidak bisa mengubah status dari '${eventRequest.status}' ke '${input.status}'.`
    );
  }

  const updated = await prisma.eventRequest.update({
    where: { id: eventRequestId },
    data: { status: targetStatus },
  });

  // Trigger notifikasi pembatalan untuk Dev C
  if (targetStatus === EventRequestStatus.cancelled || targetStatus === EventRequestStatus.rejected) {
    eventNotificationService
      .triggerEventNotification({
        type: "event_cancelled",
        eventRequestId,
        picName: eventRequest.contactName,
        picPhone: eventRequest.contactPhone,
        picEmail: eventRequest.contactEmail,
        eventDate: eventRequest.eventDate,
      })
      .catch((err) => console.error("[event-admin] Notification trigger failed:", err));
  }

  return { id: updated.id, status: updated.status };
}
