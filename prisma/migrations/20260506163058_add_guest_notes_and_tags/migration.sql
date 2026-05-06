/*
  Warnings:

  - You are about to drop the column `notes` on the `guests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "guests" DROP COLUMN "notes",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "guest_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guest_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guest_notes" ADD CONSTRAINT "guest_notes_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
