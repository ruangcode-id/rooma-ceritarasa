import { NextResponse } from "next/server.js";

/**
 * @typedef {{ user?: { role?: string | null } } | null} ProxySession
 */

/**
 * @typedef {object} ProxyAuthorizationRequest
 * @property {ProxySession} auth
 * @property {{ pathname: string, search: string }} nextUrl
 * @property {string} url
 */

function matchesRoute(pathname, route) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 },
  );
}

/**
 * Optimistic access check used by Next.js Proxy.
 * Route handlers must keep their own authorization checks as defense in depth.
 *
 * @param {ProxyAuthorizationRequest} request
 */
export function authorizeProxyRequest(request) {
  const { pathname, search } = request.nextUrl;
  const isAdminUI = matchesRoute(pathname, "/admin");
  const isOwnerUI = matchesRoute(pathname, "/owner");
  const isAdminApi = matchesRoute(pathname, "/api/admin");
  const isOwnerApi = matchesRoute(pathname, "/api/owner");
  const isApiRoute = isAdminApi || isOwnerApi;
  const isProtectedRoute = isAdminUI || isOwnerUI || isApiRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    if (isApiRoute) {
      return unauthorizedResponse();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const role = request.auth.user.role;
  const canAccessAdmin = role === "admin" || role === "owner";
  const canAccessOwner = role === "owner";

  if ((isAdminUI || isAdminApi) && !canAccessAdmin) {
    return isApiRoute
      ? forbiddenResponse()
      : NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if ((isOwnerUI || isOwnerApi) && !canAccessOwner) {
    return isApiRoute
      ? forbiddenResponse()
      : NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}
