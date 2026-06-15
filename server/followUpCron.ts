/**
 * followUpCron.ts
 * Runs every hour and checks for quotes that have been created 72+ hours ago
 * but have NOT been viewed or accepted. Sends an owner notification to Leon
 * so he can follow up manually.
 *
 * Logic:
 * - Only considers quotes with jobStatus = "draft" or "quote_sent" (not yet accepted)
 * - Only considers quotes created >= 72 hours ago and < 7 days ago (avoid spamming for very old quotes)
 * - Checks quoteViews table — if viewCount = 0, the client has not opened it
 * - For viewed-but-not-accepted: only fires if viewCount >= 3 (client has had multiple looks)
 * - Sends ONE notification per quote (uses a "followUpSentAt" field on the quotes table)
 */

import { getDb } from "./db";
import { quotes, quoteViews } from "../drizzle/schema";
import { and, eq, isNull, lte, gte, inArray, sql, ne } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { logNotification } from "./notificationLog";
import type { QuoteConfigData } from "../shared/quoteConfigTypes";

const FOLLOW_UP_AFTER_HOURS = 72;
const MIN_VIEWS_FOR_VIEWED_FOLLOWUP = 3; // Only notify "viewed but not accepted" after 3+ views
const MAX_AGE_DAYS = 7; // Don't send follow-ups for quotes older than 7 days

export async function checkAndSendFollowUpReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - FOLLOW_UP_AFTER_HOURS * 60 * 60 * 1000);
  const maxAgeTime = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  try {
    // Fetch quotes that are still in draft/quote_sent, created > 72h ago, < 7 days ago,
    // and haven't had a follow-up notification sent yet
    const candidateQuotes = await db
      .select()
      .from(quotes)
      .where(
        and(
          inArray(quotes.jobStatus, ["draft", "quote_sent"]),
          lte(quotes.createdAt, cutoffTime),
          gte(quotes.createdAt, maxAgeTime),
          isNull(quotes.followUpSentAt),
          eq(quotes.isTest, 0)  // Never notify on test/sandbox quotes
        )
      );

    if (candidateQuotes.length === 0) return;

    // Get view counts for these quotes
    const slugs = candidateQuotes.map((q) => q.slug);
    const viewCounts = await db
      .select({
        quoteSlug: quoteViews.quoteSlug,
        viewCount: sql<number>`COUNT(*)`.as("viewCount"),
      })
      .from(quoteViews)
      .where(inArray(quoteViews.quoteSlug, slugs))
      .groupBy(quoteViews.quoteSlug);

    const viewCountMap = new Map(viewCounts.map((v) => [v.quoteSlug, Number(v.viewCount)]));

    for (const quote of candidateQuotes) {
      const views = viewCountMap.get(quote.slug) ?? 0;

      // Parse config to get client/property info
      let clientName = "the client";
      let propertyAddress = "";
      try {
        const config = JSON.parse(quote.configJson) as QuoteConfigData;
        clientName = config.client?.name || "the client";
        propertyAddress = config.property?.address || "";
      } catch {}

      // Build notification message
      let title: string;
      let content: string;

      if (views === 0) {
        // Client has not opened the quote at all
        title = `📋 ${clientName} - quote not yet viewed`;
        content = `Leon, ${clientName}${propertyAddress ? ` (${propertyAddress})` : ""} has not opened quote ${quote.quoteNumber} yet — it has been ${Math.round((now.getTime() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60))}h since it was created. Might be worth a follow-up text.`;
      } else if (views >= MIN_VIEWS_FOR_VIEWED_FOLLOWUP) {
        // Client viewed 3+ times but has not accepted — worth a follow-up
        title = `⏳ ${clientName} - viewed ${views}x, no acceptance yet`;
        content = `Leon, ${clientName}${propertyAddress ? ` (${propertyAddress})` : ""} has viewed quote ${quote.quoteNumber} ${views} time${views !== 1 ? "s" : ""} but has not accepted yet. Created ${Math.round((now.getTime() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60))}h ago. A quick follow-up might help close it.`;
      } else {
        // Viewed fewer than 3 times — too early to follow up, skip
        continue;
      }

      // Send owner notification
      const sent = await notifyOwner({ title, content });

      // Log it
      logNotification({
        quoteNumber: quote.quoteNumber,
        statusTrigger: "follow_up_reminder",
        channel: "email",
        recipientName: "Leon (Owner)",
        success: sent,
        errorMessage: sent ? undefined : "Owner notification failed",
      });

      // Mark as sent so we don't repeat
      if (sent) {
        await db
          .update(quotes)
          .set({ followUpSentAt: new Date() })
          .where(eq(quotes.id, quote.id));
      }
    }

    console.log(`[FollowUp] Processed ${candidateQuotes.length} quote(s) for follow-up reminders`);
  } catch (err) {
    console.error("[FollowUp] Error checking follow-up reminders:", err);
  }
}

export function startFollowUpCron(): void {
  // Run immediately on startup, then every hour
  checkAndSendFollowUpReminders();
  setInterval(checkAndSendFollowUpReminders, 60 * 60 * 1000);
  console.log("[FollowUp] Cron started — checking every hour for unviewed/unaccepted quotes");
}
