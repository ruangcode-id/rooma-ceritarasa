// Blocked date repository — Prisma data access layer

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

export const BlockedDateRepository = {
	getBlockedDates: async () => {
		return prisma.blockedDate.findMany({
			orderBy: { date: "asc" },
		});
	},

	getBlockedDateById: async (id: string) => {
		return prisma.blockedDate.findUnique({ where: { id } });
	},

	getBlockedDatesInRange: async (start: Date, end: Date) => {
		return prisma.blockedDate.findMany({
			where: {
				date: {
					gte: startOfUTCDate(start),
					lte: startOfUTCDate(end),
				},
				sessionId: null, // Only return fully blocked dates
			},
			orderBy: { date: "asc" },
		});
	},

	hasConfirmedReservationsOnDates: async (dates: Date[]) => {
		if (dates.length === 0) return false;
		const keys = uniqueDateKeys(dates);
		const normalizedDates = keys.map(dateKeyToDate);

		const count = await prisma.reservation.count({
			where: {
				status: "confirmed",
				date: { in: normalizedDates },
			},
		});

		return count > 0;
	},

	createBlockedDates: async (args: {
		dates: Date[];
		reason: string | null;
		createdBy: string | null;
		sessionIds?: string[];
	}) => {
		const keys = uniqueDateKeys(args.dates);
		const normalizedDates = keys.map(dateKeyToDate);

        const sessionsToBlock = args.sessionIds && args.sessionIds.length > 0 ? args.sessionIds : [null];

		const existing = await prisma.blockedDate.findMany({
			where: { date: { in: normalizedDates }, sessionId: { in: sessionsToBlock } },
			select: { date: true, sessionId: true },
		});
		const existingKeys = new Set(existing.map((e) => `${startOfUTCDate(e.date).toISOString().slice(0, 10)}_${e.sessionId || 'null'}`));

		const toCreate: Prisma.BlockedDateCreateManyInput[] = [];
        for (const date of normalizedDates) {
            for (const sessionId of sessionsToBlock) {
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
			await prisma.blockedDate.createMany({
				data: toCreate,
			});
		}

		return prisma.blockedDate.findMany({
			where: { date: { in: normalizedDates }, sessionId: { in: sessionsToBlock } },
			orderBy: { date: "asc" },
		});
	},

	deleteBlockedDate: async (id: string) => {
		return prisma.blockedDate.delete({ where: { id } });
	},

	/**
	 * Helper for Sprint 2
	 */
	isDateBlocked: async (date: Date): Promise<boolean> => {
		const normalized = startOfUTCDate(date);
		const existing = await prisma.blockedDate.findFirst({
			where: { date: normalized, sessionId: null },
			select: { id: true },
		});
		return !!existing;
	},

	getBlockedSessionsOnDate: async (date: Date): Promise<string[]> => {
		const normalized = startOfUTCDate(date);
		const blocked = await prisma.blockedDate.findMany({
			where: { date: normalized, sessionId: { not: null } },
			select: { sessionId: true },
		});
		return blocked.map(b => b.sessionId as string);
	}
};
