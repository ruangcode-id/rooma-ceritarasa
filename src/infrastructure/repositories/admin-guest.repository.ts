import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";

export type GuestSortField = "name" | "totalVisits" | "createdAt";
export type GuestTag = "VIP" | "ALLERGY" | "BIRTHDAY" | "REGULAR" | "BLACKLIST";

export type GuestListRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  birthdate: Date | null;
  isVip: boolean;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  totalVisits: number;
};

export type GuestNoteRow = {
  id: string;
  guestId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GuestStats = {
  totalGuests: number;
  vipGuests: number;
  returningGuests: number;
  totalVisits: number;
};

type GuestNotesPage = {
  rows: GuestNoteRow[];
  total: number;
};

function mapSortField(sortBy: GuestSortField): string {
  switch (sortBy) {
    case "name":
      return "g.name";
    case "totalVisits":
      return "total_visits";
    case "createdAt":
    default:
      return "g.created_at";
  }
}

export async function countActiveGuests(phone?: string, tag?: string, q?: string): Promise<number> {
  return prisma.guest.count({
    where: {
      deletedAt: null,
      ...(phone ? { phone: { contains: phone, mode: "insensitive" as const } } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  });
}

export async function findManyGuestsPaginated(params: {
  page: number;
  limit: number;
  sortBy: GuestSortField;
  sortOrder: "asc" | "desc";
  phone?: string;
  tag?: string;
  q?: string;
}): Promise<GuestListRow[]> {
  const skip = (params.page - 1) * params.limit;
  const orderColumn = mapSortField(params.sortBy);
  const orderDir = params.sortOrder === "asc" ? "ASC" : "DESC";
  const phoneFilter = params.phone
    ? Prisma.sql`AND g.phone ILIKE ${`%${params.phone}%`}`
    : Prisma.empty;
  const tagFilter = params.tag
    ? Prisma.sql`AND ${params.tag} = ANY(g.tags)`
    : Prisma.empty;
  const qFilter = params.q
    ? Prisma.sql`AND (
        g.name ILIKE ${`%${params.q}%`}
        OR g.phone ILIKE ${`%${params.q}%`}
        OR g.email ILIKE ${`%${params.q}%`}
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string;
      birthdate: Date | null;
      is_vip: boolean;
      notes: string | null;
      tags: string[] | null;
      created_at: Date;
      updated_at: Date;
      total_visits: number | bigint;
    }>
  >(Prisma.sql`
    SELECT g.id,
           g.name,
           g.email,
           g.phone,
           g.birthdate,
           g.is_vip,
           g.notes,
           g.tags,
           g.created_at,
           g.updated_at,
           COALESCE(rc.cnt, 0)::int AS total_visits
    FROM guests g
    LEFT JOIN (
      SELECT guest_id, COUNT(*)::int AS cnt
      FROM reservations
      WHERE status = ${ReservationStatus.checked_in}
      GROUP BY guest_id
    ) rc ON rc.guest_id = g.id
    WHERE g.deleted_at IS NULL
    ${phoneFilter}
    ${tagFilter}
    ${qFilter}
    ORDER BY ${Prisma.raw(`${orderColumn} ${orderDir}`)}
    LIMIT ${params.limit}
    OFFSET ${skip}
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    birthdate: r.birthdate,
    isVip: r.is_vip,
    notes: r.notes,
    tags: r.tags ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    totalVisits: Number(r.total_visits),
  }));
}

export async function findActiveGuestByPhone(phone: string) {
  return prisma.guest.findFirst({
    where: { phone, deletedAt: null },
    select: { id: true },
  });
}

export async function findGuestByIdActive(id: string) {
  return prisma.guest.findFirst({
    where: { id, deletedAt: null },
    include: {
      reservations: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          partySize: true,
          status: true,
          sessionId: true,
          createdAt: true,
        },
      },
      guestNotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          guestId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function countCompletedVisitsForGuest(guestId: string): Promise<number> {
  return prisma.reservation.count({
    where: {
      guestId,
      status: ReservationStatus.checked_in,
    },
  });
}

export async function getGuestStats(): Promise<GuestStats> {
  const rows = await prisma.$queryRaw<
    Array<{
      total_guests: number | bigint;
      vip_guests: number | bigint;
      returning_guests: number | bigint;
      total_visits: number | bigint;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*)::int AS total_guests,
      COUNT(*) FILTER (
        WHERE g.is_vip = true OR ${"VIP"} = ANY(g.tags)
      )::int AS vip_guests,
      COUNT(*) FILTER (WHERE COALESCE(v.visit_count, 0) > 1)::int AS returning_guests,
      COALESCE(SUM(v.visit_count), 0)::int AS total_visits
    FROM guests g
    LEFT JOIN (
      SELECT guest_id, COUNT(*)::int AS visit_count
      FROM reservations
      WHERE status = ${ReservationStatus.checked_in}
      GROUP BY guest_id
    ) v ON v.guest_id = g.id
    WHERE g.deleted_at IS NULL
  `);
  const stats = rows[0];

  return {
    totalGuests: Number(stats?.total_guests ?? 0),
    vipGuests: Number(stats?.vip_guests ?? 0),
    returningGuests: Number(stats?.returning_guests ?? 0),
    totalVisits: Number(stats?.total_visits ?? 0),
  };
}

export async function createGuest(data: {
  name: string;
  phone: string;
  email?: string | null;
  birthdate?: Date | null;
  isVip: boolean;
  notes?: string | null;
  tags?: string[];
}) {
  return prisma.guest.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email ?? undefined,
      birthdate: data.birthdate ?? undefined,
      isVip: data.isVip,
      notes: data.notes ?? undefined,
      tags: data.tags ?? [],
    },
  });
}

export async function updateGuest(
  id: string,
  data: Prisma.GuestUpdateInput,
): Promise<{ id: string } | null> {
  const existing = await prisma.guest.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.guest.update({
    where: { id },
    data,
    select: { id: true },
  });
}

export async function softDeleteGuest(id: string): Promise<boolean> {
  const result = await prisma.guest.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

async function syncGuestSummaryNote(guestId: string): Promise<void> {
  const latest = await prisma.guestNote.findFirst({
    where: { guestId },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });
  await prisma.guest.update({
    where: { id: guestId },
    data: { notes: latest?.content ?? null },
  });
}

export async function findGuestNotesByGuestId(
  guestId: string,
  page: number,
  limit: number,
): Promise<GuestNotesPage> {
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    prisma.guestNote.findMany({
      where: { guestId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        guestId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.guestNote.count({ where: { guestId } }),
  ]);
  return { rows, total };
}

export async function createGuestNote(guestId: string, content: string): Promise<GuestNoteRow> {
  const note = await prisma.guestNote.create({
    data: { guestId, content },
    select: {
      id: true,
      guestId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  await syncGuestSummaryNote(guestId);
  return note;
}

export async function updateGuestNote(
  guestId: string,
  noteId: string,
  content: string,
): Promise<GuestNoteRow | null> {
  const existing = await prisma.guestNote.findFirst({
    where: { id: noteId, guestId },
    select: { id: true },
  });
  if (!existing) return null;
  const note = await prisma.guestNote.update({
    where: { id: noteId },
    data: { content },
    select: {
      id: true,
      guestId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  await syncGuestSummaryNote(guestId);
  return note;
}

export async function deleteGuestNote(guestId: string, noteId: string): Promise<boolean> {
  const result = await prisma.guestNote.deleteMany({
    where: { id: noteId, guestId },
  });
  if (result.count > 0) {
    await syncGuestSummaryNote(guestId);
  }
  return result.count > 0;
}

export async function updateGuestTags(
  guestId: string,
  tags: string[],
): Promise<{ id: string; tags: string[]; isVip: boolean } | null> {
  const existing = await prisma.guest.findFirst({
    where: { id: guestId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.guest.update({
    where: { id: guestId },
    data: {
      tags,
      isVip: tags.includes("VIP"),
    },
    select: { id: true, tags: true, isVip: true },
  });
}
