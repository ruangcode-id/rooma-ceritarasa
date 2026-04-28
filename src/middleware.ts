// Next.js middleware for auth protection
// Protects /admin/* and /owner/* routes
// Guests do not need auth
// Auth.js v5 (next-auth@beta) uses a different middleware pattern
// Implementation will be added when auth.ts is configured

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // TODO: Implement auth check via Auth.js v5 `auth()` wrapper
  // For now, allow all requests through
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*"],
};
