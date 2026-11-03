-- ============================================================
-- Table Capacity Update — Meja 8 & Meja 10
-- Rooma Ceritarasa (maintenance Nov 2026)
--
-- Target:
--   Table 8  → 3 pax
--   Table 10 → 2 pax (previously 3 in the system)
--
-- Matches Prisma mapping:
--   model Table @@map("tables")
--   tableNumber @map("table_number")
--
-- Before running:
--   SELECT table_number, capacity FROM tables ORDER BY table_number;
--
-- Run:
--   psql "$DATABASE_URL" -f scripts/update-table-capacity.sql
-- ============================================================

UPDATE tables
SET capacity = 3
WHERE table_number IN ('8', 'Table 8', 'T8');

UPDATE tables
SET capacity = 2
WHERE table_number IN ('10', 'Table 10', 'T10');

SELECT table_number, capacity
FROM tables
WHERE table_number IN ('8', 'Table 8', 'T8', '10', 'Table 10', 'T10')
ORDER BY table_number;
