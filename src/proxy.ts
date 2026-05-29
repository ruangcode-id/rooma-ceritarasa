import { auth } from "@/auth";
import type { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";

export const proxy = auth((request: NextAuthRequest) => {
  const pathname = request.nextUrl.pathname;

  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isOwnerRoute =
    pathname.startsWith("/owner") || pathname.startsWith("/api/owner");

  if (!isAdminRoute && !isOwnerRoute) {
    return NextResponse.next();
  }

  let session;
  try {
    session = request.auth;
  } catch (error) {
    console.error("[proxy] auth() failed:", error);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Authentication error" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const unauthorizedApi = () =>
    NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const forbiddenApi = () =>
    NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return unauthorizedApi();
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  if (isAdminRoute && role !== "admin" && role !== "owner") {
    if (pathname.startsWith("/api/")) {
      return forbiddenApi();
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (isOwnerRoute && role !== "owner") {
    if (pathname.startsWith("/api/")) {
      return forbiddenApi();
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/api/admin/:path*",
    "/api/owner/:path*",
  ],
};
