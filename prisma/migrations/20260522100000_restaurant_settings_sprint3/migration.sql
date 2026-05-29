-- AlterTable: Sprint 3 settings fields (Dev C)
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "tagline" VARCHAR(255);
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "social_links" JSONB;
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "operating_hours" JSONB;
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "max_guests_per_day" INTEGER;
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "wa_templates" JSONB;
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "email_templates" JSONB;
