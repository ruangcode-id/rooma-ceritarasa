import { z } from "zod";

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

const dateOnlyString = z
  .string()
  .regex(dateOnlyRegex, "Invalid date format (YYYY-MM-DD)");

export const createBlockedDateSchema = z
  .object({
    date: dateOnlyString.optional(),
    dateStart: dateOnlyString.optional(),
    dateEnd: dateOnlyString.optional(),
    reason: z.string().max(200, "Reason max 200 characters").optional().nullable(),
  })
  .refine(
    (data) => {
      const hasSingle = !!data.date;
      const hasRange = !!data.dateStart || !!data.dateEnd;

      if (hasSingle && hasRange) return false;
      if (!hasSingle && !hasRange) return false;
      if (hasSingle) return true;
      return !!data.dateStart && !!data.dateEnd;
    },
    {
      message: "Provide either 'date' or ('dateStart' and 'dateEnd')",
    }
  );

export const checkBlockedDateSchema = z.object({
  date: dateOnlyString,
});

export const listPublicBlockedDatesSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1970).max(9999),
});
