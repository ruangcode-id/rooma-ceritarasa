-- Keep soft-delete behavior while allowing re-registration with same phone.
-- Old global unique index blocks inserts even when previous guest is deleted.
DROP INDEX IF EXISTS "guests_phone_key";

-- One phone number may exist only among active guests.
CREATE UNIQUE INDEX "guests_phone_active_key"
ON "guests"("phone")
WHERE "deleted_at" IS NULL;
