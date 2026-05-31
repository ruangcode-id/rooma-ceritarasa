import { Resend } from "resend";

const EMAIL_CONFIG_WARNING =
  "Email tidak dikirim karena konfigurasi Resend belum lengkap.";

type CareerApplicationEmailPayload = {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  coverLetter: string | null;
  cvUrl: string;
  status: string;
  appliedAt: string;
};

type EmailSendResult =
  | { sent: true }
  | { sent: false; warning: string };

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const adminEmail = process.env.CAREER_ADMIN_EMAIL;

  if (!apiKey || !fromEmail || !adminEmail) {
    return null;
  }

  return { apiKey, fromEmail, adminEmail };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAppliedAt(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function textOrDash(value: string | null) {
  return value && value.trim().length > 0 ? value : "-";
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  const config = getEmailConfig();

  if (!config) {
    console.warn(EMAIL_CONFIG_WARNING);
    return { sent: false, warning: EMAIL_CONFIG_WARNING };
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
      console.warn("Resend email failed:", result.error.message);
      return {
        sent: false,
        warning: "Email tidak terkirim karena terjadi kendala pada layanan email.",
      };
    }

    return { sent: true };
  } catch (error) {
    console.warn("Resend email failed:", error);
    return {
      sent: false,
      warning: "Email tidak terkirim karena terjadi kendala pada layanan email.",
    };
  }
}

export async function sendApplicationConfirmation(
  application: CareerApplicationEmailPayload,
) {
  const applicantName = escapeHtml(application.applicantName);
  const jobTitle = escapeHtml(application.jobTitle);

  return sendEmail({
    to: application.applicantEmail,
    subject: `Lamaran diterima - ${application.jobTitle}`,
    html: `
      <p>Halo ${applicantName},</p>
      <p>Terima kasih sudah mengirim lamaran untuk posisi <strong>${jobTitle}</strong>.</p>
      <p>Tim kami akan meninjau lamaran Anda dan menghubungi Anda jika ada tahapan berikutnya.</p>
      <p>Salam,<br/>Rooma Cerita Rasa</p>
    `,
  });
}

export async function notifyAdminNewApplication(
  application: CareerApplicationEmailPayload,
) {
  const config = getEmailConfig();

  if (!config) {
    console.warn(EMAIL_CONFIG_WARNING);
    return { sent: false as const, warning: EMAIL_CONFIG_WARNING };
  }

  return sendEmail({
    to: config.adminEmail,
    subject: `Lamaran baru - ${application.jobTitle}`,
    html: `
      <p>Ada lamaran baru untuk posisi <strong>${escapeHtml(application.jobTitle)}</strong>.</p>
      <ul>
        <li>Nama: ${escapeHtml(application.applicantName)}</li>
        <li>Email: ${escapeHtml(application.applicantEmail)}</li>
        <li>Telepon: ${escapeHtml(application.applicantPhone)}</li>
        <li>Status: ${escapeHtml(application.status)}</li>
        <li>Waktu apply: ${escapeHtml(formatAppliedAt(application.appliedAt))}</li>
      </ul>
      <p>Cover letter:</p>
      <p>${escapeHtml(textOrDash(application.coverLetter))}</p>
      <p>CV: <a href="${escapeHtml(application.cvUrl)}">Lihat CV</a></p>
    `,
  });
}

export { EMAIL_CONFIG_WARNING };
