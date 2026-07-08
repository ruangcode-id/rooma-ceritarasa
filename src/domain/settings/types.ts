export type SocialLinks = Record<string, string>;

/** Keys 0–6 = Minggu–Sabtu (selaras JavaScript getUTCDay). */
export type OperatingHoursDay = {
  open?: string;
  close?: string;
  closed?: boolean;
};

export type OperatingHours = Record<string, OperatingHoursDay>;

export type MessageTemplates = Record<string, string>;

export interface RestaurantSettingEntity {
  restaurantId: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsappNumber: string | null;
  logoUrl: string | null;
  tagline: string | null;
  socialLinks: SocialLinks | null;
  operatingHours: OperatingHours | null;
  maxGuestsPerDay: number | null;
  depositPercent: number | null;
  cancellationPolicy: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  confirmationTemplate: string | null;
  reminderTemplate: string | null;
  waTemplates: MessageTemplates | null;
  emailTemplates: MessageTemplates | null;
  updatedAt: string;
  updatedBy: string | null;
}
