import {
  jsonError,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { pushSubscriptionBodySchema } from "@/validations/notification.validation";
import {
  findPushSubscriptionsByUserId,
  replacePushSubscriptionForEndpoint,
} from "@/infrastructure/repositories/notification.repository";

function truncateEndpoint(endpoint: string, max = 64): string {
  if (endpoint.length <= max) return endpoint;
  return `${endpoint.slice(0, max)}…`;
}

export async function GET() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const rows = await findPushSubscriptionsByUserId(authResult.userId);
  return jsonSuccess(
    rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      endpointPreview: truncateEndpoint(r.endpoint),
    })),
  );
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = pushSubscriptionBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const { endpoint, keys } = parsed.data;
  const saved = await replacePushSubscriptionForEndpoint({
    userId: authResult.userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  return jsonSuccess(
    {
      id: saved.id,
      createdAt: saved.createdAt.toISOString(),
      endpointPreview: truncateEndpoint(saved.endpoint),
    },
    { status: 201 },
  );
}
