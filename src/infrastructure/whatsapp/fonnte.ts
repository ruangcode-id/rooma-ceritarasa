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
  let digits = phone.replace(/\D/g, "");
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
  return reason;
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

  const target = formatTargetForFonnteApi(phone);
  if (target.length < 10) {
    return { sent: false, warning: "Nomor telepon tidak valid." };
  }

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

    const json = (await response.json().catch(() => null)) as
      | {
          status?: boolean;
          Status?: boolean;
          reason?: string;
          detail?: string;
        }
      | null;

    const rejected =
      json?.status === false || json?.Status === false;

    if (!response.ok || rejected) {
      const raw =
        json?.reason || json?.detail || `HTTP ${response.status}`;
      const reason = mapFonnteReason(String(raw));
      console.warn("[fonnte] send failed:", raw, { target });
      return {
        sent: false,
        warning: `WA tidak terkirim: ${reason}`,
      };
    }

    return { sent: true };
  } catch (error) {
    console.warn("[fonnte] send error:", error);
    return {
      sent: false,
      warning: "WA tidak terkirim karena kendala jaringan atau layanan Fonnte.",
    };
  }
}
