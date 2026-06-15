import nodemailer from "nodemailer";

/**
 * Creates a Nodemailer transporter from environment variables.
 * Set these in your project secrets:
 *   SMTP_HOST     - e.g. smtp.gmail.com
 *   SMTP_PORT     - e.g. 587
 *   SMTP_USER     - your email address
 *   SMTP_PASS     - your app password or SMTP password
 *   SMTP_FROM     - display name + address, e.g. "Bell Carpets <quotes@bellcarpets.com.au>"
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; error?: string; preview?: string }> {
  const transporter = createTransporter();

  if (!transporter) {
    // SMTP not configured — return a preview URL using Ethereal for testing
    // In production, this means email credentials haven't been set yet
    return {
      success: false,
      error: "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in project secrets.",
    };
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html: html ?? text });
    return { success: true, preview: nodemailer.getTestMessageUrl(info) || undefined };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
