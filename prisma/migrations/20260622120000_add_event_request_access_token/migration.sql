ALTER TABLE "event_requests"
ADD COLUMN "access_token" VARCHAR(100);

UPDATE "event_requests"
SET "access_token" =
  REPLACE(gen_random_uuid()::text, '-', '') ||
  REPLACE(gen_random_uuid()::text, '-', '')
WHERE "access_token" IS NULL;

ALTER TABLE "event_requests"
ALTER COLUMN "access_token" SET NOT NULL;

CREATE UNIQUE INDEX "event_requests_access_token_key"
ON "event_requests"("access_token");
