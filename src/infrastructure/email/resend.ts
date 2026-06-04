import { Resend } from "resend";
import { getResendConfig } from "@/config/env";

export const RESEND_CONFIG_WARNING =
  "Email tidak dikirim karena konfigurasi Resend belum lengkap (RESEND_API_KEY, RESEND_FROM_EMAIL).";

export type EmailSendResult =
  | { sent: true }
  | { sent: false; warning: string };

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  const config = getResendConfig();
  if (!config) {
    console.warn(RESEND_CONFIG_WARNING);
    return { sent: false, warning: RESEND_CONFIG_WARNING };
  }

  try {
    const resend = new Resend(config.apiKey);
    const result = await resend.emails.send({
      from: config.fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      console.warn("[resend] send failed:", result.error.message);
      return {
        sent: false,
        warning: "Email tidak terkirim karena kendala layanan Resend.",
      };
    }

    return { sent: true };
  } catch (error) {
    console.warn("[resend] send error:", error);
    return {
      sent: false,
      warning: "Email tidak terkirim karena kendala layanan Resend.",
    };
  }
}
