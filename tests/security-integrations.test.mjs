import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

function readProjectFile(path) {
  return readFileSync(join(projectRoot, path), "utf8");
}

function assertAppearsBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert.notEqual(firstIndex, -1, `${first} was not found`);
  assert.notEqual(secondIndex, -1, `${second} was not found`);
  assert.ok(firstIndex < secondIndex, message);
}

test("public reservation validates input before business logic and keeps 201 success", () => {
  const source = readProjectFile("src/app/api/public/reservations/route.ts");

  assertAppearsBefore(
    source,
    "publicReservationSchema.safeParse",
    "const result = await createPublicReservation",
    "reservation validation must run before creating records or payments",
  );
  assert.match(source, /\{\s*status:\s*201\s*\}/);
});

test("Midtrans webhook rejects an invalid signature before database writes", () => {
  const source = readProjectFile("src/app/api/webhooks/midtrans/route.ts");

  assertAppearsBefore(
    source,
    "if (!verifySignature(payload, serverKey))",
    "prisma.$transaction",
    "signature verification must run before the payment transaction",
  );
  assert.match(
    source,
    /if \(!verifySignature\(payload, serverKey\)\)\s*\{\s*return jsonError\("Invalid signature", 401\)/,
  );
});

test("cron reminder authorization runs before reminder side effects", () => {
  const source = readProjectFile("src/app/api/cron/reminders/route.ts");

  assertAppearsBefore(
    source,
    "if (!authorizeCron(request))",
    "runDailyReminders()",
    "cron authorization must run before sending reminders",
  );
  assert.match(
    source,
    /if \(!authorizeCron\(request\)\)\s*\{\s*return jsonError\("Unauthorized", 401\)/,
  );
});
