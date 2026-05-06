ALTER TABLE "guests"
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "guest_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "guest_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guest_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_guest_notes_guest_created" ON "guest_notes"("guest_id", "created_at");

ALTER TABLE "guest_notes"
ADD CONSTRAINT "guest_notes_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
