/**
 * weeklyPipelineSms.ts
 * Sends Leon a Monday morning SMS with a snapshot of the current pipeline:
 * - Open quotes (draft + quote_sent)
 * - Accepted / in-progress jobs (accepted + deposit_paid + scheduled)
 * - Outstanding invoice balance (unpaid + balance_due invoices)
 *
 * Triggered by Heartbeat every Monday at 7:00 AM AEST (= 21:00 UTC Sunday).
 */

import { getDb } from "./db";
import { quotes, invoices } from "../drizzle/schema";
import { and, eq, isNull, inArray, ne } from "drizzle-orm";
import { sendSms } from "./smsHelper";

const LEON_PHONE = "+61466912786";

export async function sendWeeklyPipelineSms(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[WeeklyPipeline] DB not available — skipping");
    return;
  }

  try {
    // Active (non-deleted, non-test, non-cancelled) quotes
    const allQuotes = await db
      .select({
        jobStatus: quotes.jobStatus,
        acceptedTotal: quotes.acceptedTotal,
        discountAmount: quotes.discountAmount,
        depositPaidAmount: quotes.depositPaidAmount,
      })
      .from(quotes)
      .where(
        and(
          isNull(quotes.deletedAt),
          eq(quotes.isTest, 0),
          ne(quotes.jobStatus, "cancelled")
        )
      );

    const openQuotes = allQuotes.filter(q =>
      q.jobStatus === "draft" || q.jobStatus === "quote_sent"
    );
    const activeJobs = allQuotes.filter(q =>
      q.jobStatus === "accepted" || q.jobStatus === "deposit_paid" || q.jobStatus === "scheduled"
    );

    // Outstanding invoice balance
    const unpaidInvoices = await db
      .select({
        totalAmount: invoices.totalAmount,
        depositAmount: invoices.depositAmount,
        paymentStatus: invoices.paymentStatus,
      })
      .from(invoices)
      .where(
        inArray(invoices.paymentStatus, ["unpaid", "balance_due"])
      );

    const outstandingBalance = unpaidInvoices.reduce((sum, inv) => {
      if (inv.paymentStatus === "balance_due") {
        // Balance due = total minus deposit already paid
        return sum + Math.max(0, inv.totalAmount - (inv.depositAmount || 0));
      }
      // Unpaid = full amount
      return sum + inv.totalAmount;
    }, 0);

    const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-AU");

    const lines = [
      `📊 Bell Carpets — Weekly Pipeline`,
      ``,
      `Open quotes: ${openQuotes.length}`,
      `Active jobs: ${activeJobs.length}`,
      `Outstanding: ${fmt(outstandingBalance)}`,
      ``,
      `quote.bellcarpets.com.au/admin`,
    ];

    const body = lines.join("\n");
    const sent = await sendSms(LEON_PHONE, body);

    if (sent) {
      console.log("[WeeklyPipeline] SMS sent to Leon");
    } else {
      console.warn("[WeeklyPipeline] SMS send failed");
    }
  } catch (err) {
    console.error("[WeeklyPipeline] Error:", err);
    throw err;
  }
}
