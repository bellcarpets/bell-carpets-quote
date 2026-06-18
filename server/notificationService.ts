/**
 * notificationService.ts
 * Centralized notification system for all Bell Carpets CRM status changes.
 * Clean white email templates — consistent with the quote link email style.
 * Manual SMS templates are handled client-side via sms: URI (Leon's phone).
 */

import { logNotification } from "./notificationLog";
import type { QuoteType } from "../shared/quoteConfigTypes";
import { usesAgentPaymentTerms } from "../shared/quoteConfigTypes";
import { formatAESTDateTime } from "../shared/aestUtils";

// ─── Shared email layout helpers ─────────────────────────────────────────

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg";

/**
 * Shared outer wrapper: white card on light grey background.
 * Matches the quote-link email style exactly.
 * @param title   Email <title> tag content
 * @param body    Inner HTML to inject between header and footer
 */
function buildEmail(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr><td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #e8e8e8;">
          <img src="${LOGO_URL}" alt="Bell Carpets" style="width:200px;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:48px 48px 40px;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 48px;text-align:center;background:#ffffff;border-top:1px solid #e8e8e8;">
          <img src="${LOGO_URL}" alt="Bell Carpets" style="height:30px;display:block;margin:0 auto 12px;" />
          <p style="margin:0;font-size:11px;color:#999;font-family:Arial,sans-serif;line-height:1.6;">
            Bell Spec Pty Ltd &nbsp;&middot;&nbsp; ABN 74 613 299 773<br />
            Unit 1, 41 Olympic Circuit, Southport QLD 4215
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Renders a detail row in the standard quote-details table style.
 * Matches the label/value layout from the quote-link email.
 */
function detailRow(label: string, value: string, isLast = false): string {
  const border = isLast ? "" : "border-bottom:1px solid #e8e8e8;";
  return `<tr><td style="padding:16px 0;${border}">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">${label}</td>
        <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${value}</td>
      </tr>
    </table>
  </td></tr>`;
}

/**
 * Banking details block — white background, black border, table structure
 * (Outlook-compatible, no div borders).
 */
function bankingBlock(reference: string, headerLabel = "Banking Details"): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;margin:28px 0;">
    <tr><td style="padding:20px 24px;border-bottom:1px solid #e8e8e8;background:#f9f9f9;">
      <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;color:#999;">${headerLabel}</p>
    </td></tr>
    <tr><td style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;">
        <tr>
          <td style="color:#999;padding:4px 0;width:130px;">Account Name</td>
          <td style="color:#111;font-weight:600;padding:4px 0;">Bell Spec Pty Ltd</td>
        </tr>
        <tr>
          <td style="color:#999;padding:4px 0;">BSB</td>
          <td style="color:#111;font-weight:600;padding:4px 0;">124 022</td>
        </tr>
        <tr>
          <td style="color:#999;padding:4px 0;">Account Number</td>
          <td style="color:#111;font-weight:600;padding:4px 0;">22496442</td>
        </tr>
        <tr>
          <td style="color:#999;padding:4px 0;">Reference</td>
          <td style="color:#111;font-weight:600;padding:4px 0;">${reference}</td>
        </tr>
      </table>
    </td></tr>
  </table>`;
}

// ─── Email Template Builders ──────────────────────────────────────────

function buildAcceptanceEmail(params: {
  recipientName: string;
  quoteNumber: string;
  invoiceNumber?: string;
  propertyAddress: string;
  quoteType: QuoteType;
  depositAmount?: number;
  totalAmount?: number;
  depositPercent?: number;
  rooms?: { id: string; name: string; price: number }[];
}): string {
  const formatPrice = (n?: number) => (n != null && n > 0) ? "$" + n.toLocaleString("en-AU") : "$0";
  const ref = params.invoiceNumber ?? params.quoteNumber;

  if (!usesAgentPaymentTerms(params.quoteType)) {
    // Homeowner variant: deposit banking details included
    const body = `
      <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
        Dear ${params.recipientName},
      </p>

      <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
        Quote accepted.
      </h1>

      <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
        Thank you for accepting your quote for <strong style="color:#111;">${params.propertyAddress}</strong>.
        To secure your installation, a <strong style="color:#111;">${params.depositPercent ?? 50}% deposit</strong>
        of <strong style="color:#111;">${formatPrice(params.depositAmount)}</strong> is required.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
        ${detailRow("Quote", params.quoteNumber)}
        ${detailRow("Property", params.propertyAddress)}
        ${detailRow("Deposit Due", formatPrice(params.depositAmount), true)}
      </table>

      ${bankingBlock(ref)}

      <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">
        Once we receive your deposit, we'll be in touch to schedule your installation.
        If you have any questions, please reply to this email.
      </p>`;

    return buildEmail("Quote Accepted — Bell Carpets", body);
  } else {
    // Agent variant: no deposit details
    const body = `
      <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
        Dear ${params.recipientName},
      </p>

      <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
        Quote accepted.
      </h1>

      <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
        Thank you for accepting quote <strong style="color:#111;">${params.quoteNumber}</strong>
        for <strong style="color:#111;">${params.propertyAddress}</strong>.
        We'll be in touch shortly to schedule the installation.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
        ${detailRow("Quote", params.quoteNumber)}
        ${detailRow("Property", params.propertyAddress, true)}
      </table>

      <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">
        If you have any questions, please reply to this email.
      </p>`;

    return buildEmail("Quote Accepted — Bell Carpets", body);
  }
}

function buildDepositPaidEmail(params: {
  recipientName: string;
  quoteNumber: string;
  invoiceNumber?: string;
  propertyAddress: string;
  depositAmount?: number;
  remainingBalance?: number;
  quoteType: QuoteType;
  rooms?: { id: string; name: string; price: number }[];
  totalAmount?: number;
}): string {
  const formatPrice = (n?: number) => n ? "$" + n.toLocaleString("en-AU") : "";
  const ref = params.invoiceNumber ?? params.quoteNumber;

  const remainingSection = (!usesAgentPaymentTerms(params.quoteType) && params.remainingBalance)
    ? `<p style="color:#666;font-size:13px;line-height:1.7;margin:0 0 8px;font-family:Arial,sans-serif;">
        The remaining balance of <strong style="color:#111;">${formatPrice(params.remainingBalance)}</strong>
        will be due upon completion of your installation.
      </p>
      ${bankingBlock(ref, "Banking Details for Remaining Balance")}`
    : "";

  const body = `
    <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
      Dear ${params.recipientName},
    </p>

    <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
      Deposit received.
    </h1>

    <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
      Thank you — we've received your deposit for <strong style="color:#111;">${params.quoteNumber}</strong>.
      Your installation date is now secured and we'll be in touch shortly to confirm the exact date and time.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
      ${detailRow("Quote", params.quoteNumber)}
      ${detailRow("Property", params.propertyAddress)}
      ${params.depositAmount ? detailRow("Deposit Received", formatPrice(params.depositAmount)) : ""}
      ${params.remainingBalance ? detailRow("Remaining Balance", formatPrice(params.remainingBalance), true) : detailRow("Property", params.propertyAddress, true).replace(detailRow("Property", params.propertyAddress), "")}
    </table>

    ${remainingSection}

    <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">
      If you have any questions, please reply to this email.
    </p>`;

  return buildEmail("Deposit Received — Bell Carpets", body);
}

function buildScheduledEmail(params: {
  recipientName: string;
  quoteNumber: string;
  propertyAddress: string;
  scheduledDate: Date;
}): string {
  const dateStr = formatAESTDateTime(params.scheduledDate, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });

  const body = `
    <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
      Dear ${params.recipientName},
    </p>

    <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
      Installation scheduled.
    </h1>

    <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
      Your installation for <strong style="color:#111;">${params.quoteNumber}</strong>
      at <strong style="color:#111;">${params.propertyAddress}</strong> has been confirmed.
      Please ensure access is available on the day.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
      ${detailRow("Quote", params.quoteNumber)}
      ${detailRow("Property", params.propertyAddress)}
      ${detailRow("Installation Date", `<strong style="color:#111;">${dateStr}</strong>`, true)}
    </table>

    <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">
      If you need to reschedule or have any questions, please reply to this email as soon as possible.
    </p>`;

  return buildEmail("Installation Scheduled — Bell Carpets", body);
}

function buildCompletedEmail(params: {
  recipientName: string;
  quoteNumber: string;
  invoiceNumber: string;
  propertyAddress: string;
  balanceAmount?: number;
  quoteType: QuoteType;
}): string {
  const formatPrice = (n?: number) => n ? "$" + n.toLocaleString("en-AU") : "";

  const isHomeowner = !usesAgentPaymentTerms(params.quoteType);
  const balanceText = params.balanceAmount
    ? isHomeowner
      ? `The remaining balance of <strong style="color:#111;">${formatPrice(params.balanceAmount)}</strong> is now due.`
      : `The full amount of <strong style="color:#111;">${formatPrice(params.balanceAmount)}</strong> is now due.`
    : "";

  const bankingSection = isHomeowner
    ? bankingBlock(params.quoteNumber)
    : "";

  const body = `
    <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
      Dear ${params.recipientName},
    </p>

    <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
      Installation complete.
    </h1>

    <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
      Your installation at <strong style="color:#111;">${params.propertyAddress}</strong> is complete.
      ${balanceText}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
      ${detailRow("Quote", params.quoteNumber)}
      ${detailRow("Invoice", params.invoiceNumber)}
      ${detailRow("Property", params.propertyAddress, !params.balanceAmount)}
      ${params.balanceAmount ? detailRow("Amount Due", formatPrice(params.balanceAmount), true) : ""}
    </table>

    ${bankingSection}

    <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">
      Please find your invoice attached. If you have any questions, reply to this email.
    </p>`;

  return buildEmail("Installation Complete — Bell Carpets", body);
}

function buildPaidInFullEmail(params: {
  recipientName: string;
  quoteNumber: string;
  propertyAddress: string;
  invoiceNumber: string;
}): string {
  const body = `
    <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
      Dear ${params.recipientName},
    </p>

    <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
      Payment received.
    </h1>

    <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
      Thank you — we've received your final payment for
      <strong style="color:#111;">${params.quoteNumber}</strong>.
      Everything is now settled. We hope you're enjoying your new floors.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
      ${detailRow("Quote", params.quoteNumber)}
      ${detailRow("Invoice", params.invoiceNumber)}
      ${detailRow("Property", params.propertyAddress, true)}
    </table>

    <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">
      Thanks again for choosing Bell Carpets.
    </p>`;

  return buildEmail("Payment Received — Bell Carpets", body);
}

// ─── Email Senders ──────────────────────────────────────────────────

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  attachment?: { content: string; filename: string }
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[Notification] RESEND_API_KEY not configured — skipping email");
    return false;
  }

  try {
    const body: Record<string, unknown> = {
      from: "Bell Carpets <quotes@bellcarpets.com.au>",
      reply_to: "hello@bellcarpets.com.au",
      to: [to],
      bcc: ["hello@bellcarpets.com.au"],
      subject,
      html,
    };
    if (attachment) {
      body.attachments = [{ content: attachment.content, filename: attachment.filename }];
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Notification] Email send failed to ${to}:`, response.status, err);
      return false;
    }

    console.log(`[Notification] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[Notification] Email error to ${to}:`, error);
    return false;
  }
}

// ─── Public Notification Functions ──────────────────────────────────

export async function notifyQuoteAccepted(params: {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  quoteNumber: string;
  invoiceNumber?: string;
  propertyAddress: string;
  quoteType: QuoteType;
  depositAmount?: number;
  totalAmount?: number;
  depositPercent?: number;
  rooms?: { id: string; name: string; price: number }[];
  pdfAttachment?: { content: string; filename: string };
}): Promise<void> {
  if (params.recipientEmail) {
    const html = buildAcceptanceEmail({
      recipientName: params.recipientName,
      quoteNumber: params.quoteNumber,
      invoiceNumber: params.invoiceNumber,
      propertyAddress: params.propertyAddress,
      quoteType: params.quoteType,
      depositAmount: params.depositAmount,
      totalAmount: params.totalAmount,
      depositPercent: params.depositPercent,
      rooms: params.rooms,
    });
    sendEmailViaResend(params.recipientEmail, `Quote accepted — Bell Carpets`, html, params.pdfAttachment)
      .then((ok) => logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "accepted", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: ok, errorMessage: ok ? undefined : "Email send failed" }))
      .catch((err) => { console.error("[Notification] notifyQuoteAccepted email error:", err); logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "accepted", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: false, errorMessage: String(err) }); });
  }
}

export async function notifyDepositPaid(params: {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  quoteNumber: string;
  invoiceNumber?: string;
  propertyAddress: string;
  depositAmount?: number;
  remainingBalance?: number;
  quoteType: QuoteType;
  rooms?: { id: string; name: string; price: number }[];
  totalAmount?: number;
}): Promise<void> {
  if (params.recipientEmail) {
    const html = buildDepositPaidEmail({
      recipientName: params.recipientName,
      quoteNumber: params.quoteNumber,
      invoiceNumber: params.invoiceNumber,
      propertyAddress: params.propertyAddress,
      depositAmount: params.depositAmount,
      remainingBalance: params.remainingBalance,
      quoteType: params.quoteType,
      rooms: params.rooms,
      totalAmount: params.totalAmount,
    });
    sendEmailViaResend(params.recipientEmail, `Deposit received — Bell Carpets`, html)
      .then((ok) => logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "deposit_paid", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: ok, errorMessage: ok ? undefined : "Email send failed" }))
      .catch((err) => { console.error("[Notification] notifyDepositPaid email error:", err); logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "deposit_paid", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: false, errorMessage: String(err) }); });
  }
}

export async function notifyScheduled(params: {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  quoteNumber: string;
  propertyAddress: string;
  scheduledDate: Date;
}): Promise<void> {
  if (params.recipientEmail) {
    const html = buildScheduledEmail({
      recipientName: params.recipientName,
      quoteNumber: params.quoteNumber,
      propertyAddress: params.propertyAddress,
      scheduledDate: params.scheduledDate,
    });
    sendEmailViaResend(params.recipientEmail, `Installation scheduled — Bell Carpets`, html)
      .then((ok) => logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "scheduled", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: ok, errorMessage: ok ? undefined : "Email send failed" }))
      .catch((err) => { console.error("[Notification] notifyScheduled email error:", err); logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "scheduled", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: false, errorMessage: String(err) }); });
  }
}

export async function notifyCompleted(params: {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  quoteNumber: string;
  invoiceNumber: string;
  propertyAddress: string;
  balanceAmount?: number;
  quoteType: QuoteType;
  invoicePdfUrl?: string;
}): Promise<void> {
  if (params.recipientEmail) {
    const html = buildCompletedEmail({
      recipientName: params.recipientName,
      quoteNumber: params.quoteNumber,
      invoiceNumber: params.invoiceNumber,
      propertyAddress: params.propertyAddress,
      balanceAmount: params.balanceAmount,
      quoteType: params.quoteType,
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("[Notification] RESEND_API_KEY not configured — skipping completed email");
      return;
    }

    const emailBody: Record<string, unknown> = {
      from: "Bell Carpets <quotes@bellcarpets.com.au>",
      reply_to: "hello@bellcarpets.com.au",
      to: [params.recipientEmail],
      bcc: ["hello@bellcarpets.com.au"],
      subject: `Installation complete — Bell Carpets`,
      html,
    };

    if (params.invoicePdfUrl) {
      emailBody.attachments = [{
        filename: `${params.quoteNumber}.pdf`,
        path: params.invoicePdfUrl,
      }];
    }

    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    })
      .then(async (res) => {
        const ok = res.ok;
        if (!ok) {
          const errText = await res.text();
          console.error(`[Notification] Completed email failed to ${params.recipientEmail}:`, res.status, errText);
        } else {
          console.log(`[Notification] Completed email sent to ${params.recipientEmail}${params.invoicePdfUrl ? " (with PDF attachment)" : ""}`);
        }
        return ok;
      })
      .then((ok) => logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "completed", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: ok, errorMessage: ok ? undefined : "Email send failed" }))
      .catch((err) => { console.error("[Notification] notifyCompleted email error:", err); logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "completed", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: false, errorMessage: String(err) }); });
  }
}

export async function notifyPaidInFull(params: {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  quoteNumber: string;
  propertyAddress: string;
  invoiceNumber: string;
}): Promise<void> {
  if (params.recipientEmail) {
    const html = buildPaidInFullEmail({
      recipientName: params.recipientName,
      quoteNumber: params.quoteNumber,
      propertyAddress: params.propertyAddress,
      invoiceNumber: params.invoiceNumber,
    });
    sendEmailViaResend(params.recipientEmail, `Payment received — Bell Carpets`, html)
      .then((ok) => logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "paid_in_full", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: ok, errorMessage: ok ? undefined : "Email send failed" }))
      .catch((err) => { console.error("[Notification] notifyPaidInFull email error:", err); logNotification({ quoteNumber: params.quoteNumber, statusTrigger: "paid_in_full", channel: "email", recipientEmail: params.recipientEmail, recipientName: params.recipientName, success: false, errorMessage: String(err) }); });
  }
}

// ─── Review Request ───────────────────────────────────────────────

const GOOGLE_REVIEW_URL = "https://g.page/r/CZzFMN2h-KXBEAI/review";

function buildReviewRequestEmail(params: {
  firstName: string;
  quoteNumber: string;
  propertyAddress: string;
}): string {
  const body = `
    <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
      Dear ${params.firstName},
    </p>

    <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
      Hope you're loving the new floors.
    </h1>

    <p style="color:#666;font-size:13px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.7;">
      We're a small family business and reviews mean the world to us. If you have a moment
      to share your experience on Google, we'd love to take <strong style="color:#111;">$100 off your final balance</strong>
      as a thank you.
    </p>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td>
        <a href="${GOOGLE_REVIEW_URL}" target="_blank"
           style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:16px 40px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;border-radius:4px;">
          Leave a Google Review
        </a>
      </td></tr>
    </table>

    <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;border-top:1px solid #e8e8e8;padding-top:32px;">
      Just let us know once it's done and we'll apply the credit. No rush — and thanks again for choosing Bell Carpets.
    </p>`;

  return buildEmail("A small thank you from Bell Carpets", body);
}

export function buildReviewRequestSms(firstName: string): string {
  return `Hi ${firstName}, it's Leon from Bell Carpets. Hope you're loving the new floors!\n\nWe're a small family business and reviews mean the world to us. If you have a moment to share your experience on Google, we'd love to take $100 off your final balance as a thank you.\n\n${GOOGLE_REVIEW_URL}\n\nJust let us know once it's done and we'll apply the credit. No rush — but we really appreciate it!\n\nCheers,\nLeon`;
}

export async function notifyReviewRequest(params: {
  firstName: string;
  recipientEmail: string;
  recipientPhone: string;
  quoteNumber: string;
  propertyAddress: string;
}): Promise<{ emailSent: boolean; smsSent: boolean }> {
  let emailSent = false;
  let smsSent = false;

  if (params.recipientEmail) {
    const html = buildReviewRequestEmail({
      firstName: params.firstName,
      quoteNumber: params.quoteNumber,
      propertyAddress: params.propertyAddress,
    });
    emailSent = await sendEmailViaResend(
      params.recipientEmail,
      "A small thank you from Bell Carpets",
      html
    );
    logNotification({
      quoteNumber: params.quoteNumber,
      statusTrigger: "review_request",
      channel: "email",
      recipientEmail: params.recipientEmail,
      recipientName: params.firstName,
      success: emailSent,
      errorMessage: emailSent ? undefined : "Email send failed",
    });
  }

  if (params.recipientPhone) {
    const { sendSms, normaliseAuPhone } = await import("./smsHelper");
    const normPhone = normaliseAuPhone(params.recipientPhone);
    if (normPhone) {
      const smsBody = buildReviewRequestSms(params.firstName);
      smsSent = await sendSms(normPhone, smsBody);
      logNotification({
        quoteNumber: params.quoteNumber,
        statusTrigger: "review_request",
        channel: "sms",
        recipientPhone: params.recipientPhone,
        recipientName: params.firstName,
        success: smsSent,
        errorMessage: smsSent ? undefined : "SMS send failed",
      });
    }
  }

  return { emailSent, smsSent };
}
