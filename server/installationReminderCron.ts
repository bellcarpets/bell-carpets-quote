/**
 * installationReminderCron.ts
 * Runs daily at 4pm AEST and sends a day-before reminder SMS for quotes
 * with an installation scheduled for tomorrow (Australia/Brisbane timezone).
 *
 * Logic:
 * - Only considers quotes with jobStatus = "scheduled"
 * - Matches quotes where scheduledDate falls on tomorrow in AEST
 * - Sends ONE SMS per quote (uses installationReminderSentAt for deduplication)
 * - Two message variants depending on whether quoteConfig.addons includes a furniture move
 * - Skips test quotes (isTest = 1)
 * - Skips quotes with no phone number
 *
 * Phone priority: quote.agentPhone → quote.acceptedAgentPhone
 * Name: first name from config.client.name
 * Address: config.property.fullAddress || config.property.address
 */
import { getDb } from "./db";
import { quotes } from "../drizzle/schema";
import { and, eq, isNull, lte, gte, isNotNull } from "drizzle-orm";
import { sendSms, normaliseAuPhone } from "./smsHelper";
import { logNotification } from "./notificationLog";
import type { QuoteConfigData } from "../shared/quoteConfigTypes";

/**
 * Returns the UTC Date window corresponding to [start of tomorrow, end of tomorrow]
 * in the Australia/Brisbane timezone (UTC+10, no DST).
 */
function getTomorrowWindowBrisbane(): { windowStart: Date; windowEnd: Date } {
  // Get tomorrow's date string in Brisbane time (en-CA gives YYYY-MM-DD)
  const tomorrowInBrisbane = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateStr = tomorrowInBrisbane.toLocaleDateString("en-CA", {
    timeZone: "Australia/Brisbane",
  });
  // Construct UTC boundaries for 00:00:00 and 23:59:59 AEST (UTC+10)
  const windowStart = new Date(`${dateStr}T00:00:00.000+10:00`);
  const windowEnd = new Date(`${dateStr}T23:59:59.999+10:00`);
  return { windowStart, windowEnd };
}

export async function checkAndSendInstallationReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { windowStart, windowEnd } = getTomorrowWindowBrisbane();

  try {
    const candidateQuotes = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.jobStatus, "scheduled"),
          isNotNull(quotes.scheduledDate),
          gte(quotes.scheduledDate, windowStart),
          lte(quotes.scheduledDate, windowEnd),
          isNull(quotes.installationReminderSentAt),
          eq(quotes.isTest, 0)
        )
      );

    if (candidateQuotes.length === 0) return;

    console.log(`[InstReminder] Found ${candidateQuotes.length} quote(s) with installations tomorrow`);

    for (const quote of candidateQuotes) {
      let firstName = "there";
      let propertyAddress = "";
      let hasFurnitureMove = false;

      try {
        const config = JSON.parse(quote.configJson) as QuoteConfigData;
        const fullName = config.client?.name || "";
        firstName = fullName.split(" ")[0] || "there";
        propertyAddress =
          config.property?.fullAddress ||
          config.property?.address ||
          "";

        // Check for furniture move addon
        if (config.addons && Array.isArray(config.addons)) {
          hasFurnitureMove = config.addons.some(
            (a) => a.title.toLowerCase().includes("furniture")
          );
        }
      } catch {}

      // Phone priority: agentPhone → acceptedAgentPhone
      const phone = quote.agentPhone || quote.acceptedAgentPhone || "";

      if (!phone) {
        console.log(`[InstReminder] Skipping ${quote.quoteNumber} — no phone number`);
        continue;
      }

      const normPhone = normaliseAuPhone(phone);
      if (!normPhone) {
        console.log(`[InstReminder] Skipping ${quote.quoteNumber} — invalid phone: ${phone}`);
        continue;
      }

      const smsBody = hasFurnitureMove
        ? `Hi ${firstName}, just a reminder your flooring installation at ${propertyAddress} is scheduled for tomorrow. Our team will take care of the furniture — just make sure any breakables are packed away and bed frames are disassembled. If you have any questions, call us on 07 5571 1177. Cheers, Bell Carpets`
        : `Hi ${firstName}, just a reminder your flooring installation at ${propertyAddress} is scheduled for tomorrow. Please make sure the area is cleared of furniture and accessible. If you have any questions, call us on 07 5571 1177. Cheers, Bell Carpets`;

      const sent = await sendSms(normPhone, smsBody);

      logNotification({
        quoteNumber: quote.quoteNumber,
        statusTrigger: "installation_reminder_sms",
        channel: "sms",
        recipientName: firstName,
        recipientPhone: normPhone,
        success: sent,
        errorMessage: sent ? undefined : "Installation reminder SMS failed",
      });

      if (sent) {
        await db
          .update(quotes)
          .set({ installationReminderSentAt: new Date() })
          .where(eq(quotes.id, quote.id));
        console.log(
          `[InstReminder] Sent reminder SMS to ${normPhone} for ${quote.quoteNumber} (furniture: ${hasFurnitureMove})`
        );
      } else {
        console.error(`[InstReminder] Failed to send SMS for ${quote.quoteNumber}`);
      }
    }
  } catch (err) {
    console.error("[InstReminder] Error checking installation reminders:", err);
  }
}

export function startInstallationReminderCron(): void {
  // Run every hour; only fires the job when the hour is 16 (4pm AEST / 06:00 UTC)
  setInterval(() => {
    const hourAest = parseInt(
      new Date().toLocaleString("en-US", {
        timeZone: "Australia/Brisbane",
        hour: "2-digit",
        hour12: false,
      })
    );
    if (hourAest === 16) {
      checkAndSendInstallationReminders();
    }
  }, 60 * 60 * 1000);

  // Fire immediately if it happens to be 4pm AEST right now
  const hourAest = parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: "Australia/Brisbane",
      hour: "2-digit",
      hour12: false,
    })
  );
  if (hourAest === 16) {
    checkAndSendInstallationReminders();
  }

  console.log("[InstReminder] Cron started — checking every hour, fires at 4pm AEST for tomorrow's installations");
}
