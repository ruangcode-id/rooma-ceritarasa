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

test("admin session routes keep client-facing errors generic", () => {
  const routes = [
    "src/app/api/admin/sessions/route.ts",
    "src/app/api/admin/sessions/[id]/route.ts",
  ];

  for (const route of routes) {
    const source = readProjectFile(route);

    assert.ok(
      source.includes("console.error"),
      `${route} should log the underlying error on the server`,
    );
    assert.equal(
      /error:\s*message/.test(source) || /jsonError\(\s*message/.test(source),
      false,
      `${route} must not return raw error.message to clients`,
    );
  }
});

test("B5.P0 payment routes keep client-facing errors generic", () => {
  const routes = [
    {
      file: "src/app/api/public/payments/route.ts",
      serverError: "Terjadi kesalahan pada server. Silakan coba lagi.",
    },
    {
      file: "src/app/api/public/payments/[orderId]/status/route.ts",
      serverError: "Terjadi kesalahan pada server.",
    },
    {
      file: "src/app/api/admin/payments/route.ts",
      serverError: "Terjadi kesalahan internal pada server.",
    },
    {
      file: "src/app/api/admin/payments/sync/route.ts",
      serverError: "Terjadi kesalahan internal pada server.",
    },
    {
      file: "src/app/api/admin/payments/[id]/refund/route.ts",
      serverError: "Terjadi kesalahan internal pada server.",
    },
  ];

  for (const { file, serverError } of routes) {
    const source = readProjectFile(file);

    assert.ok(
      source.includes("console.error"),
      `${file} should log the underlying error on the server`,
    );
    assert.ok(
      source.includes(serverError),
      `${file} should return a generic server error message`,
    );
    assert.equal(
      /error:\s*message/.test(source) || /jsonError\(\s*message/.test(source),
      false,
      `${file} must not return raw error.message to clients`,
    );
  }
});

// A4: Rate Limiting — guard must run before any business logic
test("A4: rate limit guard (429) runs before req.json() and createPublicReservation", () => {
  const source = readProjectFile("src/app/api/public/reservations/route.ts");

  // Verify rate limiter is imported and instantiated
  assert.match(source, /import rateLimit from/, "rateLimit import must exist");
  assert.match(source, /rateLimit\(/, "rateLimit instance must be created");

  // Guard check appears before business logic
  assertAppearsBefore(
    source,
    "limiter.check(",
    "await createPublicReservation",
    "A4: rate limit check must run before createPublicReservation",
  );

  // 429 response must be present
  assert.match(source, /status:\s*429/, "A4: route must return HTTP 429 when rate limit is exceeded");

  // Retry-After header must be present
  assert.match(source, /Retry-After/, "A4: Retry-After header must be present in 429 response");
});

// A5: Payload Size Limit — guard must run before req.json() and createPublicReservation
test("A5: payload size guard (413) runs before createPublicReservation", () => {
  const source = readProjectFile("src/app/api/public/reservations/route.ts");

  // content-length check must be present
  assert.match(source, /content-length/, "A5: content-length header must be checked");

  // 413 guard runs before createPublicReservation
  assertAppearsBefore(
    source,
    "status: 413",
    "await createPublicReservation",
    "A5: payload size check (413) must run before createPublicReservation",
  );

  // 413 response must be present
  assert.match(source, /status:\s*413/, "A5: route must return HTTP 413 when payload is too large");
});

