import QRCode from "qrcode";

const CHECK_IN_QR_OPTIONS = {
  width: 300,
  margin: 2,
  errorCorrectionLevel: "M" as const,
};

/** Content-ID untuk inline attachment email (Resend). */
export const CHECK_IN_QR_CID = "check-in-qr";

/** QR berisi token khusus check-in — cocok untuk scanner fisik di front desk. */
export async function generateCheckInQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token.trim(), CHECK_IN_QR_OPTIONS);
}

export async function generateCheckInQrBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token.trim(), {
    ...CHECK_IN_QR_OPTIONS,
    type: "png",
  });
}

function normalizeAppUrl(url: string | undefined): string | null {
  const trimmed = url?.trim().replace(/\/+$/, "");
  return trimmed || null;
}

function isPublicAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol !== "http:") return false;
    return !["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function tryUploadCheckInQrToCloudinary(
  qrBuffer: Buffer,
  checkInCode: string,
): Promise<string | null> {
  try {
    const { uploadToCloudinary } = await import("@/lib/cloudinary");
    const result = await uploadToCloudinary(qrBuffer, {
      folder: "rooma/check-in-qr",
      publicId: `check-in-${checkInCode.slice(0, 16)}`,
      resourceType: "image",
    });
    return result.secureUrl;
  } catch (error) {
    console.warn("[check-in-qr] Cloudinary upload skipped:", error);
    return null;
  }
}

export type CheckInQrEmailAssets = {
  qrBuffer: Buffer;
  imageSrc: string;
  /** Pakai Resend inline attachment (cid:) — untuk dev tanpa URL publik. */
  inlineAttachment: boolean;
};

/**
 * Sumber gambar QR untuk email — prioritas:
 * 1. Cloudinary HTTPS
 * 2. URL app publik (/api/public/check-in/qr/...)
 * 3. Inline attachment Resend (cid:) — Gmail-friendly tanpa localhost
 */
export async function resolveCheckInQrEmailAssets(
  checkInCode: string,
): Promise<CheckInQrEmailAssets | null> {
  const token = checkInCode.trim();
  if (!token) return null;

  const qrBuffer = await generateCheckInQrBuffer(token);

  const cloudinaryUrl = await tryUploadCheckInQrToCloudinary(qrBuffer, token);
  if (cloudinaryUrl) {
    return { qrBuffer, imageSrc: cloudinaryUrl, inlineAttachment: false };
  }

  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (appUrl && isPublicAppUrl(appUrl)) {
    return {
      qrBuffer,
      imageSrc: `${appUrl}/api/public/check-in/qr/${encodeURIComponent(token)}`,
      inlineAttachment: false,
    };
  }

  return {
    qrBuffer,
    imageSrc: `cid:${CHECK_IN_QR_CID}`,
    inlineAttachment: true,
  };
}

export function buildCheckInQrEmailBlock(checkInCode: string, imageSrc: string): string {
  return `<div style="margin-top:24px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;text-align:center;">
<p style="margin:0 0 12px;font-weight:600;">QR Check-in</p>
<img src="${imageSrc}" alt="QR Check-in" width="200" height="200" style="display:block;margin:0 auto;" />
<p style="margin:12px 0 0;font-size:14px;color:#475569;">Tunjukkan QR ini saat datang ke restoran.</p>
<p style="margin:8px 0 0;font-family:monospace;font-size:16px;letter-spacing:0.05em;"><strong>${checkInCode}</strong></p>
</div>`;
}
