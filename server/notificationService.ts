/**
 * notificationService.ts
 * Centralized notification system for all Bell Carpets CRM status changes.
 * Dark + gold premium email templates with minimal, focused content.
 * Manual SMS templates are handled client-side via sms: URI (Leon's phone).
 */

import { logNotification } from "./notificationLog";
import type { QuoteType } from "../shared/quoteConfigTypes";
import { usesAgentPaymentTerms } from "../shared/quoteConfigTypes";
import { formatAESTDateTime } from "../shared/aestUtils";

// ─── Shared email layout helpers ─────────────────────────────────────────

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg";

function emailHeader(): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;">
      <tr><td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111111;">
          <tr><td style="padding:40px 40px 0;text-align:center;">
            <img src="${LOGO_URL}" alt="Bell Carpets" style="width:120px;display:block;margin:0 auto;" />
          </td></tr>
          <tr><td style="padding:32px 40px 0;">`;
}

function emailFooter(): string {
  return `
          </td></tr>
          <tr><td style="padding:40px 40px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="Bell Carpets" style="height:24px;display:block;margin:0 auto;" />
          </td></tr>
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

  if (!usesAgentPaymentTerms(params.quoteType)) {
    // Homeowner variant: has deposit banking details
    return emailHeader() + `
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hi ${params.recipientName},</p>
      <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Thank you for accepting your quote for <strong>${params.propertyAddress}</strong>. To secure your installation, a <strong>${params.depositPercent ?? 50}% deposit</strong> of <strong>${formatPrice(params.depositAmount)}</strong> is required.</p>
      
      <div style="background:#1a1a1a;border-left:3px solid #d4a853;padding:20px;margin:24px 0;border-radius:4px;">
        <p style="color:#d4a853;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px;font-family:Arial,sans-serif;font-weight:600;">Banking Details</p>
        <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Account Name:</strong> Bell Spec Pty Ltd</p>
        <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">BSB:</strong> 124 022</p>
        <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Account Number:</strong> 22496442</p>
        <p style="color:#cccccc;font-size:13px;margin:0;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Reference:</strong> ${params.invoiceNumber ?? params.quoteNumber}</p>
      </div>

      <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Once we receive your deposit, we'll be in touch to schedule your installation.</p>
    ` + emailFooter();
  } else {
    // Agent variant: no deposit details
    return emailHeader() + `
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hi ${params.recipientName},</p>
      <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Thank you for accepting quote <strong>${params.quoteNumber}</strong> for <strong>${params.propertyAddress}</strong>. We'll be in touch shortly to schedule the installation.</p>
    ` + emailFooter();
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

  const bankingBlock = (!usesAgentPaymentTerms(params.quoteType) && params.remainingBalance) ? `
    <div style="background:#1a1a1a;border-left:3px solid #d4a853;padding:20px;margin:24px 0;border-radius:4px;">
      <p style="color:#d4a853;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px;font-family:Arial,sans-serif;font-weight:600;">Banking Details for Remaining Balance</p>
      <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Account Name:</strong> Bell Spec Pty Ltd</p>
      <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">BSB:</strong> 124 022</p>
      <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Account Number:</strong> 22496442</p>
      <p style="color:#cccccc;font-size:13px;margin:0;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Reference:</strong> ${ref}</p>
    </div>` : "";

  return emailHeader() + `
    <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hi ${params.recipientName},</p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Thank you! We've received your deposit for <strong>${params.quoteNumber}</strong>. Your installation date is now secured, and we'll be in touch shortly to confirm the exact date and time.</p>
    ${bankingBlock}
    
  ` + emailFooter();
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

  return emailHeader() + `
    <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hi ${params.recipientName},</p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Your carpet installation for <strong>${params.quoteNumber}</strong> at <strong>${params.propertyAddress}</strong> has been scheduled for <strong>${dateStr}</strong>.</p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Please ensure access is available on the day. If you need to reschedule, let us know as soon as possible.</p>
    
  ` + emailFooter();
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

  const bankingDetails = !usesAgentPaymentTerms(params.quoteType) ? `
    <div style="background:#1a1a1a;border-left:3px solid #d4a853;padding:20px;margin:24px 0;border-radius:4px;">
      <p style="color:#d4a853;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px;font-family:Arial,sans-serif;font-weight:600;">Banking Details</p>
      <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Account Name:</strong> Bell Spec Pty Ltd</p>
      <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">BSB:</strong> 124 022</p>
      <p style="color:#cccccc;font-size:13px;margin:0 0 8px;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Account Number:</strong> 22496442</p>
      <p style="color:#cccccc;font-size:13px;margin:0;font-family:Arial,sans-serif;"><strong style="color:#ffffff;">Reference:</strong> ${params.quoteNumber}</p>
    </div>` : "";

  return emailHeader() + `
    <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hi ${params.recipientName},</p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Your carpet installation at <strong>${params.propertyAddress}</strong> is complete. ${!usesAgentPaymentTerms(params.quoteType) ? `The remaining balance of <strong>${formatPrice(params.balanceAmount)}</strong> is now due.` : `The full amount of <strong>${formatPrice(params.balanceAmount)}</strong> is now due.`}</p>
    ${bankingDetails}
    
  ` + emailFooter();
}

function buildPaidInFullEmail(params: {
  recipientName: string;
  quoteNumber: string;
  propertyAddress: string;
  invoiceNumber: string;
}): string {
  return emailHeader() + `
    <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hi ${params.recipientName},</p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Thank you! We've received your final payment for <strong>${params.quoteNumber}</strong>. Everything is now settled, and we hope you're enjoying your new floors!</p>
    
  ` + emailFooter();
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
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;">
      <tr><td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111111;">
          <tr><td style="padding:40px 40px 0;text-align:center;">
            <img src="${LOGO_URL}" alt="Bell Carpets" style="width:120px;display:block;margin:0 auto;" />
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hi ${params.firstName},</p>
            <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Hope you're loving the new floors! We're a small family business and reviews mean the world to us. If you have a moment to share your experience on Google, we'd love to take <strong style="color:#d4a853;">$100 off your final balance</strong> as a thank you.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${GOOGLE_REVIEW_URL}" target="_blank" style="display:inline-block;background:#d4a853;color:#111111;font-size:14px;font-weight:600;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:0.05em;">Leave a Google Review</a>
            </div>
            <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 24px;font-family:Arial,sans-serif;">Just let us know once it's done and we'll apply the credit. No rush — but we really appreciate it!</p>
            <p style="color:#999999;font-size:12px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">Thanks again for choosing Bell Carpets.</p>
          </td></tr>
          <tr><td style="padding:40px 40px 32px;text-align:center;">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg" alt="Bell Carpets" style="height:24px;display:block;margin:0 auto;" />
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;
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
