import { signOut } from "@/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const signoutResult = await signOut({ redirect: false });

  const cookiesToClear = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "session-token",
    "__Secure-session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  const response = NextResponse.json(
    { success: true, url: signoutResult.url },
    { status: 200 }
  );

  cookiesToClear.forEach((name) => {
    response.cookies.delete(name);
  });

  return response;
}
