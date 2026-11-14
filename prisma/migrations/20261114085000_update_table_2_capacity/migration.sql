-- Update Table 2 capacity to 4 to align with max 4 pax booking rules
UPDATE "tables"
SET "capacity" = 4
WHERE "table_number" IN ('2', 'Table 2', 'T2');
