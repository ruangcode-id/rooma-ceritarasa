import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

globalThis.AsyncLocalStorage ??= AsyncLocalStorage;

const nextTestingServer = await import("next/experimental/testing/server.js");
const { authorizeProxyRequest } = await import(
  "../src/lib/proxy-authorization.mjs"
);
const doesProxyMatch =
  nextTestingServer.unstable_doesProxyMatch ??
  nextTestingServer.unstable_doesMiddlewareMatch;

assert.equal(
  typeof doesProxyMatch,
  "function",
  "Next.js proxy matcher test utility must be available",
);

const expectedMatchers = [
  "/admin/:path*",
  "/owner/:path*",
  "/api/admin/:path*",
  "/api/owner/:path*",
];

function readConfiguredMatchers() {
  const proxyPath = fileURLToPath(new URL("../src/proxy.ts", import.meta.url));
  const source = readFileSync(proxyPath, "utf8");
  const configBlock = source.match(/export const config\s*=\s*\{[\s\S]*?\n\};/);

  assert.ok(configBlock, "src/proxy.ts must export a static config object");

  return [...configBlock[0].matchAll(/^[\t ]*"(\/[^"\r\n]+)"[\t ]*,?$/gm)].map(
    ([, matcher]) => matcher,
  );
}

function request(pathname, role) {
  const url = new URL(pathname, "https://rooma.example");

  return {
    auth:
      role === undefined
        ? null
        : {
            user: { role },
          },
    nextUrl: {
      pathname: url.pathname,
      search: url.search,
    },
    url: url.href,
  };
}

async function responseBody(response) {
  return /** @type {{ success: boolean, error: string }} */ (
    await response.json()
  );
}

test("proxy matcher protects only admin and owner page/API namespaces", () => {
  const matchers = readConfiguredMatchers();
  assert.deepEqual(matchers, expectedMatchers);

  const config = { matcher: matchers };
  const protectedPaths = [
    "/admin",
    "/admin/reservations",
    "/owner",
    "/owner/users",
    "/api/admin/reservations",
    "/api/owner/users/123",
  ];
  const publicPaths = [
    "/",
    "/login",
    "/administrator",
    "/api/administer",
    "/api/public/reservations",
    "/api/public/payments",
    "/api/webhooks/midtrans",
    "/api/cron/reminders",
  ];

  for (const url of protectedPaths) {
    assert.equal(
      doesProxyMatch({ config, nextConfig: {}, url }),
      true,
      `${url} should run through proxy`,
    );
  }

  for (const url of publicPaths) {
    assert.equal(
      doesProxyMatch({ config, nextConfig: {}, url }),
      false,
      `${url} should stay outside proxy`,
    );
  }
});

test("anonymous API requests receive a safe 401 envelope", async () => {
  const response = authorizeProxyRequest(request("/api/admin/reservations"));

  assert.equal(response.status, 401);
  assert.deepEqual(await responseBody(response), {
    success: false,
    error: "Unauthorized",
  });
});

test("authenticated users with the wrong role receive a safe 403 envelope", async () => {
  const response = authorizeProxyRequest(
    request("/api/owner/users", "admin"),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await responseBody(response), {
    success: false,
    error: "Forbidden",
  });
});

test("anonymous pages redirect to login and preserve the internal callback URL", () => {
  const response = authorizeProxyRequest(
    request("/admin/reservations?page=2"),
  );
  const location = new URL(response.headers.get("location"));

  assert.equal(response.status, 307);
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("callbackUrl"), "/admin/reservations?page=2");
});

test("authenticated users with the wrong role redirect to unauthorized", () => {
  const response = authorizeProxyRequest(request("/owner/dashboard", "admin"));
  const location = new URL(response.headers.get("location"));

  assert.equal(response.status, 307);
  assert.equal(location.pathname, "/unauthorized");
});

test("admin and owner permissions follow the role hierarchy", () => {
  const adminOnAdmin = authorizeProxyRequest(
    request("/api/admin/reservations", "admin"),
  );
  const ownerOnAdmin = authorizeProxyRequest(
    request("/api/admin/reservations", "owner"),
  );
  const ownerOnOwner = authorizeProxyRequest(
    request("/api/owner/users", "owner"),
  );

  assert.equal(adminOnAdmin.headers.get("x-middleware-next"), "1");
  assert.equal(ownerOnAdmin.headers.get("x-middleware-next"), "1");
  assert.equal(ownerOnOwner.headers.get("x-middleware-next"), "1");
});

test("public routes pass through when the authorization function is called directly", () => {
  const response = authorizeProxyRequest(request("/api/public/reservations"));

  assert.equal(response.headers.get("x-middleware-next"), "1");
});
