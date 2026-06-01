import { prisma } from "@/infrastructure/database/prisma";
import type { CreateEventContentInput, UpdateEventContentInput } from "./event-content.validation";

// ─── List All (Admin view, includes unpublished) ──────────────────────────────

export async function listAllEvents(query: {
  page?: string | null;
  limit?: string | null;
}) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "10", 10) || 10));
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    prisma.event.count(),
    prisma.event.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: rows,
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

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createEventContent(input: CreateEventContentInput, createdBy: string) {
  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
      isPublished: input.isPublished ?? false,
      createdBy,
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateEventContent(id: string, input: UpdateEventContentInput) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event tidak ditemukan.");

  return prisma.event.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.eventDate !== undefined && { eventDate: new Date(input.eventDate) }),
      ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteEventContent(id: string) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event tidak ditemukan.");

  await prisma.event.delete({ where: { id } });
  return { id };
}
