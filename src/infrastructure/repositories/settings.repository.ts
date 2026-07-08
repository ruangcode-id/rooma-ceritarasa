import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_SETTINGS: Prisma.RestaurantSettingCreateInput = {
  name: "Rooma Cerita Rasa",
};

export const SettingsRepository = {
  async findSingleton() {
    return prisma.restaurantSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });
  },

  async getOrCreateSingleton() {
    const existing = await this.findSingleton();
    if (existing) return existing;

    return prisma.restaurantSetting.create({
      data: DEFAULT_SETTINGS,
    });
  },

  async updateSingleton(
    id: string,
    data: Prisma.RestaurantSettingUpdateInput,
  ) {
    return prisma.restaurantSetting.update({
      where: { id },
      data,
    });
  },
};
