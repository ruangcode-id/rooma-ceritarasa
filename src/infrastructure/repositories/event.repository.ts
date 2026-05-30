// Event repository — Prisma data access layer (event_requests, event_offers, event_payments, events)
import { prisma } from "@/infrastructure/database/prisma";
import { EventRequestStatus } from "@/generated/prisma/client";

// ─── Event Request ──────────────────────────────────────────────────────────

export type CreateEventRequestInput = {
  guestId: string;
  eventType?: string | null;
  eventDate: Date;
  partySize?: number | null;
  description?: string | null;
  sessionId?: string | null;
};

/**
 * Buat EventRequest baru dengan status awal 'pending'.
 */
export async function createEventRequest(input: CreateEventRequestInput) {
  return prisma.eventRequest.create({
    data: {
      guestId: input.guestId,
      eventType: input.eventType ?? null,
      eventDate: input.eventDate,
      partySize: input.partySize ?? null,
      description: input.description ?? null,
      sessionId: input.sessionId ?? null,
      status: EventRequestStatus.pending,
    },
    include: {
      guest: {
        select: { id: true, name: true, phone: true, email: true },
      },
    },
  });
}

// ─── Event (Artikel Promosi Publik) ─────────────────────────────────────────

/**
 * Ambil semua artikel event yang sudah dipublish (isPublished: true).
 * Diurutkan terbaru di depan.
 */
export async function findPublishedEvents() {
  return prisma.event.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      eventDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
