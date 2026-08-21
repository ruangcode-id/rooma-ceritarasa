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
        sessionId: null, // Only return fully opened dates
      },
      orderBy: { date: "asc" },
    });
  },

  createSpecialOpenDates: async (args: {
    dates: Date[];
    reason: string | null;
    createdBy: string | null;
    sessionIds?: string[];
  }) => {
    const keys = uniqueDateKeys(args.dates);
    const normalizedDates = keys.map(dateKeyToDate);

    const sessionsToOpen = args.sessionIds && args.sessionIds.length > 0 ? args.sessionIds : [null];

    const existing = await prisma.specialOpenDate.findMany({
      where: { date: { in: normalizedDates }, sessionId: { in: sessionsToOpen } },
      select: { date: true, sessionId: true },
    });
    const existingKeys = new Set(existing.map((e) => `${startOfUTCDate(e.date).toISOString().slice(0, 10)}_${e.sessionId || 'null'}`));

    const toCreate: Prisma.SpecialOpenDateCreateManyInput[] = [];
    for (const date of normalizedDates) {
      for (const sessionId of sessionsToOpen) {
        const key = `${startOfUTCDate(date).toISOString().slice(0, 10)}_${sessionId || 'null'}`;
        if (!existingKeys.has(key)) {
          toCreate.push({
            date,
            reason: args.reason,
            createdBy: args.createdBy,
            sessionId: sessionId,
          });
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.specialOpenDate.createMany({
        data: toCreate,
      });
    }

    return prisma.specialOpenDate.findMany({
      where: { date: { in: normalizedDates }, sessionId: { in: sessionsToOpen } },
      orderBy: { date: "asc" },
    });
  },

  deleteSpecialOpenDate: async (id: string) => {
    return prisma.specialOpenDate.delete({ where: { id } });
  },

  isDateSpecialOpen: async (date: Date): Promise<boolean> => {
    const normalized = startOfUTCDate(date);
    const existing = await prisma.specialOpenDate.findFirst({
      where: { date: normalized, sessionId: null },
      select: { id: true },
    });
    return !!existing;
  },

  getSessionSpecialOpenDates: async (date: Date): Promise<string[]> => {
    const normalized = startOfUTCDate(date);
    const opened = await prisma.specialOpenDate.findMany({
      where: { date: normalized, sessionId: { not: null } },
      select: { sessionId: true },
    });
    return opened.map(o => o.sessionId as string);
  }
};
