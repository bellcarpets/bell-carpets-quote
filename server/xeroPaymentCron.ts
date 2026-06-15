/**
 * Xero Payment Status Polling Cron
 * Checks Xero every 2 hours for payment updates on synced invoices.
 * Updates CRM invoice payment status when payments are recorded in Xero.
 */
import { getDb } from "./db";
import { invoices } from "../drizzle/schema";
import { isNotNull, and, ne } from "drizzle-orm";
import { eq } from "drizzle-orm";
import {
  isXeroConnected,
  getValidAccessToken,
  getXeroInvoiceStatus,
} from "./xeroHelper";

const POLL_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function startXeroPaymentCron() {
  console.log("[Xero Payment] Cron started — polling every 2 hours for payment updates");

  // Run first check after 5 minutes (give server time to stabilize)
  setTimeout(() => {
    checkXeroPayments();
  }, 5 * 60 * 1000);

  // Then run every 2 hours
  setInterval(() => {
    checkXeroPayments();
  }, POLL_INTERVAL_MS);
}

async function checkXeroPayments() {
  try {
    // Check if Xero is connected
    const connected = await isXeroConnected();
    if (!connected) return;

    const auth = await getValidAccessToken();
    if (!auth) return;

    const db = await getDb();
    if (!db) return;

    // Get all invoices synced to Xero that aren't fully paid
    const syncedInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          isNotNull(invoices.xeroInvoiceId),
          ne(invoices.paymentStatus, "paid_in_full")
        )
      );

    if (syncedInvoices.length === 0) return;

    let updated = 0;
    for (const inv of syncedInvoices) {
      if (!inv.xeroInvoiceId) continue;

      try {
        const xeroStatus = await getXeroInvoiceStatus(inv.xeroInvoiceId);
        if (!xeroStatus) continue;

        let newPaymentStatus: "unpaid" | "deposit_paid" | "balance_due" | "paid_in_full" | null = null;

        if (xeroStatus.status === "PAID" || xeroStatus.amountDue === 0) {
          newPaymentStatus = "paid_in_full";
        } else if (xeroStatus.amountPaid > 0 && xeroStatus.amountDue > 0) {
          // Use the invoice's actual depositAmount to classify partial payments correctly.
          // Fallback: if depositAmount is 0 or missing, use 60% of total as a safe threshold.
          const depositThreshold = inv.depositAmount > 0
            ? inv.depositAmount
            : xeroStatus.total * 0.6;
          if (xeroStatus.amountPaid < depositThreshold * 1.05) {
            // Paid less than ~105% of expected deposit → deposit stage
            newPaymentStatus = "deposit_paid";
          } else {
            // Paid more than deposit → balance stage
            newPaymentStatus = "balance_due";
          }
        }

        if (newPaymentStatus && newPaymentStatus !== inv.paymentStatus) {
          await db
            .update(invoices)
            .set({ paymentStatus: newPaymentStatus })
            .where(eq(invoices.id, inv.id));

          updated++;
          console.log(
            `[Xero Payment] Updated ${inv.invoiceNumber}: ${inv.paymentStatus} → ${newPaymentStatus}`
          );
        }
      } catch (invErr) {
        console.error(`[Xero Payment] Error checking ${inv.invoiceNumber}:`, invErr);
      }
    }

    if (updated > 0) {
      console.log(`[Xero Payment] Updated ${updated} invoice(s) from Xero`);
    }
  } catch (e) {
    console.error("[Xero Payment] Cron error:", e);
  }
}
