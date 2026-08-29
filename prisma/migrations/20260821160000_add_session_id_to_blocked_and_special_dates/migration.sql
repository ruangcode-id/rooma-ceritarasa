-- AlterTable
ALTER TABLE "blocked_dates" ADD COLUMN "session_id" UUID;

-- AlterTable
ALTER TABLE "special_open_dates" ADD COLUMN "session_id" UUID;

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "restaurant_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_open_dates" ADD CONSTRAINT "special_open_dates_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "restaurant_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
