import { NextResponse } from "next/server";

/**
 * Public healthcheck for Docker / Caddy / load balancers.
 * Does not expose secrets or internal error details.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "rooma-ceritarasa",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
