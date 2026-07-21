-- Token rahasia khusus untuk akses pembayaran publik.
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "payment_token" VARCHAR(100);

-- Backfill reservasi lama agar tidak ada record aktif tanpa token pembayaran.
UPDATE "reservations"
SET "payment_token" = substr(
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', ''),
  1,
  48
)
WHERE "payment_token" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "reservations_payment_token_key"
ON "reservations"("payment_token");
