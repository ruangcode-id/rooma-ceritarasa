-- B6: QR check-in dan token pembatalan harus terpisah.
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "check_in_token" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "check_in_token_expires_at" TIMESTAMP(3);

-- Backfill token QR check-in untuk reservasi lama.
UPDATE "reservations"
SET "check_in_token" = substr(
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', ''),
  1,
  48
)
WHERE "check_in_token" IS NULL;

-- Expiry QR = tanggal reservasi + jam mulai sesi + grace check-in 15 menit.
UPDATE "reservations" AS r
SET "check_in_token_expires_at" =
  (r."date" + s."start_time" - interval '7 hours' + interval '15 minutes')
FROM "restaurant_sessions" AS s
WHERE r."session_id" = s."id"
  AND r."check_in_token_expires_at" IS NULL;

-- Rotasi cancel token aktif agar QR lama yang berisi cancel_token tidak bisa dipakai membatalkan.
UPDATE "reservations"
SET "cancel_token" = substr(
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', ''),
  1,
  32
)
WHERE "status" IN ('pending', 'confirmed')
  AND "cancel_token" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "reservations_check_in_token_key"
ON "reservations"("check_in_token");
