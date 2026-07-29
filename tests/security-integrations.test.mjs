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

test("B8.P1: Auth.js production config is explicit and secure", () => {
  const authSource = readProjectFile("src/auth.ts");
  const envSource = readProjectFile("src/config/env.ts");
  const signoutSource = readProjectFile("src/app/api/auth/signout/route.ts");
  const envExample = readProjectFile(".env.example");

  assert.match(
    authSource,
    /secret:\s*getAuthSecret\(\)/,
    "Auth.js must read its secret through validated env config",
  );
  assert.match(
    authSource,
    /trustHost:\s*getAuthTrustHost\(\)/,
    "Auth.js must configure host trust explicitly for production deployments",
  );
  assert.match(
    authSource,
    /useSecureCookies:\s*shouldUseSecureAuthCookies\(\)/,
    "Auth.js must force secure cookies in production",
  );
  assert.match(
    authSource,
    /basePath:\s*"\/api\/auth"/,
    "Auth.js must keep the App Router auth endpoint base path explicit",
  );
  assert.match(
    authSource,
    /\.\.\.authConfig\.callbacks/,
    "Auth.js runtime callbacks must preserve shared authConfig callbacks",
  );
  assert.match(
    envSource,
    /PLACEHOLDER_AUTH_SECRETS/,
    "production auth config must reject placeholder secrets",
  );
  assert.match(
    envSource,
    /"replace-with-a-strong-random-secret"/,
    "production auth config must reject the documented example secret if it is not replaced",
  );
  assert.match(
    envSource,
    /process\.env\.NODE_ENV === "production"[^]*throw new Error\("AUTH_SECRET must be a strong production secret\."\)/,
    "production auth config must fail fast on placeholder AUTH_SECRET",
  );
  assert.match(
    envSource,
    /export function getAuthUrl\(\): string \| null/,
    "production auth config must support canonical AUTH_URL/NEXTAUTH_URL",
  );
  assert.match(
    envSource,
    /export function getAuthTrustHost\(\): boolean/,
    "production auth config must expose explicit trustHost behavior",
  );
  assert.match(
    envSource,
    /export function shouldUseSecureAuthCookies\(\): boolean/,
    "production auth config must expose secure cookie behavior",
  );
  assert.match(
    signoutSource,
    /"authjs\.session-token"/,
    "custom signout route must clear Auth.js v5 session cookie",
  );
  assert.match(
    signoutSource,
    /"__Secure-authjs\.session-token"/,
    "custom signout route must clear secure Auth.js v5 session cookie",
  );
  assert.match(
    envExample,
    /AUTH_SECRET="replace-with-a-strong-random-secret"/,
    ".env.example must not suggest CHANGE_ME as the Auth.js production secret",
  );
  assert.match(
    envExample,
    /AUTH_URL="https:\/\/your-production-domain\.com"/,
    ".env.example must document the canonical production Auth.js URL",
  );
  assert.match(
    envExample,
    /AUTH_TRUST_HOST=true/,
    ".env.example must document production host trust",
  );
});

test("B7.P1: daily reservation reminders use the Jakarta calendar day", () => {
  const source = readProjectFile("src/infrastructure/notifications/guest-notification.service.ts");

  assert.match(
    source,
    /const REMINDER_TIME_ZONE = "Asia\/Jakarta"/,
    "daily reminders must define the restaurant timezone explicitly",
  );
  assert.match(
    source,
    /Intl\.DateTimeFormat\("en-CA",\s*\{[^]*timeZone: REMINDER_TIME_ZONE/,
    "daily reminders must format the target calendar date in Asia/Jakarta",
  );
  assert.match(
    source,
    /export function getDailyReminderTargetDate\(now: Date = new Date\(\)\): Date/,
    "daily reminder target date must be calculated by a dedicated helper",
  );
  assert.match(
    source,
    /const todayKey = formatReminderDateKey\(now\);[^]*const tomorrowKey = addDaysToDateKey\(todayKey, 1\);/,
    "daily reminders must add one calendar day after resolving today's Jakarta date",
  );
  assert.match(
    source,
    /export async function runDailyReminders\(now: Date = new Date\(\)\)/,
    "runDailyReminders must accept an injectable clock for timezone-bound tests and cron safety",
  );
  assertAppearsBefore(
    source,
    "const targetDate = getDailyReminderTargetDate(now);",
    "prisma.reservation.findMany",
    "the Jakarta target date must be chosen before querying reminder candidates",
  );
  assert.match(
    source,
    /date:\s*targetDate/,
    "reservation reminder candidates must query the Jakarta-derived target date",
  );
  assert.doesNotMatch(
    source,
    /const tomorrow = new Date\(\);[^]*tomorrow\.setUTCDate\(tomorrow\.getUTCDate\(\) \+ 1\);/,
    "daily reminders must not derive tomorrow from the UTC calendar",
  );
});

test("B1.P0: VIP token is cryptographically secure and public API avoids PII leakage", () => {
  const serviceSource = readProjectFile("src/features/vip/vip.service.ts");
  const publicRouteSource = readProjectFile("src/app/api/public/vip/[token]/route.ts");

  assert.match(
    serviceSource,
    /TOKEN_BYTES\s*=\s*24;/,
    "VIP token generator must define a 24-byte constant",
  );
  assert.match(
    serviceSource,
    /const token = crypto\.randomBytes\(TOKEN_BYTES\)\.toString\("hex"\);/,
    "VIP token must be generated securely",
  );
  assert.doesNotMatch(
    serviceSource,
    /export async function getPublicVipCardByToken[^]*guest:\s*\{\s*select:\s*\{[^]*email:/,
    "public VIP lookup must not leak the guest email",
  );
  assert.doesNotMatch(
    serviceSource,
    /export async function getPublicVipCardByToken[^]*guest:\s*\{\s*select:\s*\{[^]*phone:/,
    "public VIP lookup must not leak the guest phone number",
  );
  
  assert.match(
    publicRouteSource,
    /\.min\(20\)/,
    "public API must reject short legacy VIP tokens (min 20 chars)",
  );
});

test("B3.P0: Login endpoint applies rate limit and uses generic messages", () => {
  const loginSource = readProjectFile("src/application/use-cases/auth/login.action.ts");

  assert.match(
    loginSource,
    /limiter\.check\(5,\s*`login_\$\{ip\}_\$\{email\}`\)/,
    "Login endpoint must have rate limiting based on IP and email",
  );
  assert.match(
    loginSource,
    /console\.warn\(`\[SECURITY\] Excessive login attempts/,
    "Login endpoint must log excessive attempts to server console",
  );
  assert.match(
    loginSource,
    /error:\s*"Email atau password tidak valid\."/,
    "Login must use generic invalid credential message",
  );
  assert.doesNotMatch(
    loginSource,
    /error:\s*"Akun tidak aktif atau tidak ditemukan\."/,
    "Login must not differentiate user not found from invalid password",
  );
  assert.doesNotMatch(
    loginSource,
    /error:\s*"Email atau password salah\."/,
    "Login must strictly use the single generic message",
  );
  assert.match(
    loginSource,
    /console\.error\("\[LOGIN DB ERROR\]"/,
    "Login must catch database errors and log them on the server",
  );
});

test("B4.P0: Upload endpoints enforce size limits, magic bytes, and rate limits", () => {
  const gallerySource = readProjectFile("src/app/api/admin/gallery/route.ts");
  const careerSource = readProjectFile("src/app/api/careers/[id]/apply/route.ts");

  // Gallery Checks
  assert.match(
    gallerySource,
    /image\.size > 8 \* 1024 \* 1024/,
    "Gallery upload must reject files larger than 8MB",
  );
  assert.match(
    gallerySource,
    /const hex = buffer\.subarray\(0, 4\)\.toString\("hex"\)\.toUpperCase\(\);/,
    "Gallery upload must verify image magic bytes",
  );
  assert.match(
    gallerySource,
    /return jsonError\("Cloudinary belum dikonfigurasi\.", 500\);/,
    "Gallery must not leak Cloudinary configuration error details",
  );

  // Career Checks
  assert.match(
    careerSource,
    /cv\.size > MAX_CV_SIZE_BYTES/,
    "Career upload must reject large CV files",
  );
  assert.match(
    careerSource,
    /limiter\.check\(3,\s*`apply_\$\{ip\}`\)/,
    "Career application must enforce rate limiting (3/hour per IP)",
  );
  assert.match(
    careerSource,
    /const isPdfMagic = buffer\.subarray\(0, 5\)\.toString\("hex"\)\.toUpperCase\(\) === "255044462D";/,
    "Career application must verify PDF magic bytes (%PDF-)",
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

