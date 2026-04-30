// Next.js proxy for auth protection
// Protects /admin/* and /owner/* routes
// Guests do not need auth
// Auth.js v5 (next-auth@beta) uses a different pattern
// Implementation will be added when auth is configured

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  void _request;
  // TODO: Implement auth check via Auth.js v5 `auth()` wrapper
  // For now, allow all requests through
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*"],
};
