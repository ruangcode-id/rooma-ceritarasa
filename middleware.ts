import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type Role = "admin" | "owner";

function jsonUnauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

function jsonForbidden() {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 },
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isOwnerRoute = pathname.startsWith("/owner") || pathname.startsWith("/api/owner");

  if (!isAdminRoute && !isOwnerRoute) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req: request, secret });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return jsonUnauthorized();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as Role | undefined;

  if (isAdminRoute && role !== "admin" && role !== "owner") {
    if (pathname.startsWith("/api/")) {
      return jsonForbidden();
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (isOwnerRoute && role !== "owner") {
    if (pathname.startsWith("/api/")) {
      return jsonForbidden();
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/api/admin/:path*",
    "/api/owner/:path*",
  ],
};
