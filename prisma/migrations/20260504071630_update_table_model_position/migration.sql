-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "day_of_week" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE';
