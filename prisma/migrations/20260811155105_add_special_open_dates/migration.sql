-- CreateTable: special_open_dates
-- Stores specific Monday dates that are explicitly opened for reservations
-- by Admin/Owner, overriding the default Monday-closed rule.

CREATE TABLE "special_open_dates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "reason" VARCHAR(200),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "special_open_dates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "special_open_dates" ADD CONSTRAINT "special_open_dates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
