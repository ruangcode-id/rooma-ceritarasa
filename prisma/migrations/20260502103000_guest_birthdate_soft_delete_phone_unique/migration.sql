-- AlterTable
ALTER TABLE "guests" ADD COLUMN "birthdate" DATE,
ADD COLUMN "deleted_at" TIMESTAMP(3);

-- DropIndex
DROP INDEX IF EXISTS "idx_guests_phone";

-- CreateIndex
CREATE UNIQUE INDEX "guests_phone_key" ON "guests"("phone");
