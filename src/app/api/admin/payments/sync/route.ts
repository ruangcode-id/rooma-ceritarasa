import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { syncMutablePaymentStatuses } from "@/features/payments/payment.service";

export async function POST() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const result = await syncMutablePaymentStatuses();
    return jsonSuccess(result);
  } catch (error: unknown) {
    console.error("API [Admin Payment Sync] Error:", error);
    return jsonError("Terjadi kesalahan internal pada server.", 500);
  }
}
