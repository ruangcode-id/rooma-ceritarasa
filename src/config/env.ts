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
