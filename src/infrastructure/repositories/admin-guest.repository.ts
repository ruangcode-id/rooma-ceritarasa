import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";
import { normalizeIndonesianPhone } from "@/lib/phone";

export type GuestSortField = "name" | "totalVisits" | "createdAt";

export type GuestListRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  birthdate: Date | null;
  isVip: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  totalVisits: number;
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

export async function countActiveGuests(): Promise<number> {
  return prisma.guest.count({
    where: { deletedAt: null },
  });
}

export async function findManyGuestsPaginated(params: {
  page: number;
  limit: number;
  sortBy: GuestSortField;
  sortOrder: "asc" | "desc";
}): Promise<GuestListRow[]> {
  const skip = (params.page - 1) * params.limit;
  const orderColumn = mapSortField(params.sortBy);
  const orderDir = params.sortOrder === "asc" ? "ASC" : "DESC";

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string;
      birthdate: Date | null;
      is_vip: boolean;
      notes: string | null;
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
           g.created_at,
           g.updated_at,
           COALESCE(rc.cnt, 0)::int AS total_visits
    FROM guests g
    LEFT JOIN (
      SELECT guest_id, COUNT(*)::int AS cnt
      FROM reservations
      WHERE status = ${ReservationStatus.confirmed}
      GROUP BY guest_id
    ) rc ON rc.guest_id = g.id
    WHERE g.deleted_at IS NULL
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
    },
  });
}

export async function countConfirmedVisitsForGuest(guestId: string): Promise<number> {
  return prisma.reservation.count({
    where: {
      guestId,
      status: ReservationStatus.confirmed,
    },
  });
}

export async function createGuest(data: {
  name: string;
  phone: string;
  email?: string | null;
  birthdate?: Date | null;
  isVip: boolean;
  notes?: string | null;
}) {
  return prisma.guest.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email ?? undefined,
      birthdate: data.birthdate ?? undefined,
      isVip: data.isVip,
      notes: data.notes ?? undefined,
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
  try {
    return await prisma.guest.update({
      where: { id },
      data,
      select: { id: true },
    });
  } catch {
    return null;
  }
}

export async function softDeleteGuest(id: string): Promise<boolean> {
  const result = await prisma.guest.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

export async function searchGuests(query: string): Promise<GuestListRow[]> {
  const normalizedQuery = normalizeIndonesianPhone(query);

  const isPhoneSearch = /^\d+$/.test(normalizedQuery);

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string;
      birthdate: Date | null;
      is_vip: boolean;
      notes: string | null;
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
           g.created_at,
           g.updated_at,
           COALESCE(rc.cnt, 0)::int AS total_visits
    FROM guests g
    LEFT JOIN (
      SELECT guest_id, COUNT(*)::int AS cnt
      FROM reservations
      WHERE status = ${ReservationStatus.confirmed}
      GROUP BY guest_id
    ) rc ON rc.guest_id = g.id
    WHERE g.deleted_at IS NULL
      AND (
        ${isPhoneSearch ? Prisma.sql`REPLACE(REPLACE(REPLACE(g.phone, '+62', ''), '0', ''), '-', '') LIKE ${"%" + normalizedQuery.replace(/\D/g, "") + "%"}` : Prisma.sql`FALSE`}
        OR
        ${!isPhoneSearch ? Prisma.sql`LOWER(g.name) LIKE ${"%" + query.toLowerCase() + "%"}` : Prisma.sql`FALSE`}
      )
    ORDER BY total_visits DESC
    LIMIT 10
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    birthdate: r.birthdate,
    isVip: r.is_vip,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    totalVisits: Number(r.total_visits),
  }));
}
