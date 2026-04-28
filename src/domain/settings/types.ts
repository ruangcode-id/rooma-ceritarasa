export interface RestaurantSettingEntity {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsappNumber: string | null;
  depositPercent: number | null;
  cancellationPolicy: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  confirmationTemplate: string | null;
  reminderTemplate: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}
