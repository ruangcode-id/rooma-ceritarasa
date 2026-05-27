import { z } from "zod";

export const vipTierSchema = z.enum(["SILVER", "GOLD", "PLATINUM"]);

export const assignVipCardSchema = z.object({
  guestId: z.string().uuid("guestId harus berupa UUID yang valid."),
  tier: vipTierSchema.optional().default("SILVER"),
  benefits: z
    .union([z.string().trim().max(5000), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type AssignVipCardInput = z.infer<typeof assignVipCardSchema>;

export const adminVipListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  tier: vipTierSchema.optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === "true",
    ),
});

export type AdminVipListQuery = z.infer<typeof adminVipListQuerySchema>;
