import { requireRole } from "@/lib/auth";
import { BlockedDateRepository } from "@/infrastructure/repositories/blocked-date.repository";
import {
  checkBlockedDateSchema,
  createBlockedDateSchema,
  listPublicBlockedDatesSchema,
} from "@/validations/blocked-date.validation";

const parseDateOnlyUTC = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  // Guards against invalid calendar dates like 2026-02-30
  if (date.toISOString().slice(0, 10) !== dateStr) {
    throw new Error("Invalid date");
  }
  return date;
};

const toISODateOnly = (date: Date) => date.toISOString().slice(0, 10);

const startOfUTCDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const getDatesInRangeInclusive = (start: Date, end: Date) => {
  const dates: Date[] = [];
  let current = startOfUTCDate(start);
  const endDay = startOfUTCDate(end);

  while (current.getTime() <= endDay.getTime()) {
    dates.push(current);
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
};

export const BlockedDateUseCase = {
  /**
   * Admin/Owner: List all blocked dates
   */
  getBlockedDatesAction: async () => {
    await requireRole(["admin", "owner"]);
    return BlockedDateRepository.getBlockedDates();
  },

  /**
   * Admin/Owner: Create blocked date(s) from a single date or a date range
   */
  createBlockedDatesAction: async (data: unknown) => {
    const user = await requireRole(["admin", "owner"]);

    const parsed = createBlockedDateSchema.parse(data);

    let datesToBlock: Date[] = [];
    if (parsed.date) {
      datesToBlock = [parseDateOnlyUTC(parsed.date)];
    } else {
      const start = parseDateOnlyUTC(parsed.dateStart!);
      const end = parseDateOnlyUTC(parsed.dateEnd!);

      if (start.getTime() > end.getTime()) {
        throw new Error("dateStart must be on or before dateEnd");
      }

      datesToBlock = getDatesInRangeInclusive(start, end);
    }

    const hasConfirmed = await BlockedDateRepository.hasConfirmedReservationsOnDates(datesToBlock);
    if (hasConfirmed) {
      throw new Error("Cannot block date(s) that already have confirmed reservations");
    }

    // Avoid duplicates (if any) by checking existing first
    const created = await BlockedDateRepository.createBlockedDates({
      dates: datesToBlock,
      reason: parsed.reason ?? null,
      createdBy: user.id,
    });

    return created;
  },

  /**
   * Admin/Owner: Delete a blocked date by id
   */
  deleteBlockedDateAction: async (id: string) => {
    await requireRole(["admin", "owner"]);

    const existing = await BlockedDateRepository.getBlockedDateById(id);
    if (!existing) throw new Error("Blocked date not found");

    await BlockedDateRepository.deleteBlockedDate(id);
    return { message: "Blocked date deleted" };
  },

  /**
   * Admin/Owner: Check if a date is blocked
   */
  checkBlockedDateAction: async (dateStr: string) => {
    await requireRole(["admin", "owner"]);

    const parsed = checkBlockedDateSchema.parse({ date: dateStr });
    const date = parseDateOnlyUTC(parsed.date);

    const blocked = await BlockedDateRepository.isDateBlocked(date);
    return { date: toISODateOnly(date), blocked };
  },

  /**
   * Public: list blocked dates for a month/year (returns dates only, no reason)
   */
  getPublicBlockedDatesAction: async (args: { month: unknown; year: unknown }) => {
    const parsed = listPublicBlockedDatesSchema.parse(args);

    const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
    const end = new Date(Date.UTC(parsed.year, parsed.month, 0));

    const blockedDates = await BlockedDateRepository.getBlockedDatesInRange(start, end);
    return blockedDates.map((b) => toISODateOnly(startOfUTCDate(b.date)));
  },
};
