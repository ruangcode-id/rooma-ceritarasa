import { getFonnteConfig } from "@/config/env";

export const FONNTE_CONFIG_WARNING =
  "WA tidak terkirim karena konfigurasi Fonnte belum lengkap (FONNTE_TOKEN).";

export type WhatsAppSendResult =
  | { sent: true }
  | { sent: false; warning: string };

/** Normalisasi nomor ke format internasional 62xxx (untuk display/log). */
export function normalizePhoneForFonnte(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (!digits.startsWith("62")) {
    digits = `62${digits}`;
  }
  return digits;
}

/**
 * Format target untuk API Fonnte + countryCode "62".
 * Fonnte mengganti angka 0 depan; kirim 08xxx, bukan 628xxx (hindari double prefix).
 * @see https://docs.fonnte.com/api-send-message/
 */
export function formatTargetForFonnteApi(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) {
    return `0${digits.slice(2)}`;
  }
  if (!digits.startsWith("0")) {
    return `0${digits}`;
  }
  return digits;
}

function mapFonnteReason(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes("disconnected")) {
    return "Device Fonnte belum terhubung. Buka dashboard Fonnte → scan QR ulang, pastikan HP online.";
  }
  if (lower.includes("token invalid")) {
    return "FONNTE_TOKEN tidak valid. Salin ulang token dari dashboard Fonnte.";
  }
  if (lower.includes("package") || lower.includes("attachment")) {
    return "Paket Fonnte tidak mendukung kirim gambar. Upgrade ke super/advanced/ultra atau gunakan kode teks.";
  }
  return reason;
}

type FonnteApiResponse = {
  status?: boolean;
  Status?: boolean;
  reason?: string;
  detail?: string;
};

function parseFonnteResponse(
  response: Response,
  json: FonnteApiResponse | null,
  target: string,
  context: string,
): WhatsAppSendResult {
  const rejected = json?.status === false || json?.Status === false;

  if (!response.ok || rejected) {
    const raw = json?.reason || json?.detail || `HTTP ${response.status}`;
    const reason = mapFonnteReason(String(raw));
    console.warn(`[fonnte] ${context} failed:`, raw, { target });
    return {
      sent: false,
      warning: `WA tidak terkirim: ${reason}`,
    };
  }

  return { sent: true };
}

function validateFonnteTarget(phone: string, config: NonNullable<ReturnType<typeof getFonnteConfig>>) {
  const target = formatTargetForFonnteApi(phone);
  if (target.length < 10) {
    return { ok: false as const, warning: "Nomor telepon tidak valid." };
  }
  return { ok: true as const, target, config };
}

/**
 * Kirim pesan WhatsApp via Fonnte API.
 * @see https://docs.fonnte.com/
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  const config = getFonnteConfig();
  if (!config) {
    console.warn(FONNTE_CONFIG_WARNING);
    return { sent: false, warning: FONNTE_CONFIG_WARNING };
  }

  const validated = validateFonnteTarget(phone, config);
  if (!validated.ok) {
    return { sent: false, warning: validated.warning };
  }

  const { target } = validated;

  try {
    const body: Record<string, string> = {
      target,
      message,
      countryCode: "62",
    };
    if (config.sender) {
      body.sender = formatTargetForFonnteApi(config.sender);
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: config.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await response.json().catch(() => null)) as FonnteApiResponse | null;
    return parseFonnteResponse(response, json, target, "send");
  } catch (error) {
    console.warn("[fonnte] send error:", error);
    return {
      sent: false,
      warning: "WA tidak terkirim karena kendala jaringan atau layanan Fonnte.",
    };
  }
}

/**
 * Kirim WA dengan lampiran gambar (QR check-in).
 * Membutuhkan paket Fonnte super/advanced/ultra.
 * @see https://docs.fonnte.com/api-send-message/
 */
export async function sendWhatsAppMessageWithImage(
  phone: string,
  message: string,
  imageBuffer: Buffer,
  filename = "check-in-qr.png",
): Promise<WhatsAppSendResult> {
  const config = getFonnteConfig();
  if (!config) {
    console.warn(FONNTE_CONFIG_WARNING);
    return { sent: false, warning: FONNTE_CONFIG_WARNING };
  }

  const validated = validateFonnteTarget(phone, config);
  if (!validated.ok) {
    return { sent: false, warning: validated.warning };
  }

  const { target } = validated;

  try {
    const formData = new FormData();
    formData.append("target", target);
    formData.append("message", message);
    formData.append("countryCode", "62");
    if (config.sender) {
      formData.append("sender", formatTargetForFonnteApi(config.sender));
    }

    const blob = new Blob([Uint8Array.from(imageBuffer)], { type: "image/png" });
    formData.append("file", blob, filename);

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: config.token,
      },
      body: formData,
    });

    const json = (await response.json().catch(() => null)) as FonnteApiResponse | null;
    return parseFonnteResponse(response, json, target, "send image");
  } catch (error) {
    console.warn("[fonnte] send image error:", error);
    return {
      sent: false,
      warning: "WA gambar tidak terkirim karena kendala jaringan atau layanan Fonnte.",
    };
  }
}
