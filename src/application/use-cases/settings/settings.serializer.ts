import type { RestaurantSetting } from "@/generated/prisma/client";
import type {
  MessageTemplates,
  OperatingHours,
  RestaurantSettingEntity,
  SocialLinks,
} from "@/domain/settings/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function decimalToNumber(value: { toNumber?: () => number } | null): number | null {
  if (value == null) return null;
  if (typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
}

export function serializeRestaurantSetting(
  row: RestaurantSetting,
): RestaurantSettingEntity {
  return {
    restaurantId: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    whatsappNumber: row.whatsappNumber,
    logoUrl: row.logoUrl,
    tagline: row.tagline,
    socialLinks: asRecord(row.socialLinks) as SocialLinks | null,
    operatingHours: asRecord(row.operatingHours) as OperatingHours | null,
    maxGuestsPerDay: row.maxGuestsPerDay,
    depositPercent: decimalToNumber(row.depositPercent),
    cancellationPolicy: row.cancellationPolicy,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    confirmationTemplate: row.confirmationTemplate,
    reminderTemplate: row.reminderTemplate,
    waTemplates: asRecord(row.waTemplates) as MessageTemplates | null,
    emailTemplates: asRecord(row.emailTemplates) as MessageTemplates | null,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}
