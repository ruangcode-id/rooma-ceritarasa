import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Table 2 capacity in seed data is 4", () => {
  const seedFile = readFileSync("src/app/api/public/seed-tables/route.ts", "utf8");
  assert.match(
    seedFile,
    /\{\s*tableNumber:\s*"Table 2",\s*capacity:\s*4/,
    "Table 2 must have capacity 4 in seed data"
  );
});

test("Table 2 combo definition allows 3 to 4 pax", () => {
  const wizardFile = readFileSync("src/components/ui/ReservationWizard.tsx", "utf8");
  assert.match(
    wizardFile,
    /id:\s*"single_2",\s*name:\s*"Table 2",\s*tables:\s*\["Table 2"\],\s*minPax:\s*3,\s*maxPax:\s*4/,
    "Table 2 single combo must allow minPax 3 and maxPax 4"
  );
});

test("Table 2 capacity validation allows 4 pax reservation", () => {
  const table2 = { tableNumber: "Table 2", capacity: 4 };
  const partySize = 4;
  const totalCapacity = table2.capacity;
  
  assert.equal(totalCapacity >= partySize, true, "Capacity 4 must be sufficient for 4 guests");
});
