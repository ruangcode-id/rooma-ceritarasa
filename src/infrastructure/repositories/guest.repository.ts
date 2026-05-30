// Guest repository — Prisma data access layer
import { prisma } from "@/infrastructure/database/prisma";
import { normalizeIndonesianPhone } from "@/lib/phone";

export type CreateGuestInput = {
  name: string;
  phone: string;
  email?: string | null;
};

/**
 * Cari guest berdasarkan nomor HP (setelah dinormalisasi).
 * Hanya mencari guest yang belum di-soft-delete (deletedAt: null).
 */
export async function findGuestByPhone(phone: string) {
  const normalized = normalizeIndonesianPhone(phone);
  return prisma.guest.findFirst({
    where: {
      phone: normalized,
      deletedAt: null,
    },
  });
}

/**
 * Buat guest baru.
 * Phone disimpan dalam format normalisasi Indonesia (08xx).
 */
export async function createGuest(input: CreateGuestInput) {
  return prisma.guest.create({
    data: {
      name: input.name.trim(),
      phone: normalizeIndonesianPhone(input.phone),
      email: input.email ?? null,
      isVip: false,
    },
  });
}

/**
 * Cari guest berdasarkan nomor HP; buat baru jika belum ada.
 * Digunakan dalam alur EventRequest dan Reservation.
 */
export async function findOrCreateGuest(input: CreateGuestInput) {
  const existing = await findGuestByPhone(input.phone);
  if (existing) return existing;
  return createGuest(input);
}
