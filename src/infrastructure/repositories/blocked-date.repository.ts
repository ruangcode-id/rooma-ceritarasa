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
	}) => {
		const keys = uniqueDateKeys(args.dates);
		const normalizedDates = keys.map(dateKeyToDate);

		const existing = await prisma.blockedDate.findMany({
			where: { date: { in: normalizedDates } },
			select: { date: true },
		});
		const existingKeys = new Set(existing.map((e) => startOfUTCDate(e.date).toISOString().slice(0, 10)));

		const toCreate = normalizedDates.filter(
			(date) => !existingKeys.has(startOfUTCDate(date).toISOString().slice(0, 10))
		);

		if (toCreate.length > 0) {
			await prisma.blockedDate.createMany({
				data: toCreate.map((date) => ({
					date,
					reason: args.reason,
					createdBy: args.createdBy,
				} satisfies Prisma.BlockedDateCreateManyInput)),
			});
		}

		return prisma.blockedDate.findMany({
			where: { date: { in: normalizedDates } },
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
			where: { date: normalized },
			select: { id: true },
		});
		return !!existing;
	},
};
