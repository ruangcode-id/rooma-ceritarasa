// Event repository — Prisma data access layer (events)
import { prisma } from "@/infrastructure/database/prisma";

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
