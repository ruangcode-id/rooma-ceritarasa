ALTER TABLE "event_requests"
ADD COLUMN "contact_name" VARCHAR(100),
ADD COLUMN "contact_phone" VARCHAR(20),
ADD COLUMN "contact_email" VARCHAR(150);

UPDATE "event_requests" AS er
SET
  "contact_name" = g."name",
  "contact_phone" = g."phone",
  "contact_email" = g."email"
FROM "guests" AS g
WHERE er."guest_id" = g."id";

ALTER TABLE "event_requests"
ALTER COLUMN "contact_name" SET NOT NULL,
ALTER COLUMN "contact_phone" SET NOT NULL;
