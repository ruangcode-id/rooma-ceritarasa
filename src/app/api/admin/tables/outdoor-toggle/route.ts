import { NextRequest } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import {
  getOutdoorAreaStatus,
  toggleOutdoorArea,
} from "@/features/tables/table.service";
import { z } from "zod";

const toggleSchema = z.object({
  active: z.boolean(),
});

export async function GET() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const status = await getOutdoorAreaStatus();
    return jsonSuccess(status);
  } catch (error) {
    console.error("[OUTDOOR GET ERROR]", error);
    return jsonError("Failed to retrieve outdoor area status", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = toggleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const updatedStatus = await toggleOutdoorArea(parsed.data.active);
    return jsonSuccess(updatedStatus);
  } catch (error) {
    console.error("[OUTDOOR TOGGLE ERROR]", error);
    return jsonError("Failed to update outdoor area status", 500);
  }
}
