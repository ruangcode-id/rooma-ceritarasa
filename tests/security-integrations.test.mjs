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

test("B2.P0: public create payment requires paymentToken instead of reservation id", () => {
  const source = readProjectFile("src/app/api/public/payments/route.ts");
  const migrationSource = readProjectFile(
    "prisma/migrations/20260721152000_add_reservation_payment_token/migration.sql",
  );

  assert.match(
    source,
    /typeof body\.paymentToken !== "string"/,
    "create payment must reject payloads without a paymentToken",
  );
  assert.match(
    source,
    /where:\s*\{\s*paymentToken:\s*body\.paymentToken,/,
    "create payment must resolve reservation access through paymentToken",
  );
  assert.doesNotMatch(
    source,
    /where:\s*\{\s*id:\s*body\.reservationId\s*\}/,
    "create payment must not trust a public reservationId as access proof",
  );
  assert.match(
    migrationSource,
    /ADD COLUMN IF NOT EXISTS "payment_token" VARCHAR\(100\)/,
    "database migration must add reservation payment_token",
  );
  assert.match(
    migrationSource,
    /CREATE UNIQUE INDEX IF NOT EXISTS "reservations_payment_token_key"/,
    "database migration must enforce unique reservation payment_token",
  );
});

test("B2.P0: public payment status requires a matching paymentToken", () => {
  const source = readProjectFile("src/app/api/public/payments/[orderId]/status/route.ts");

  assertAppearsBefore(
    source,
    "const paymentToken = req.nextUrl.searchParams.get(\"paymentToken\")",
    "const payment = await paymentRepository.findByOrderId(orderId)",
    "status endpoint must read the payment token before loading payment status",
  );
  assert.match(
    source,
    /if \(!paymentToken\)\s*\{\s*return NextResponse\.json\([^]*status:\s*401/,
    "status endpoint must reject missing paymentToken",
  );
  assert.match(
    source,
    /where:\s*\{\s*paymentToken\s*\}/,
    "status endpoint must resolve reservation through paymentToken",
  );
  assert.match(
    source,
    /!reservation \|\| reservation\.id !== payment\.reservationId/,
    "status endpoint must reject tokens that do not belong to the payment reservation",
  );
});

test("B2.P0: duplicate public payment requests are blocked atomically", () => {
  const routeSource = readProjectFile("src/app/api/public/payments/route.ts");
  const serviceSource = readProjectFile("src/features/payments/payment.service.ts");
  const migrationSource = readProjectFile(
    "prisma/migrations/20260721153000_one_active_payment_per_reservation/migration.sql",
  );

  assert.match(
    serviceSource,
    /prisma\.\$transaction/,
    "payment creation must perform duplicate checks inside a database transaction",
  );
  assertAppearsBefore(
    serviceSource,
    "pg_advisory_xact_lock",
    "tx.payment.create",
    "payment creation must acquire a reservation-scoped lock before inserting payment",
  );
  assertAppearsBefore(
    serviceSource,
    "existingActivePayment",
    "tx.payment.create",
    "payment creation must check existing active payment before inserting payment",
  );
  assert.match(
    serviceSource,
    /status:\s*\{\s*in:\s*\[\.\.\.ACTIVE_PAYMENT_STATUSES\]\s*\}/,
    "payment creation must guard active statuses, not only a short retry window",
  );
  assert.match(
    routeSource,
    /error instanceof PaymentAlreadyProcessingError[^]*jsonError\([^]*,\s*409\s*\)/,
    "public route must return HTTP 409 for duplicate active payment requests",
  );
  assert.match(
    migrationSource,
    /CREATE UNIQUE INDEX "payments_one_active_per_reservation_key"[^]*WHERE "status" IN \('pending', 'paid'\)/,
    "database must enforce one active payment per reservation",
  );
});

test("B6.P1: QR check-in token is separate from cancel token", () => {
  const schemaSource = readProjectFile("prisma/schema.prisma");
  const reservationServiceSource = readProjectFile("src/features/reservations/reservation.service.ts");
  const repositorySource = readProjectFile("src/infrastructure/repositories/reservation.repository.ts");
  const notificationSource = readProjectFile("src/infrastructure/notifications/guest-notification.service.ts");
  const migrationSource = readProjectFile(
    "prisma/migrations/20260721190000_split_check_in_and_cancel_tokens/migration.sql",
  );

  assert.match(
    schemaSource,
    /checkInToken\s+String\?\s+@unique\s+@map\("check_in_token"\)/,
    "Reservation schema must define a unique checkInToken",
  );
  assert.match(
    schemaSource,
    /checkInTokenExpiresAt\s+DateTime\?\s+@map\("check_in_token_expires_at"\)/,
    "Reservation schema must define check-in token expiry",
  );
  assert.match(
    reservationServiceSource,
    /const checkInToken = crypto\.randomBytes\(24\)\.toString\("hex"\)/,
    "public reservation creation must generate a dedicated check-in token",
  );
  assert.match(
    reservationServiceSource,
    /checkInTokenExpiresAt = buildCheckInDeadline/,
    "public reservation creation must set check-in token expiry",
  );
  assert.doesNotMatch(
    notificationSource,
    /reservation\.cancelToken\?\.trim\(\) \?\? ""/,
    "guest QR notifications must not use cancelToken as the check-in code",
  );
  assert.match(
    notificationSource,
    /reservation\.checkInToken\?\.trim\(\) \?\? ""/,
    "guest QR notifications must use checkInToken as the check-in code",
  );
  assert.match(
    repositorySource,
    /where:\s*\{\s*checkInToken:\s*trimmed,/,
    "check-in lookup must resolve scanned QR codes through checkInToken",
  );
  assert.doesNotMatch(
    repositorySource,
    /where:\s*\{\s*cancelToken:\s*trimmed\s*\}/,
    "check-in lookup must not accept cancelToken",
  );
  assert.match(
    migrationSource,
    /ADD COLUMN IF NOT EXISTS "check_in_token" VARCHAR\(100\)/,
    "migration must add check_in_token",
  );
  assert.match(
    migrationSource,
    /ADD COLUMN IF NOT EXISTS "check_in_token_expires_at" TIMESTAMP\(3\)/,
    "migration must add check_in_token_expires_at",
  );
  assert.match(
    migrationSource,
    /UPDATE "reservations"[\s\S]*SET "cancel_token"/,
    "migration must rotate active cancel tokens so old QR values cannot cancel",
  );
  assert.match(
    migrationSource,
    /CREATE UNIQUE INDEX IF NOT EXISTS "reservations_check_in_token_key"/,
    "migration must enforce unique check_in_token",
  );
});

