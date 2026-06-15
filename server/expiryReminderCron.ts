/**
 * expiryReminderCron.ts
 * Runs every hour and sends an SMS to customers whose quote expires in ~2 days.
 *
 * Logic:
 * - Only considers quotes with jobStatus = "draft" or "quote_sent" (open/pending)
 * - Only fires when expiresAt is between 1 day 23 hours and 2 days 1 hour from now
 *   (i.e. the 2-day window, with a 1-hour tolerance to handle hourly cron drift)
 * - Sends ONE SMS per quote (uses expiryReminderSmsSentAt for deduplication)
 * - Skips test quotes (isTest = 1)
 * - Skips quotes with no phone number
 *
 * Message template:
 * "Hey [Name],\n\nYour carpet quote for [address] expires [expiry day e.g. Friday].
 *  After that I'd need to requote at current prices. No dramas either way — just didn't
 *  want you caught off guard. [quote link]\n\nCheers,\nLeon"
 */

import { getDb } from "./db";
import { quotes } from "../drizzle/schema";
import { and, eq, isNull, lte, gte, inArray, isNotNull } from "drizzle-orm";
import { sendSms, normaliseAuPhone } from "./smsHelper";
import { logNotification } from "./notificationLog";
import type { QuoteConfigData } from "../shared/quoteConfigTypes";

const APP_BASE_URL = process.env.APP_URL || "https://quote.bellcarpets.com.au";

// Window: quotes expiring between 47h and 49h from now (centred on 48h / 2 days)
const WINDOW_MIN_HOURS = 47;
const WINDOW_MAX_HOURS = 49;

export async function checkAndSendExpiryReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_MIN_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + WINDOW_MAX_HOURS * 60 * 60 * 1000);

  try {
    const candidateQuotes = await db
      .select()
      .from(quotes)
      .where(
        and(
          inArray(quotes.jobStatus, ["draft", "quote_sent"]),
          isNotNull(quotes.expiresAt),
          gte(quotes.expiresAt, windowStart),
          lte(quotes.expiresAt, windowEnd),
          isNull(quotes.expiryReminderSmsSentAt),
          eq(quotes.isTest, 0)
        )
      );

    if (candidateQuotes.length === 0) return;

    for (const quote of candidateQuotes) {
      // Parse config to get customer name, address, and phone
      let firstName = "there";
      let propertyAddress = "";
      let phone = quote.agentPhone || "";

      try {
        const config = JSON.parse(quote.configJson) as QuoteConfigData;
        const fullName = config.client?.name || "";
        firstName = fullName.split(" ")[0] || "there";
        propertyAddress =
          config.property?.fullAddress ||
          config.property?.address ||
          "";
        // agentPhone on the quote row is the primary phone; config doesn't store phone separately
      } catch {}

      if (!phone) {
        console.log(`[ExpiryReminder] Skipping ${quote.quoteNumber} — no phone number`);
        continue;
      }

      const normPhone = normaliseAuPhone(phone);
      if (!normPhone) {
        console.log(`[ExpiryReminder] Skipping ${quote.quoteNumber} — invalid phone: ${phone}`);
        continue;
      }

      const expiryDay = new Date(quote.expiresAt!).toLocaleDateString("en-AU", {
        weekday: "long",
        timeZone: "Australia/Brisbane",
      });

      const quoteLink = `${APP_BASE_URL}/quote/${quote.slug}`;
      const addressLine = propertyAddress ? ` for ${propertyAddress}` : "";

      const smsBody =
        `Hey ${firstName},\n\nYour carpet quote${addressLine} expires ${expiryDay}. ` +
        `After that I'd need to requote at current prices. No dramas either way — just didn't want you caught off guard. ` +
        `${quoteLink}\n\nCheers,\nLeon`;

      const sent = await sendSms(normPhone, smsBody);

      logNotification({
        quoteNumber: quote.quoteNumber,
        statusTrigger: "expiry_reminder_sms",
        channel: "sms",
        recipientName: firstName,
        success: sent,
        errorMessage: sent ? undefined : "Expiry reminder SMS failed",
      });

      if (sent) {
        await db
          .update(quotes)
          .set({ expiryReminderSmsSentAt: new Date() })
          .where(eq(quotes.id, quote.id));

        console.log(`[ExpiryReminder] Sent expiry reminder SMS to ${normPhone} for ${quote.quoteNumber}`);
      } else {
        console.error(`[ExpiryReminder] Failed to send SMS for ${quote.quoteNumber}`);
      }
    }

    console.log(`[ExpiryReminder] Processed ${candidateQuotes.length} quote(s) for expiry reminders`);
  } catch (err) {
    console.error("[ExpiryReminder] Error checking expiry reminders:", err);
  }
}

export function startExpiryReminderCron(): void {
  // Run immediately on startup, then every hour
  checkAndSendExpiryReminders();
  setInterval(checkAndSendExpiryReminders, 60 * 60 * 1000);
  console.log("[ExpiryReminder] Cron started — checking every hour for quotes expiring in ~2 days");
}
