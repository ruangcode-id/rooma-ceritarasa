import { SettingsRepository } from "@/infrastructure/repositories/settings.repository";
import {
  messageTemplatesSchema,
  updateRestaurantSettingsSchema,
} from "@/validations/settings.validation";
import { serializeRestaurantSetting } from "./settings.serializer";
import { Prisma } from "@/generated/prisma/client";

export const SettingsUseCase = {
  async getSettingsAction() {
    const row = await SettingsRepository.getOrCreateSingleton();
    return serializeRestaurantSetting(row);
  },

  async updateSettingsAction(userId: string, body: unknown) {
    const parsed = updateRestaurantSettingsSchema.parse(body);
    const current = await SettingsRepository.getOrCreateSingleton();

    const data: Prisma.RestaurantSettingUpdateInput = {
      updater: { connect: { id: userId } },
    };

    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.address !== undefined) data.address = parsed.address;
    if (parsed.phone !== undefined) data.phone = parsed.phone;
    if (parsed.email !== undefined) data.email = parsed.email;
    if (parsed.whatsappNumber !== undefined) data.whatsappNumber = parsed.whatsappNumber;
    if (parsed.logoUrl !== undefined) data.logoUrl = parsed.logoUrl;
    if (parsed.tagline !== undefined) data.tagline = parsed.tagline;
    if (parsed.socialLinks !== undefined) {
      data.socialLinks =
        parsed.socialLinks === null
          ? Prisma.JsonNull
          : (parsed.socialLinks as Prisma.InputJsonValue);
    }
    if (parsed.operatingHours !== undefined) {
      data.operatingHours =
        parsed.operatingHours === null
          ? Prisma.JsonNull
          : (parsed.operatingHours as Prisma.InputJsonValue);
    }
    if (parsed.maxGuestsPerDay !== undefined) data.maxGuestsPerDay = parsed.maxGuestsPerDay;
    if (parsed.depositPercent !== undefined) data.depositPercent = parsed.depositPercent;
    if (parsed.cancellationPolicy !== undefined) {
      data.cancellationPolicy = parsed.cancellationPolicy;
    }
    if (parsed.seoTitle !== undefined) data.seoTitle = parsed.seoTitle;
    if (parsed.seoDescription !== undefined) data.seoDescription = parsed.seoDescription;
    if (parsed.confirmationTemplate !== undefined) {
      data.confirmationTemplate = parsed.confirmationTemplate;
    }
    if (parsed.reminderTemplate !== undefined) {
      data.reminderTemplate = parsed.reminderTemplate;
    }

    const updated = await SettingsRepository.updateSingleton(current.id, data);
    return serializeRestaurantSetting(updated);
  },

  async getWaTemplatesAction() {
    const row = await SettingsRepository.getOrCreateSingleton();
    const templates = row.waTemplates;
    if (templates && typeof templates === "object" && !Array.isArray(templates)) {
      return templates as Record<string, string>;
    }
    return {};
  },

  async updateWaTemplatesAction(userId: string, body: unknown) {
    const parsed = messageTemplatesSchema.parse(body);
    const current = await SettingsRepository.getOrCreateSingleton();
    const updated = await SettingsRepository.updateSingleton(current.id, {
      waTemplates: parsed as Prisma.InputJsonValue,
      updater: { connect: { id: userId } },
    });
    const templates = updated.waTemplates;
    if (templates && typeof templates === "object" && !Array.isArray(templates)) {
      return templates as Record<string, string>;
    }
    return parsed;
  },

  async getEmailTemplatesAction() {
    const row = await SettingsRepository.getOrCreateSingleton();
    const templates = row.emailTemplates;
    if (templates && typeof templates === "object" && !Array.isArray(templates)) {
      return templates as Record<string, string>;
    }
    return {};
  },

  async updateEmailTemplatesAction(userId: string, body: unknown) {
    const parsed = messageTemplatesSchema.parse(body);
    const current = await SettingsRepository.getOrCreateSingleton();
    const updated = await SettingsRepository.updateSingleton(current.id, {
      emailTemplates: parsed as Prisma.InputJsonValue,
      updater: { connect: { id: userId } },
    });
    const templates = updated.emailTemplates;
    if (templates && typeof templates === "object" && !Array.isArray(templates)) {
      return templates as Record<string, string>;
    }
    return parsed;
  },
};
