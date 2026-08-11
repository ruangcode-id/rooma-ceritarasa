// Special open date repository — Prisma data access layer

import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@/generated/prisma/client";

const startOfUTCDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const uniqueDateKeys = (dates: Date[]) => {
  const set = new Set<string>();
  for (const date of dates) {
    set.add(startOfUTCDate(date).toISOString().slice(0, 10));
  }
  return [...set];
};

const dateKeyToDate = (key: string) => new Date(`${key}T00:00:00.000Z`);

export const SpecialOpenDateRepository = {
  getSpecialOpenDates: async () => {
    return prisma.specialOpenDate.findMany({
      orderBy: { date: "asc" },
    });
  },

  getSpecialOpenDateById: async (id: string) => {
    return prisma.specialOpenDate.findUnique({ where: { id } });
  },

  getSpecialOpenDatesInRange: async (start: Date, end: Date) => {
    return prisma.specialOpenDate.findMany({
      where: {
        date: {
          gte: startOfUTCDate(start),
          lte: startOfUTCDate(end),
        },
      },
      orderBy: { date: "asc" },
    });
  },

  createSpecialOpenDates: async (args: {
    dates: Date[];
    reason: string | null;
    createdBy: string | null;
  }) => {
    const keys = uniqueDateKeys(args.dates);
    const normalizedDates = keys.map(dateKeyToDate);

    const existing = await prisma.specialOpenDate.findMany({
      where: { date: { in: normalizedDates } },
      select: { date: true },
    });
    const existingKeys = new Set(existing.map((e) => startOfUTCDate(e.date).toISOString().slice(0, 10)));

    const toCreate = normalizedDates.filter(
      (date) => !existingKeys.has(startOfUTCDate(date).toISOString().slice(0, 10))
    );

    if (toCreate.length > 0) {
      await prisma.specialOpenDate.createMany({
        data: toCreate.map((date) => ({
          date,
          reason: args.reason,
          createdBy: args.createdBy,
        } satisfies Prisma.SpecialOpenDateCreateManyInput)),
      });
    }

    return prisma.specialOpenDate.findMany({
      where: { date: { in: normalizedDates } },
      orderBy: { date: "asc" },
    });
  },

  deleteSpecialOpenDate: async (id: string) => {
    return prisma.specialOpenDate.delete({ where: { id } });
  },

  isDateSpecialOpen: async (date: Date): Promise<boolean> => {
    const normalized = startOfUTCDate(date);
    const existing = await prisma.specialOpenDate.findFirst({
      where: { date: normalized },
      select: { id: true },
    });
    return !!existing;
  },
};
