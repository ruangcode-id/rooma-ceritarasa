import { getCareerAdminEmail } from "@/config/env";
import {
  sendTransactionalEmail,
  RESEND_CONFIG_WARNING,
} from "@/infrastructure/email/resend";
import { sendEmailFromTemplate } from "@/infrastructure/notifications/guest-notification.service";

export { RESEND_CONFIG_WARNING as EMAIL_CONFIG_WARNING };

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAppliedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function textOrDash(value: string | null) {
  return value && value.trim().length > 0 ? value : "-";
}

export async function sendApplicationConfirmation(
  application: CareerApplicationEmailPayload,
): Promise<EmailSendResult> {
  const vars = {
    nama: application.applicantName,
    posisi: application.jobTitle,
    email: application.applicantEmail,
  };

  const fromTemplate = await sendEmailFromTemplate(
    application.applicantEmail,
    "career_apply_konfirmasi",
    `Application Received - ${application.jobTitle}`,
    vars,
  );

  if (fromTemplate.sent) {
    return fromTemplate;
  }

  const applicantName = escapeHtml(application.applicantName);
  const jobTitle = escapeHtml(application.jobTitle);

  return sendTransactionalEmail({
    to: application.applicantEmail,
    subject: `Application Received - ${application.jobTitle}`,
    html: `
      <p>Hello ${applicantName},</p>
      <p>Thank you for submitting your application for the position of <strong>${jobTitle}</strong>.</p>
      <p>Our team will review your application and contact you if there are next steps.</p>
      <p>Best regards,<br/>Rooma Ceritarasa</p>
    `,
  });
}

export async function notifyAdminNewApplication(
  application: CareerApplicationEmailPayload,
): Promise<EmailSendResult> {
  const adminEmail = getCareerAdminEmail();
  if (!adminEmail) {
    console.warn(RESEND_CONFIG_WARNING);
    return { sent: false, warning: RESEND_CONFIG_WARNING };
  }

  const vars = {
    nama: application.applicantName,
    posisi: application.jobTitle,
    email: application.applicantEmail,
    telepon: application.applicantPhone,
  };

  const fromTemplate = await sendEmailFromTemplate(
    adminEmail,
    "career_admin_notif",
    `New Application - ${application.jobTitle}`,
    vars,
  );

  if (fromTemplate.sent) {
    return fromTemplate;
  }

  return sendTransactionalEmail({
    to: adminEmail,
    subject: `New Application - ${application.jobTitle}`,
    html: `
      <p>There is a new application for the position of <strong>${escapeHtml(application.jobTitle)}</strong>.</p>
      <ul>
        <li>Name: ${escapeHtml(application.applicantName)}</li>
        <li>Email: ${escapeHtml(application.applicantEmail)}</li>
        <li>Phone: ${escapeHtml(application.applicantPhone)}</li>
        <li>Status: ${escapeHtml(application.status)}</li>
        <li>Applied At: ${escapeHtml(formatAppliedAt(application.appliedAt))}</li>
      </ul>
      <p>Cover Letter:</p>
      <p>${escapeHtml(textOrDash(application.coverLetter))}</p>
      <p>CV: <a href="${escapeHtml(application.cvUrl)}">View CV</a></p>
    `,
  });
}
