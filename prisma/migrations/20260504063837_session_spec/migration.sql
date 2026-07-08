-- Session spec alignment
-- - label      -> name
-- - capacity   -> max_capacity
-- - add day_of_week (0=Sun .. 6=Sat)

ALTER TABLE "sessions" RENAME COLUMN "label" TO "name";
ALTER TABLE "sessions" RENAME COLUMN "capacity" TO "max_capacity";

ALTER TABLE "sessions"
  ADD COLUMN "day_of_week" INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6];
