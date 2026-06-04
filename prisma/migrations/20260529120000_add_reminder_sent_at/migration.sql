-- AlterTable: reminder tracking for cron jobs (Dev C)
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMP(3);
ALTER TABLE "event_requests" ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMP(3);
