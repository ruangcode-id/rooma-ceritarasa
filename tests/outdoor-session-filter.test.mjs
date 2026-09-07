import test from "node:test";
import assert from "node:assert/strict";

// Helper logic replica matching src/features/tables/table.service.ts
function isSessionOne(session) {
  const name = session.name.trim().toLowerCase();
  if (
    /\b(one|1)\b/i.test(name) ||
    name === "session one" ||
    name === "sesi 1" ||
    name === "session 1"
  ) {
    return true;
  }

  if (session.startTime) {
    const timeStr =
      typeof session.startTime === "string"
        ? session.startTime
        : session.startTime.toISOString();
    if (timeStr.includes("15:00") || timeStr.includes("15.00")) {
      return true;
    }
  }

  return false;
}

test("isSessionOne detects Session 1 correctly", () => {
  assert.equal(isSessionOne({ name: "Session one" }), true);
  assert.equal(isSessionOne({ name: "Session 1" }), true);
  assert.equal(isSessionOne({ name: "Sesi 1" }), true);
  assert.equal(isSessionOne({ name: "sesi one" }), true);
  assert.equal(isSessionOne({ name: "Sore (15:00)", startTime: "1970-01-01T15:00:00.000Z" }), true);
});

test("isSessionOne rejects other sessions", () => {
  assert.equal(isSessionOne({ name: "Session two" }), false);
  assert.equal(isSessionOne({ name: "Session 2" }), false);
  assert.equal(isSessionOne({ name: "Session three" }), false);
  assert.equal(isSessionOne({ name: "Session 3" }), false);
  assert.equal(isSessionOne({ name: "Sesi Malam", startTime: "1970-01-01T20:00:00.000Z" }), false);
});

test("Filtering outdoor tables for Session 1", () => {
  const sampleTables = [
    { tableNumber: "T1", capacity: 2 },
    { tableNumber: "T2", capacity: 4 },
    { tableNumber: "OUT-1", capacity: 4 },
    { tableNumber: "OUT-2", capacity: 4 },
    { tableNumber: "OUT-3", capacity: 4 },
    { tableNumber: "OUT-4", capacity: 4 },
  ];

  const session1 = { name: "Session one" };
  const session2 = { name: "Session two" };

  const isSession1 = isSessionOne(session1);
  const tablesSession1 = isSession1
    ? sampleTables.filter((t) => !t.tableNumber.startsWith("OUT-"))
    : sampleTables;

  assert.equal(tablesSession1.length, 2);
  assert.equal(tablesSession1.every((t) => !t.tableNumber.startsWith("OUT-")), true);

  const isSession2 = isSessionOne(session2);
  const tablesSession2 = isSession2
    ? sampleTables.filter((t) => !t.tableNumber.startsWith("OUT-"))
    : sampleTables;

  assert.equal(tablesSession2.length, 6);
  assert.equal(tablesSession2.some((t) => t.tableNumber.startsWith("OUT-")), true);
});
