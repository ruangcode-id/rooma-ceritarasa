-- At most one active reservation payment may exist at a time.
-- Failed/refunded rows remain for audit and retry history.
CREATE UNIQUE INDEX "payments_one_active_per_reservation_key"
ON "payments"("reservation_id")
WHERE "status" IN ('pending', 'paid');
