import { auth } from "@/auth";
import { authorizeProxyRequest } from "@/lib/proxy-authorization.mjs";

export const proxy = auth(authorizeProxyRequest);

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/api/admin/:path*",
    "/api/owner/:path*",
  ],
};
