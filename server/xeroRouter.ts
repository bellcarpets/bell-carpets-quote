/**
 * Xero tRPC Router — admin procedures for Xero integration management.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getXeroAuthUrl,
  getXeroConnectionInfo,
  disconnectXero,
  syncInvoiceToXero,
  isXeroConnected,
  getXeroInvoiceStatus,
  getValidAccessToken,
} from "./xeroHelper";
import { getDb } from "./db";
import { invoices, quotes } from "../drizzle/schema";
import { eq, isNotNull, isNull, and } from "drizzle-orm";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

/** Verify admin password */
function verifyAdmin(password: string) {
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin password" });
  }
}

export const xeroRouter = router({
  /** Get Xero connection status */
  status: protectedProcedure
    .input(z.object({ password: z.string() }))
    .query(async ({ input }) => {
      verifyAdmin(input.password);
      const info = await getXeroConnectionInfo();
      return info;
    }),

  /** Get the Xero authorization URL to initiate OAuth */
  getAuthUrl: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const url = getXeroAuthUrl();
      return { url };
    }),

  /** Disconnect from Xero */
  disconnect: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      await disconnectXero();
      return { success: true };
    }),

  /** Manually sync a specific invoice to Xero */
  syncInvoice: protectedProcedure
    .input(z.object({ password: z.string(), invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const result = await syncInvoiceToXero(input.invoiceId);
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Sync failed",
        });
      }
      return { success: true };
    }),

  /** Manually sync all unsynced invoices to Xero */
  syncAllUnsynced: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const connected = await isXeroConnected();
      if (!connected) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not connected to Xero" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Find all invoices not yet synced to Xero
      const unique = await db
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(isNull(invoices.xeroInvoiceId))
        .limit(50);

      let synced = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const inv of unique) {
        const result = await syncInvoiceToXero(inv.id);
        if (result.success) {
          synced++;
        } else {
          failed++;
          errors.push(`${inv.invoiceNumber}: ${result.error}`);
        }
      }

      return { synced, failed, total: unique.length, errors };
    }),

  /** Poll Xero for payment status updates on synced invoices */
  pollPaymentStatus: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const auth = await getValidAccessToken();
      if (!auth) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not connected to Xero" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get all invoices synced to Xero that aren't fully paid
      const syncedInvoices = await db
        .select()
        .from(invoices)
        .where(isNotNull(invoices.xeroInvoiceId));

      let updated = 0;
      for (const inv of syncedInvoices) {
        if (!inv.xeroInvoiceId) continue;
        if (inv.paymentStatus === "paid_in_full") continue;

        const xeroStatus = await getXeroInvoiceStatus(inv.xeroInvoiceId);
        if (!xeroStatus) continue;

        let newPaymentStatus: string | null = null;

        if (xeroStatus.status === "PAID" || xeroStatus.amountDue === 0) {
          newPaymentStatus = "paid_in_full";
        } else if (xeroStatus.amountPaid > 0 && xeroStatus.amountDue > 0) {
          // Partial payment — check if it looks like a deposit
          const depositRatio = xeroStatus.amountPaid / xeroStatus.total;
          if (depositRatio < 0.6) {
            newPaymentStatus = "deposit_paid";
          } else {
            newPaymentStatus = "balance_due";
          }
        }

        if (newPaymentStatus && newPaymentStatus !== inv.paymentStatus) {
          await db
            .update(invoices)
            .set({ paymentStatus: newPaymentStatus as any })
            .where(eq(invoices.id, inv.id));

          // If paid in full, also update the quote's job status
          if (newPaymentStatus === "paid_in_full" && inv.quoteSlug) {
            const [quote] = await db
              .select({ quoteType: quotes.quoteType, jobStatus: quotes.jobStatus })
              .from(quotes)
              .where(and(eq(quotes.slug, inv.quoteSlug), isNull(quotes.deletedAt)));

            if (quote && quote.jobStatus !== "completed") {
              // Don't override completed status, but update if still in progress
            }
          }

          updated++;
          console.log(
            `[Xero] Payment status updated: ${inv.invoiceNumber} → ${newPaymentStatus} (Xero: ${xeroStatus.status}, paid: $${xeroStatus.amountPaid}, due: $${xeroStatus.amountDue})`
          );
        }
      }

      return { checked: syncedInvoices.length, updated };
    }),
});
