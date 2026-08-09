-- Migration: VIP arrival logs & simplified VIP membership

-- AlterTable: Drop tier column from vip_cards
ALTER TABLE "vip_cards" DROP COLUMN IF EXISTS "tier";

-- DropEnum: Remove VipTier enum
DROP TYPE IF EXISTS "VipTier";

-- CreateTable: Add vip_arrival_logs table with UUID types matching guests.id
CREATE TABLE IF NOT EXISTS "vip_arrival_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guest_id" UUID NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_in_by" UUID,
    "notes" TEXT,

    CONSTRAINT "vip_arrival_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Add index on guest_id and checked_in_at
CREATE INDEX IF NOT EXISTS "idx_vip_arrival_logs_guest_date" ON "vip_arrival_logs"("guest_id", "checked_in_at");

-- AddForeignKey: Foreign key to guests table (UUID -> UUID)
ALTER TABLE "vip_arrival_logs" DROP CONSTRAINT IF EXISTS "vip_arrival_logs_guest_id_fkey";
ALTER TABLE "vip_arrival_logs" ADD CONSTRAINT "vip_arrival_logs_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
