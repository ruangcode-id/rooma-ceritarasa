/**
 * VAPID untuk Web Push (admin/owner). Generate: `npx web-push generate-vapid-keys`
 * Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, opsional `VAPID_SUBJECT` (mailto: atau https:).
 */
export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    return null;
  }
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:admin@rooma-ceritarasa.local";
  return { publicKey, privateKey, subject };
}

export type FonnteConfig = {
  token: string;
  /** Nomor pengirim terdaftar di Fonnte (opsional, tergantung paket). */
  sender?: string;
};

export function getFonnteConfig(): FonnteConfig | null {
  const token = process.env.FONNTE_TOKEN?.trim();
  if (!token) return null;
  const sender = process.env.FONNTE_SENDER?.trim();
  return sender ? { token, sender } : { token };
}

export type ResendConfig = {
  apiKey: string;
  fromEmail: string;
};

export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) return null;
  return { apiKey, fromEmail };
}

export function getCronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || null;
}

export function getCareerAdminEmail(): string | null {
  return process.env.CAREER_ADMIN_EMAIL?.trim() || null;
}
