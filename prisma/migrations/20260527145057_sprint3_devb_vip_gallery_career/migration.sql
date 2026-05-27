/*
  Warnings:

  - You are about to drop the column `card_image_url` on the `vip_cards` table. All the data in the column will be lost.
  - You are about to drop the column `card_number` on the `vip_cards` table. All the data in the column will be lost.
  - You are about to drop the column `expired_at` on the `vip_cards` table. All the data in the column will be lost.
  - You are about to drop the column `issued_by` on the `vip_cards` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[guest_id]` on the table `vip_cards` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token]` on the table `vip_cards` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token` to the `vip_cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `vip_cards` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VipTier" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "CareerApplicationStatus" AS ENUM ('NEW', 'REVIEWED', 'ACCEPTED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "vip_cards" DROP CONSTRAINT "vip_cards_guest_id_fkey";

-- DropForeignKey
ALTER TABLE "vip_cards" DROP CONSTRAINT "vip_cards_issued_by_fkey";

-- DropIndex
DROP INDEX "vip_cards_card_number_key";

-- AlterTable
ALTER TABLE "vip_cards" DROP COLUMN "card_image_url",
DROP COLUMN "card_number",
DROP COLUMN "expired_at",
DROP COLUMN "issued_by",
ADD COLUMN     "benefits" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tier" "VipTier" NOT NULL DEFAULT 'SILVER',
ADD COLUMN     "token" VARCHAR(100) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "qr_code_url" DROP NOT NULL;

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "image_url" TEXT NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_jobs" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_applications" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "applicant_name" VARCHAR(100) NOT NULL,
    "applicant_email" VARCHAR(150) NOT NULL,
    "applicant_phone" VARCHAR(20) NOT NULL,
    "cover_letter" TEXT,
    "cv_url" TEXT NOT NULL,
    "cv_public_id" VARCHAR(255),
    "status" "CareerApplicationStatus" NOT NULL DEFAULT 'NEW',
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vip_cards_guest_id_key" ON "vip_cards"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "vip_cards_token_key" ON "vip_cards"("token");

-- AddForeignKey
ALTER TABLE "vip_cards" ADD CONSTRAINT "vip_cards_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_applications" ADD CONSTRAINT "career_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "career_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
