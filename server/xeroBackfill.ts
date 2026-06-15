/**
 * Xero Backfill — runs once on server startup.
 * Finds all invoices without a xeroInvoiceId and pushes them to Xero.
 * Safe to re-run on every deploy: invoices already synced are skipped by syncFullInvoiceToXero.
 */
import { isNull } from "drizzle-orm";
import { getDb } from "./db";
import { invoices } from "../drizzle/schema";
import { isXeroConnected, syncFullInvoiceToXero } from "./xeroHelper";

export async function backfillUnsyncedInvoices(): Promise<void> {
  try {
    const connected = await isXeroConnected();
    if (!connected) {
      console.log("[Xero Backfill] Xero not connected — skipping backfill");
      return;
    }

    const db = await getDb();
    if (!db) {
      console.warn("[Xero Backfill] DB unavailable — skipping backfill");
      return;
    }

    const unsynced = await db
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(isNull(invoices.xeroInvoiceId));

    if (unsynced.length === 0) {
      console.log("[Xero Backfill] All invoices already synced — nothing to do");
      return;
    }

    console.log(`[Xero Backfill] Found ${unsynced.length} unsynced invoice(s) — pushing to Xero`);

    let synced = 0;
    let failed = 0;

    for (const inv of unsynced) {
      const result = await syncFullInvoiceToXero(inv.id);
      if (result.success) {
        synced++;
        console.log(`[Xero Backfill] ✓ ${inv.invoiceNumber} synced`);
      } else {
        failed++;
        console.warn(`[Xero Backfill] ✗ ${inv.invoiceNumber} failed: ${result.error}`);
      }
      // Small delay between calls to avoid Xero rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[Xero Backfill] Complete — ${synced} synced, ${failed} failed`);
  } catch (err) {
    console.error("[Xero Backfill] Unexpected error:", err);
  }
}
