/**
 * reminderCron.ts
 * Runs every hour and sends a reminder email to agents whose quotes
 * expire within the next 3 days and haven't received a reminder yet.
 */

import { getDb } from "./db";
import { quotes } from "../drizzle/schema";
import { and, eq, isNull, isNotNull, lte, gte } from "drizzle-orm";
import { sendReminderSms } from "./smsHelper";
import { logNotification } from "./notificationLog";
import { formatAESTDateTime } from "../shared/aestUtils";

const LOGO_CDN = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg";
const FROM_EMAIL = "Bell Carpets <quotes@bellcarpets.com.au>";
const REPLY_TO_EMAIL = "hello@bellcarpets.com.au";
const RESEND_API_URL = "https://api.resend.com/emails";
const APP_BASE_URL =
  process.env.APP_URL || "https://quote.bellcarpets.com.au";

function buildReminderEmail(data: {
  agentName: string;
  agentPropertyManager?: string | null;
  quoteNumber: string;
  slug: string;
  clientName: string;
  propertyAddress: string;
  expiresAt: Date;
  daysLeft: number;
}): string {
  const quoteUrl = `${APP_BASE_URL}/quote/${data.slug}`;
  const expiryStr = formatAESTDateTime(data.expiresAt, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });
  const urgencyColor = data.daysLeft <= 1 ? "#ef4444" : "#f59e0b";
  const urgencyText =
    data.daysLeft <= 1
      ? `⚠️ Expires TOMORROW`
      : `⏰ Expires in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`;

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
            <img src="${LOGO_CDN}" alt="Bell Carpets" width="180" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Urgency Banner -->
        <tr>
          <td style="background:${data.daysLeft <= 1 ? '#fff5f5' : '#fffbf0'};border-left:3px solid ${urgencyColor};padding:14px 40px;">
            <p style="color:${urgencyColor};font-size:13px;margin:0;font-family:Arial,sans-serif;font-weight:600;">${urgencyText} — ${expiryStr}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="color:#111111;font-size:22px;font-weight:600;margin:0 0 20px;font-family:Arial,sans-serif;">Quote Expiry Reminder</h1>
            <p style="color:#333333;font-size:14px;margin:0 0 6px;font-family:Arial,sans-serif;">Dear ${data.agentPropertyManager ? data.agentPropertyManager : data.agentName},</p>
            <p style="color:#333333;font-size:14px;margin:0 0 24px;line-height:1.7;font-family:Arial,sans-serif;">
              This is a friendly reminder that your Bell Carpets quote is expiring soon.
              Please review and accept the quote before it expires to secure your pricing.
            </p>

            <!-- Quote Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111111;margin-bottom:24px;">
              <tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">Quote Number</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.quoteNumber}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">Property</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.propertyAddress}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:12px 0;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#999999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:160px;">Client</td>
                  <td style="color:#111111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.clientName}</td>
                </tr></table>
              </td></tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${quoteUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:1px;padding:16px 40px;text-transform:uppercase;">
                    View &amp; Accept Quote
                  </a>
                </td>
              </tr>
            </table>

            <p style="color:#555555;font-size:13px;margin:0;line-height:1.6;font-family:Arial,sans-serif;">
              If you have already accepted this quote or have any questions, contact us at
              <a href="mailto:hello@bellcarpets.com.au" style="color:#111111;">hello@bellcarpets.com.au</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:32px 48px;text-align:center;background:#ffffff;">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg" alt="Bell Carpets" style="height:30px;display:block;margin:0 auto;" />
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendReminderEmail(data: {
  agentName: string;
  agentEmail: string;
  agentPropertyManager?: string | null;
  quoteNumber: string;
  slug: string;
  clientName: string;
  propertyAddress: string;
  expiresAt: Date;
  daysLeft: number;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Reminder] RESEND_API_KEY not set — skipping email");
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
        to: [data.agentEmail],
        bcc: ["hello@bellcarpets.com.au"],
        subject: `Reminder: Your Bell Carpets quote ${data.quoteNumber} expires in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`,
        html: buildReminderEmail(data),
      }),
    });

    if (res.ok) {
      console.log(
        `[Reminder] Sent to ${data.agentEmail} for ${data.quoteNumber} (${data.daysLeft} days left)`
      );
      return true;
    } else {
      const body = await res.text();
      console.error(`[Reminder] Resend error ${res.status}: ${body}`);
      return false;
    }
  } catch (err) {
    console.error("[Reminder] Network error:", err);
    return false;
  }
}

export async function checkAndSendReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Use UTC for DB comparisons (stored as UTC), but calculate window in AEST context
  const now = new Date();
  // Window: quotes expiring between now and 3 days from now (UTC-based for DB query)
  const windowEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  try {
    // Find quotes that:
    // - are still in quote_sent status (not accepted/declined)
    // - have an expiry date within the next 3 days
    // - have an agent email
    // - have NOT had a reminder sent yet
    const pendingQuotes = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.jobStatus, "quote_sent"),
          isNotNull(quotes.agentEmail),
          isNotNull(quotes.expiresAt),
          lte(quotes.expiresAt, windowEnd),
          gte(quotes.expiresAt, now),
          isNull(quotes.reminderSentAt),
          eq(quotes.isTest, 0)  // Never send reminders for test/sandbox quotes
        )
      );

    if (pendingQuotes.length === 0) return;

    console.log(`[Reminder] Found ${pendingQuotes.length} quote(s) needing reminders`);

    for (const row of pendingQuotes) {
      if (!row.agentEmail || !row.expiresAt) continue;

      const config = JSON.parse(row.configJson);
      const expiresAt = new Date(row.expiresAt);
      const daysLeft = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const sent = await sendReminderEmail({
        agentName: row.agentName || "Agent",
        agentEmail: row.agentEmail,
        agentPropertyManager: row.agentPropertyManager,
        quoteNumber: row.quoteNumber,
        slug: row.slug,
        clientName: config.client?.name || "",
        propertyAddress: config.property?.address || "",
        expiresAt,
        daysLeft,
      });

      // Log reminder email send
      logNotification({ quoteNumber: row.quoteNumber, statusTrigger: "reminder", channel: "email", recipientEmail: row.agentEmail || undefined, recipientName: row.agentName || undefined, success: sent, errorMessage: sent ? undefined : "Reminder email send failed" });
      if (sent) {
        await db
          .update(quotes)
          .set({ reminderSentAt: new Date() })
          .where(eq(quotes.id, row.id));
      }

      // SMS reminder to agent if they have a phone number (fire-and-forget)
      if (row.agentPhone && !row.reminderSmsSentAt) {
        sendReminderSms({
          agentPhone: row.agentPhone,
          agentName: row.agentName || "Agent",
          agentPropertyManager: row.agentPropertyManager,
          quoteNumber: row.quoteNumber,
          slug: row.slug,
          daysLeft,
          propertyAddress: config.property?.fullAddress || config.property?.address || "",
        })
          .then(async (smsSent) => {
            logNotification({ quoteNumber: row.quoteNumber, statusTrigger: "reminder", channel: "sms", recipientPhone: row.agentPhone || undefined, recipientName: row.agentName || undefined, success: smsSent, errorMessage: smsSent ? undefined : "Reminder SMS send failed" });
            if (smsSent) {
              const db2 = await getDb();
              if (db2) {
                await db2.update(quotes).set({ reminderSmsSentAt: new Date() }).where(eq(quotes.id, row.id));
              }
            }
          })
          .catch((err) => { console.error("[Reminder] SMS error:", err); logNotification({ quoteNumber: row.quoteNumber, statusTrigger: "reminder", channel: "sms", recipientPhone: row.agentPhone || undefined, recipientName: row.agentName || undefined, success: false, errorMessage: String(err) }); });
      }
    }
  } catch (err) {
    console.error("[Reminder] Error checking reminders:", err);
  }
}

export function startReminderCron(): void {
  // Run immediately on startup, then every hour
  checkAndSendReminders();
  setInterval(checkAndSendReminders, 60 * 60 * 1000);
  console.log("[Reminder] Cron started — checking every hour for expiring quotes");
}
