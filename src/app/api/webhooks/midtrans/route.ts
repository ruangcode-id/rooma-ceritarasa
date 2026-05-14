import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { handleMidtransWebhook } from "@/features/payments/payment.service";
import { verifySignature } from "@/features/payments/payment.utils";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);

    if (!payload) {
      return jsonError("Invalid payload", 400);
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";

    if (!serverKey) {
      return jsonError("MIDTRANS_SERVER_KEY is not configured", 500);
    }

    if (!verifySignature(payload, serverKey)) {
      return jsonError("Invalid signature", 401);
    }

    const result = await handleMidtransWebhook(payload);

    return jsonSuccess(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return jsonError(message, 500);
  }
}
