import { auth } from "@/auth";
import type { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";

export const proxy = auth((request: NextAuthRequest) => {
  const pathname = request.nextUrl.pathname;
  const session = request.auth;

  const isAdminUI = pathname.startsWith("/admin");
  const isOwnerUI = pathname.startsWith("/owner");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isOwnerApi = pathname.startsWith("/api/owner");

  const isApiRoute = pathname.startsWith("/api/");
  const isProtectedRoute = isAdminUI || isOwnerUI || isAdminApi || isOwnerApi;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!session?.user) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  const requiresAdmin = isAdminUI || isAdminApi;
  const requiresOwner = isOwnerUI || isOwnerApi;

  if (requiresAdmin && role !== "admin") {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not have the required role to access this resource." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (requiresOwner && role !== "owner") {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not have the required role to access this resource." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/api/admin/:path*", "/api/owner/:path*"],
};
