/**
 * overdueInvoiceCron.ts
 * Runs every hour and sends overdue reminder email + SMS for invoices
 * that are unpaid (or deposit_paid/balance_due) and older than 30 days.
 */

import { getDb } from "./db";
import { invoices, quotes } from "../drizzle/schema";
import { and, eq, isNull, lte, inArray } from "drizzle-orm";
import { sendSms } from "./smsHelper";
import { logNotification } from "./notificationLog";

const LOGO_CDN = "https://quote.bellcarpets.com.au/images/logo.jpg";
const FROM_EMAIL = "Bell Carpets <quotes@bellcarpets.com.au>";
const REPLY_TO_EMAIL = "hello@bellcarpets.com.au";
const RESEND_API_URL = "https://api.resend.com/emails";
// Default fallback if invoice has no paymentTermsDays set
const DEFAULT_OVERDUE_DAYS = 30;

function buildOverdueEmail(data: {
  recipientName: string;
  invoiceNumber: string;
  quoteNumber: string;
  totalAmount: number;
  depositAmount: number;
  paymentStatus: string;
  propertyAddress: string;
  daysOverdue: number;
}): string {
  const formatPrice = (n: number) => "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });
  const amountOwed =
    data.paymentStatus === "deposit_paid"
      ? data.totalAmount - data.depositAmount
      : data.totalAmount;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr>
          <td style="padding:40px 40px 28px;text-align:center;border-bottom:1px solid #e8e8e8;">
            <img src="${LOGO_CDN}" alt="Bell Carpets" width="160" style="width:160px;max-width:160px;display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Overdue Banner -->
        <tr>
          <td style="background:#fff5f5;border-left:3px solid #ef4444;padding:14px 40px;">
            <p style="color:#cc2222;font-size:13px;margin:0;font-family:Arial,sans-serif;font-weight:600;">
              Payment Overdue — ${data.daysOverdue} day${data.daysOverdue !== 1 ? "s" : ""} past due
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="color:#111111;font-size:22px;font-weight:600;margin:0 0 20px;font-family:Arial,sans-serif;">Payment Reminder</h1>
            <p style="color:#333333;font-size:14px;margin:0 0 6px;font-family:Arial,sans-serif;">Dear ${data.recipientName},</p>
            <p style="color:#333333;font-size:14px;margin:0 0 24px;line-height:1.7;font-family:Arial,sans-serif;">
              This is a friendly reminder that payment for your Bell Carpets installation is now overdue.
              Please arrange payment at your earliest convenience.
            </p>

            <!-- Invoice Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111111;margin-bottom:24px;">
              <tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">Reference</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.quoteNumber}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">Property</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;"><a href="x-apple-data-detectors://0" dir="ltr" style="color:#111;text-decoration:none;pointer-events:none;">${data.propertyAddress}</a></td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:12px 0;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">Amount Due</td>
                  <td style="color:#cc2222;font-size:18px;font-family:Arial,sans-serif;font-weight:700;">${formatPrice(amountOwed)}</td>
                </tr></table>
              </td></tr>
            </table>

            <!-- Bank Details -->
            <p style="color:#333333;font-size:14px;font-family:Arial,sans-serif;font-weight:600;margin:0 0 8px;">Payment Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111111;margin-bottom:24px;">
              <tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">ACC NAME</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">Bell Spec Pty Ltd</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">BSB</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">124 022</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">ACC NUMBER</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">22496442</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:12px 0;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">REFERENCE</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.quoteNumber}</td>
                </tr></table>
              </td></tr>
            </table>

            <p style="color:#555555;font-size:13px;margin:0;line-height:1.6;font-family:Arial,sans-serif;">
              If you have already made payment, please disregard this reminder. For any questions, contact us at
              <a href="mailto:hello@bellcarpets.com.au" style="color:#111111;">hello@bellcarpets.com.au</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:32px 48px;text-align:center;background:#ffffff;">
            <img src="https://quote.bellcarpets.com.au/images/logo.jpg" alt="Bell Carpets" width="120" style="width:120px;max-width:120px;display:block;margin:0 auto;" />
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendOverdueEmail(data: {
  recipientName: string;
  recipientEmail: string;
  invoiceNumber: string;
  quoteNumber: string;
  totalAmount: number;
  depositAmount: number;
  paymentStatus: string;
  propertyAddress: string;
  daysOverdue: number;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Overdue] RESEND_API_KEY not set — skipping email");
    return false;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        reply_to: REPLY_TO_EMAIL,
        to: [data.recipientEmail],
        bcc: ["hello@bellcarpets.com.au"],
        subject: `Payment Overdue: ${data.quoteNumber} — Bell Carpets`,
        html: buildOverdueEmail(data),
      }),
    });

    if (res.ok) {
      console.log(
        `[Overdue] Sent reminder to ${data.recipientEmail} for ${data.invoiceNumber} (${data.daysOverdue} days overdue)`
      );
      return true;
    } else {
      const body = await res.text();
      console.error(`[Overdue] Resend error ${res.status}: ${body}`);
      return false;
    }
  } catch (err) {
    console.error("[Overdue] Network error:", err);
    return false;
  }
}

export async function checkAndSendOverdueReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  try {
    // Fetch all unpaid invoices that haven't had an overdue reminder yet.
    // IMPORTANT: Only fire for quotes with jobStatus = 'completed' — never for
    // cancelled, draft, quote_sent, accepted, or any other non-completed status.
    // We check per-invoice paymentTermsDays in JS to support variable terms.
    const candidateRows = await db
      .select({ inv: invoices })
      .from(invoices)
      .innerJoin(quotes, eq(invoices.quoteNumber, quotes.quoteNumber))
      .where(
        and(
          inArray(invoices.paymentStatus, ["unpaid", "deposit_paid", "balance_due"]),
          isNull(invoices.overdueReminderSentAt),
          eq(quotes.jobStatus, "completed")
        )
      );
    const candidateInvoices = candidateRows.map((r) => r.inv);

    // Filter: only include invoices where age >= their own paymentTermsDays
    const overdueInvoices = candidateInvoices.filter((inv) => {
      const terms = inv.paymentTermsDays ?? DEFAULT_OVERDUE_DAYS;
      const ageMs = now.getTime() - new Date(inv.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      return ageDays >= terms;
    });

    if (overdueInvoices.length === 0) return;

    console.log(`[Overdue] Found ${overdueInvoices.length} overdue invoice(s) needing reminders`);

    for (const inv of overdueInvoices) {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send email if recipient has email
      if (inv.recipientEmail) {
        const emailSent = await sendOverdueEmail({
          recipientName: inv.recipientName || "Client",
          recipientEmail: inv.recipientEmail,
          invoiceNumber: inv.invoiceNumber,
          quoteNumber: inv.quoteNumber,
          totalAmount: inv.totalAmount,
          depositAmount: inv.depositAmount,
          paymentStatus: inv.paymentStatus,
          propertyAddress: inv.propertyAddress,
          daysOverdue,
        });

        // Log overdue email send
        logNotification({ quoteNumber: inv.invoiceNumber || "unknown", statusTrigger: "overdue_reminder", channel: "email", recipientEmail: inv.recipientEmail || undefined, recipientName: inv.recipientName || undefined, success: emailSent, errorMessage: emailSent ? undefined : "Overdue email send failed" });
        if (emailSent) {
          await db
            .update(invoices)
            .set({ overdueReminderSentAt: new Date() })
            .where(eq(invoices.id, inv.id));
        }
      }

      // Send SMS if recipient has phone (fire-and-forget)
      if (inv.recipientPhone && !inv.overdueReminderSmsSentAt) {
        const formatPrice = (n: number) => "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });
        const amountOwed =
          inv.paymentStatus === "deposit_paid"
            ? inv.totalAmount - inv.depositAmount
            : inv.totalAmount;

        const smsBody = `Hi ${inv.recipientName || "there"}, this is a friendly reminder from Bell Carpets that your quote ${inv.quoteNumber} (${formatPrice(amountOwed)}) is now overdue. Please arrange payment at your earliest convenience. Ref: ${inv.quoteNumber}. Questions? Email hello@bellcarpets.com.au`;

        sendSms(inv.recipientPhone, smsBody)
          .then(async (smsSent) => {
            logNotification({ quoteNumber: inv.invoiceNumber || "unknown", statusTrigger: "overdue_reminder", channel: "sms", recipientPhone: inv.recipientPhone || undefined, recipientName: inv.recipientName || undefined, success: smsSent, errorMessage: smsSent ? undefined : "Overdue SMS send failed" });
            if (smsSent) {
              const db2 = await getDb();
              if (db2) {
                await db2
                  .update(invoices)
                  .set({ overdueReminderSmsSentAt: new Date() })
                  .where(eq(invoices.id, inv.id));
              }
            }
          })
          .catch((err) => { console.error("[Overdue] SMS error:", err); logNotification({ quoteNumber: inv.invoiceNumber || "unknown", statusTrigger: "overdue_reminder", channel: "sms", recipientPhone: inv.recipientPhone || undefined, recipientName: inv.recipientName || undefined, success: false, errorMessage: String(err) }); });
      }
    }
  } catch (err) {
    console.error("[Overdue] Error checking overdue invoices:", err);
  }
}

export function startOverdueInvoiceCron(): void {
  // Run immediately on startup, then every hour
  checkAndSendOverdueReminders();
  setInterval(checkAndSendOverdueReminders, 60 * 60 * 1000);
  console.log("[Overdue] Cron started — checking every hour for overdue invoices");
}
