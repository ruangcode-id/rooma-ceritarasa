import { generateCheckInQrBuffer } from "@/infrastructure/check-in/qr-code";

type RouteCtx = { params: Promise<{ token: string }> };

/** Gambar QR check-in publik (untuk embed di email dengan URL HTTPS). */
export async function GET(_request: Request, context: RouteCtx) {
  const { token } = await context.params;
  const trimmed = token?.trim();

  if (!trimmed || trimmed.length > 100) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buffer = await generateCheckInQrBuffer(trimmed);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Invalid token", { status: 400 });
  }
}
