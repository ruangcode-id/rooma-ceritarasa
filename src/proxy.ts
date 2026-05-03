import { auth } from "@/auth";
import type { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";

export const proxy = auth((request: NextAuthRequest) => {
  const pathname = request.nextUrl.pathname;
  const session = request.auth;

  const isAdminRoute = pathname.startsWith("/admin");
  const isOwnerRoute = pathname.startsWith("/owner");

  if (!isAdminRoute && !isOwnerRoute) {
    return NextResponse.next();
  }

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isOwnerRoute && role !== "owner") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*"],
};
