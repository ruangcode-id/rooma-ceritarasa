-- ============================================================
-- Table Capacity Update — Flexible Tables
-- Rooma Ceritarasa Restaurant
--
-- Context:
-- Table 5, 8, and 10 are physically expandable — staff can
-- add extra chairs. This script updates their capacity to
-- the true maximum they can accommodate.
--
-- Before running: verify table numbers match current data
--   SELECT "tableNumber", "capacity" FROM "Table" ORDER BY "tableNumber"::int;
--
-- Run on VPS:
--   psql -U <user> -d <db_name> -f scripts/update-table-capacity.sql
-- ============================================================

-- Table 5: default 4 seats → max 6 seats (2 extra chairs)
UPDATE "Table"
SET "capacity" = 6
WHERE "tableNumber" = '5';

-- Table 8: default 2 seats → max 3 seats (1 extra chair)
UPDATE "Table"
SET "capacity" = 3
WHERE "tableNumber" = '8';

-- Table 10: default 2 seats → max 3 seats (1 extra chair)
UPDATE "Table"
SET "capacity" = 3
WHERE "tableNumber" = '10';

-- Verify
SELECT "tableNumber", "capacity"
FROM "Table"
WHERE "tableNumber" IN ('5', '8', '10')
ORDER BY "tableNumber"::int;
