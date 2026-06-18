/**
 * Invoice Router — full invoicing lifecycle
 *
 * Routes:
 * - generate: Auto-creates an invoice from a completed quote, generates PDF, uploads to S3
 * - list: Lists all invoices with payment status (admin)
 * - getByQuote: Gets the invoice for a specific quote slug (admin)
 * - updatePaymentStatus: Updates payment status (admin)
 * - sendEmail: Sends invoice email to recipient (admin)
 * - downloadQuotePdf: Generates a downloadable quote PDF (pre-acceptance, no DB save)
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { invoices, quotes } from "../drizzle/schema";
import { eq, desc, sql, isNull, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { generateInvoicePdf, type InvoiceData } from "./invoiceGenerator";
import { generateQuotePdfBuffer } from "./quotePdf";
import type { QuoteConfigData, QuoteType } from "../shared/quoteConfigTypes";
import { usesAgentPaymentTerms, routeNotificationsToAgent } from "../shared/quoteConfigTypes";
import { formatAESTDate } from "../shared/aestUtils";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "bellcarpets2026";

function verifyPassword(password: string) {
  if (password !== ADMIN_PASSWORD) {
    throw new Error("Invalid password");
  }
}

/** Generate the next sequential invoice number like INV-001 */
async function getNextInvoiceNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return "INV-001";

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(invoices);
  const count = result[0]?.count ?? 0;
  const num = count + 1;
  return `INV-${String(num).padStart(3, "0")}`;
}

/** Extract line items from a quote's config and acceptance data */
function extractLineItems(
  config: QuoteConfigData,
  quoteRow: {
    quoteType: string;
    acceptedTier?: string | null;
    acceptedTotal?: number | null;
    configJson: string;
  }
): { description: string; qty: number; unitPrice: number; total: number }[] {
  const items: { description: string; qty: number; unitPrice: number; total: number }[] = [];
  const pricingMode = config.pricingMode ?? "tiered";

  if (pricingMode === "single" && config.product) {
    // Homeowner: check for room itemisation first
    if (config.rooms && config.rooms.length > 0) {
      // Room itemisation: each room is a separate line item
      for (const room of config.rooms) {
        items.push({
          description: `${room.name} — Carpet supply & installation`,
          qty: 1,
          unitPrice: room.price,
          total: room.price,
        });
      }
    } else {
      // No rooms: use single product line
      items.push({
        description: `${config.product.manufacturer} — ${config.product.productName} (Supply & Install)`,
        qty: 1,
        unitPrice: config.product.price,
        total: config.product.price,
      });
    }
  } else if (pricingMode !== "single" && config.tiers) {
    // Agent: find the accepted tier
    const acceptedTierName = quoteRow.acceptedTier;
    const tier = config.tiers.find((t) => t.name === acceptedTierName) || config.tiers[0];
    if (tier) {
      items.push({
        description: `${tier.name} — ${tier.manufacturer} ${tier.productName} (Supply & Install)`,
        qty: 1,
        unitPrice: tier.price,
        total: tier.price,
      });
    }
  }

  // Add-ons
  for (const addon of config.addons || []) {
    items.push({
      description: addon.title,
      qty: 1,
      unitPrice: addon.price,
      total: addon.price,
    });
  }

  return items;
}

/** Build the branded invoice email HTML — clean white style */
const INVOICE_LOGO_URL = "https://quote.bellcarpets.com.au/images/logo.jpg";

function buildInvoiceEmailHtml(data: {
  recipientName: string;
  invoiceNumber: string;
  quoteNumber: string;
  propertyAddress: string;
  totalAmount: number;
  pdfUrl?: string;
  paymentTermsDays?: number;
}): string {
  const formatPrice = (n: number) =>
    "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });

  const refLine = data.quoteNumber
    ? `${data.invoiceNumber} &nbsp;&middot;&nbsp; Ref: ${data.quoteNumber}`
    : data.invoiceNumber;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>Tax Invoice ${data.invoiceNumber} — Bell Carpets</title>
  <style>a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important;}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr><td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #e8e8e8;">
          <img src="${INVOICE_LOGO_URL}" alt="Bell Carpets" style="width:200px;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:48px 48px 40px;">

          <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
            Dear ${data.recipientName || "Valued Client"},
          </p>

          <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
            Tax Invoice
          </h1>

          <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
            Please find attached your tax invoice for the installation at
            <strong style="color:#111;"><a href="x-apple-data-detectors://0" dir="ltr" style="color:#111;text-decoration:none;pointer-events:none;">${data.propertyAddress || "your property"}</a></strong>.
          </p>

          <!-- Invoice details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Invoice</td>
                  <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${refLine}</td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Property</td>
                  <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;"><a href="x-apple-data-detectors://0" dir="ltr" style="color:#333;text-decoration:none;pointer-events:none;">${data.propertyAddress || ""}</a></td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Total (inc GST)</td>
                  <td style="color:#111;font-size:18px;font-family:Arial,sans-serif;font-weight:600;">${formatPrice(data.totalAmount)}</td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:16px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Payment Due</td>
                  <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">Within ${data.paymentTermsDays ?? 30} days</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Banking details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;margin-bottom:40px;">
            <tr><td style="padding:16px 24px;border-bottom:1px solid #e8e8e8;background:#f9f9f9;">
              <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;color:#999;">Banking Details</p>
            </td></tr>
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;">
                <tr>
                  <td style="color:#999;padding:4px 0;width:130px;">Account Name</td>
                  <td style="color:#111;font-weight:600;padding:4px 0;">Bell Spec Pty Ltd</td>
                </tr>
                <tr>
                  <td style="color:#999;padding:4px 0;">BSB</td>
                  <td style="color:#111;font-weight:600;padding:4px 0;">124 022</td>
                </tr>
                <tr>
                  <td style="color:#999;padding:4px 0;">Account Number</td>
                  <td style="color:#111;font-weight:600;padding:4px 0;">22496442</td>
                </tr>
                <tr>
                  <td style="color:#999;padding:4px 0;">Reference</td>
                  <td style="color:#111;font-weight:600;padding:4px 0;">${data.invoiceNumber}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="color:#999;font-size:11px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">
            Please send all remittances to
            <a href="mailto:hello@bellcarpets.com.au" style="color:#555;">hello@bellcarpets.com.au</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 48px;text-align:center;background:#ffffff;border-top:1px solid #e8e8e8;">
          <img src="${INVOICE_LOGO_URL}" alt="Bell Carpets" style="height:30px;display:block;margin:0 auto 12px;" />
          <p style="margin:0;font-size:11px;color:#999;font-family:Arial,sans-serif;line-height:1.6;">
            Bell Spec Pty Ltd &nbsp;&middot;&nbsp; ABN 74 613 299 773<br />
            <a href="x-apple-data-detectors://0" dir="ltr" style="color:#999;text-decoration:none;pointer-events:none;">Unit 1, 41 Olympic Circuit, Southport QLD 4215</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const invoiceRouter = router({
  /**
   * Auto-generate an invoice from a completed quote.
   * Pulls all line items, pricing, and client details from the quote.
   */
  generate: publicProcedure
    .input(
      z.object({
        password: z.string(),
        quoteSlug: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if invoice already exists for this quote
      const existing = await db
        .select()
        .from(invoices)
        .where(eq(invoices.quoteSlug, input.quoteSlug))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: true,
          invoice: existing[0],
          alreadyExists: true,
        };
      }

      // Fetch the quote
      const quoteRows = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.slug, input.quoteSlug), isNull(quotes.deletedAt)))
        .limit(1);

      if (quoteRows.length === 0) throw new Error("Quote not found");

      const quote = quoteRows[0]!;
      const config = JSON.parse(quote.configJson) as QuoteConfigData;
      const quoteType = (quote.quoteType as QuoteType) || "agent";

      // Get recipient details
      let recipientName = "";
      let recipientEmail = "";
      let recipientPhone = "";

      if (routeNotificationsToAgent(quoteType)) {
        recipientName = quote.agentName || config.client.name || "";
        recipientEmail = quote.agentEmail || quote.acceptedAgentEmail || "";
        recipientPhone = quote.agentPhone || quote.acceptedAgentPhone || "";
      } else {
        recipientName = quote.acceptedAgentName || config.client.name || "";
        recipientEmail = quote.acceptedAgentEmail || "";
        recipientPhone = quote.acceptedAgentPhone || "";
      }

      const propertyAddress =
        config.property?.fullAddress || config.property?.address || "";

      // Extract line items
      const lineItems = extractLineItems(config, quote);

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const gst = Math.round(subtotal / 11); // GST is 1/11 of inc-GST price
      const totalAmount = quote.acceptedTotal || subtotal;
      // BUSINESS RULE: agent/insurance quotes have no deposit — full amount owed at completion.
      // Only homeowner quotes require a deposit at acceptance.
      const isHomeowner = quoteType === "homeowner";
      const depositAmount = isHomeowner
        ? Math.round(totalAmount * ((config.depositPercent || 50) / 100))
        : 0;

      // Generate invoice number
      const invoiceNumber = await getNextInvoiceNumber();

      // Payment terms: use per-quote value, fallback to config, then 30 days
      const paymentTermsDays = quote.paymentTermsDays ?? config.validDays ?? 30;

      // Build invoice data for PDF
      const pricingMode = config.pricingMode ?? "tiered";
      const acceptedTierName = quote.acceptedTier;
      let tier = config.tiers?.find((t) => t.name === acceptedTierName);
      if (!tier && config.tiers?.length) tier = config.tiers[0];

      const invoiceData: InvoiceData = {
        quoteNumber: quote.quoteNumber,
        invoiceNumber,
        issueDate: formatAESTDate(new Date(), {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        validDays: paymentTermsDays,
        depositPercent: config.depositPercent || 50,
        clientName: recipientName,
        clientType: config.client?.type || "",
        propertyAddress,
        tierName:
          pricingMode === "single"
            ? config.product?.productName || "Carpet"
            : tier?.name || "Standard",
        productName:
          pricingMode === "single"
            ? config.product?.productName || ""
            : tier?.productName || "",
        manufacturer:
          pricingMode === "single"
            ? config.product?.manufacturer || ""
            : tier?.manufacturer || "",
        fibre:
          pricingMode === "single"
            ? config.product?.fibre || ""
            : tier?.fibre || "",
        pileType:
          pricingMode === "single"
            ? config.product?.pileType || ""
            : tier?.pileType || "",
        colourName: quote.acceptedColour || "",
        colourCode: "",
        basePrice:
          pricingMode === "single"
            ? config.product?.price || 0
            : tier?.price || 0,
        addons: (config.addons || []).map((a) => ({
          title: a.title,
          price: a.price,
        })),
        grandTotal: totalAmount,
        rooms: config.rooms,
        scopeOfWorks: config.scopeOfWorks || [],
        terms: config.terms || [],
        agentName: recipientName,
        agentEmail: recipientEmail,
        agentPhone: recipientPhone,
      };

      // Generate PDF
      const pdfBuffer = await generateInvoicePdf(invoiceData);

      // Upload to S3
      const timestamp = Date.now();
      const fileKey = `invoices/${invoiceNumber}-${timestamp}.pdf`;
      const { url: pdfUrl } = await storagePut(
        fileKey,
        pdfBuffer,
        "application/pdf"
      );

      // Save invoice record
      await db.insert(invoices).values({
        invoiceNumber,
        quoteSlug: input.quoteSlug,
        quoteNumber: quote.quoteNumber,
        quoteType,
        recipientName,
        recipientEmail,
        recipientPhone,
        propertyAddress,
        lineItemsJson: JSON.stringify(lineItems),
        subtotal,
        gst,
        totalAmount,
        depositAmount,
        paymentStatus: "unpaid",
        pdfUrl,
        pdfKey: fileKey,
        paymentTermsDays,
      });

      console.log(
        `[Invoice] Generated ${invoiceNumber} for ${quote.quoteNumber}, uploaded to S3`
      );

      // Fetch the newly created invoice
      const newInvoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.quoteSlug, input.quoteSlug))
        .limit(1);

      return {
        success: true,
        invoice: newInvoice[0],
        alreadyExists: false,
      };
    }),

  /** List all invoices (admin) */
  list: publicProcedure
    .input(z.object({ password: z.string() }))
    .query(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) return [];

      return db.select().from(invoices).orderBy(desc(invoices.createdAt));
    }),

  /** Get invoice for a specific quote (admin) */
  getByQuote: publicProcedure
    .input(z.object({ password: z.string(), quoteSlug: z.string() }))
    .query(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.quoteSlug, input.quoteSlug))
        .orderBy(desc(invoices.createdAt))
        .limit(1);

      return rows.length > 0 ? rows[0] : null;
    }),

  /**
   * Customer-facing invoice lookup — no password required.
   * Returns only the data needed to display the balance page.
   */
  getForCustomer: publicProcedure
    .input(z.object({ quoteSlug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // Fetch the quote for deposit and total info
      const quoteRows = await db
        .select({
          quoteNumber: quotes.quoteNumber,
          depositPaidAmount: quotes.depositPaidAmount,
          discountAmount: quotes.discountAmount,
          acceptedTotal: quotes.acceptedTotal,
          agentName: quotes.agentName,
          paymentTermsDays: quotes.paymentTermsDays,
          configJson: quotes.configJson,
        })
        .from(quotes)
        .where(and(eq(quotes.slug, input.quoteSlug), isNull(quotes.deletedAt)))
        .limit(1);

      if (quoteRows.length === 0) return null;
      const quote = quoteRows[0]!;

      // Fetch the invoice record
      const invRows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.quoteSlug, input.quoteSlug))
        .orderBy(desc(invoices.createdAt))
        .limit(1);

      const inv = invRows.length > 0 ? invRows[0]! : null;

      // Parse config for property address
      let propertyAddress = "";
      try {
        const config = JSON.parse(quote.configJson) as { property?: { fullAddress?: string; address?: string } };
        propertyAddress = config.property?.fullAddress || config.property?.address || "";
      } catch {}

      const totalAmount = quote.acceptedTotal ?? inv?.totalAmount ?? 0;
      const discountAmount = quote.discountAmount ?? 0;
      const depositPaid = quote.depositPaidAmount ?? 0;
      const balanceOwing = Math.max(0, totalAmount - discountAmount - depositPaid);

      return {
        invoiceNumber: inv?.invoiceNumber ?? null,
        quoteNumber: quote.quoteNumber,
        propertyAddress,
        recipientName: inv?.recipientName ?? quote.agentName ?? "",
        totalAmount,
        discountAmount,
        depositPaid,
        balanceOwing,
        paymentStatus: inv?.paymentStatus ?? "unpaid",
        paymentTermsDays: quote.paymentTermsDays ?? inv?.paymentTermsDays ?? 30,
        pdfUrl: inv?.pdfUrl ?? null,
      };
    }),

  /** Update payment status (admin) */
  updatePaymentStatus: publicProcedure
    .input(
      z.object({
        password: z.string(),
        invoiceId: z.number(),
        paymentStatus: z.enum([
          "unpaid",
          "deposit_paid",
          "balance_due",
          "paid_in_full",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch invoice before updating to get recipient details
      const invoiceRows = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
      const invoice = invoiceRows[0];

      await db
        .update(invoices)
        .set({ paymentStatus: input.paymentStatus })
        .where(eq(invoices.id, input.invoiceId));

      // Guard: only send paid-in-full email if not already sent (prevents double-fire with adminRouter path)
      if (input.paymentStatus === "paid_in_full" && invoice && invoice.recipientEmail && !invoice.paidInFullNotificationSent) {
        const { notifyPaidInFull } = await import("./notificationService");
        try {
          await notifyPaidInFull({
            recipientName: invoice.recipientName,
            recipientEmail: invoice.recipientEmail || "",
            recipientPhone: invoice.recipientPhone || "",
            quoteNumber: invoice.quoteNumber,
            propertyAddress: invoice.propertyAddress || "",
            invoiceNumber: invoice.invoiceNumber,
          });
          // Set flag so adminRouter path cannot fire a duplicate
          await db.update(invoices)
            .set({ paidInFullNotificationSent: 1 })
            .where(eq(invoices.id, input.invoiceId));
          console.log(`[Invoice] paidInFullNotificationSent flag set for ${invoice.invoiceNumber}`);
        } catch (err) {
          console.error("[Invoice] notifyPaidInFull error:", err);
        }
      } else if (input.paymentStatus === "paid_in_full" && invoice?.paidInFullNotificationSent) {
        console.log(`[Invoice] Skipping paid-in-full email for ${invoice.invoiceNumber} — already sent`);
      }

      return { success: true };
    }),

  /** Send invoice email to recipient (admin) */
  sendEmail: publicProcedure
    .input(
      z.object({
        password: z.string(),
        invoiceId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch the invoice
      const rows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (rows.length === 0) throw new Error("Invoice not found");
      const invoice = rows[0]!;

      if (!invoice.recipientEmail) {
        throw new Error("No recipient email address on this invoice");
      }

      // Build email HTML
      const emailHtml = buildInvoiceEmailHtml({
        recipientName: invoice.recipientName,
        invoiceNumber: invoice.invoiceNumber,
        quoteNumber: invoice.quoteNumber,
        propertyAddress: invoice.propertyAddress,
        totalAmount: invoice.totalAmount,
        pdfUrl: invoice.pdfUrl || undefined,
        paymentTermsDays: invoice.paymentTermsDays ?? 30,
      });

      // Send via Resend
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) throw new Error("Email service not configured");

      // Build attachments array if PDF exists
      const attachments: { filename: string; path: string }[] = [];
      if (invoice.pdfUrl) {
        attachments.push({
          filename: `${invoice.invoiceNumber}-${invoice.quoteNumber}.pdf`,
          path: invoice.pdfUrl,
        });
      }

      const emailPayload: Record<string, unknown> = {
        from: "Bell Carpets <quotes@bellcarpets.com.au>",
        reply_to: "hello@bellcarpets.com.au",
        to: [invoice.recipientEmail],
        subject: `Tax Invoice ${invoice.invoiceNumber} — Bell Carpets`,
        html: emailHtml,
      };

      if (attachments.length > 0) {
        emailPayload.attachments = attachments;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Invoice] Email send failed:", response.status, errText);
        throw new Error(`Email failed: ${response.status}`);
      }

      // Update invoice record
      await db
        .update(invoices)
        .set({
          emailSent: 1,
          emailSentAt: new Date(),
        })
        .where(eq(invoices.id, input.invoiceId));

      console.log(
        `[Invoice] Email sent for ${invoice.invoiceNumber} to ${invoice.recipientEmail}`
      );

      return { success: true };
    }),

  /** Generate a downloadable quote PDF (pre-acceptance, no DB save) */
  downloadQuotePdf: publicProcedure
    .input(
      z.object({
        quoteSlug: z.string(),
        tierName: z.string(),
        productName: z.string(),
        manufacturer: z.string(),
        fibre: z.string().optional(),
        pileType: z.string().optional(),
        colourName: z.string(),
        colourCode: z.string().optional(),
        basePrice: z.number(),
        addons: z.array(z.object({ title: z.string(), price: z.number() })),
        grandTotal: z.number(),
        /** For homeowner quotes with room itemisation */
        rooms: z.array(z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
        })).optional(),
        /** For agent tiered quotes: all tiers to show in comparison layout */
        allTiers: z.array(z.object({
          name: z.string(),
          productName: z.string(),
          manufacturer: z.string(),
          fibre: z.string(),
          pileType: z.string(),
          price: z.number(),
          depositPercent: z.number(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { pdfBuffer, quoteNumber } = await generateQuotePdfBuffer(input.quoteSlug);
      return {
        pdfBase64: pdfBuffer.toString("base64"),
        quoteNumber,
      };
    }),

  /** Public — review thank-you page data */
  getForReview: publicProcedure
    .input(z.object({ quoteSlug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({
          quoteNumber: quotes.quoteNumber,
          jobStatus: quotes.jobStatus,
          agentName: quotes.agentName,
          configJson: quotes.configJson,
        })
        .from(quotes)
        .where(and(eq(quotes.slug, input.quoteSlug), isNull(quotes.deletedAt)))
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0]!;
      let clientName = "";
      let propertyAddress = "";
      try {
        const config = JSON.parse(row.configJson) as { client?: { name?: string }; property?: { fullAddress?: string; address?: string } };
        clientName = config.client?.name || row.agentName || "";
        propertyAddress = config.property?.fullAddress || config.property?.address || "";
      } catch {}
      // Only return data if the job is paid in full
      if (row.jobStatus !== "paid_in_full") {
        return { clientName, propertyAddress, quoteNumber: row.quoteNumber, isPaidInFull: false };
      }
      return { clientName, propertyAddress, quoteNumber: row.quoteNumber, isPaidInFull: true };
    }),

  /** Create a direct invoice without a quote (for phone/text confirmations) */
  createDirect: publicProcedure
    .input(
      z.object({
        password: z.string(),
        recipientName: z.string().min(1),
        recipientEmail: z.string().email(),
        recipientPhone: z.string().optional(),
        propertyAddress: z.string().min(1),
        lineItems: z.array(
          z.object({
            description: z.string().min(1),
            amount: z.number().min(0.01),
          })
        ).min(1),
        paymentTermsDays: z.number().int().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate invoice number
      const invoiceNumber = await getNextInvoiceNumber();

      // Calculate total
      const totalAmount = input.lineItems.reduce((sum, item) => sum + item.amount, 0);

      // Build invoice data for PDF
      const invoiceData: InvoiceData = {
        invoiceNumber,
        quoteNumber: "",
        issueDate: new Date().toLocaleDateString('en-AU'),
        validDays: input.paymentTermsDays || 30,
        depositPercent: 0,
        clientName: input.recipientName,
        clientType: "homeowner",
        propertyAddress: input.propertyAddress,
        tierName: "",
        productName: "",
        manufacturer: "",
        fibre: "",
        pileType: "",
        colourName: "",
        basePrice: 0,
        addons: [],
        grandTotal: totalAmount,
        scopeOfWorks: [],
        terms: [],
        agentName: "",
        agentEmail: "",
        agentPhone: "",
      };

      // Generate PDF
      let pdfUrl: string | null = null;
      try {
        const pdfBuffer = await generateInvoicePdf(invoiceData);
        const pdfKey = `invoices/${invoiceNumber}-direct-${Date.now()}.pdf`;
        const uploadResult = await storagePut(pdfKey, pdfBuffer, "application/pdf");
        pdfUrl = uploadResult.url;
      } catch (err) {
        console.error("[Invoice] PDF generation failed:", err);
      }

      // Calculate subtotal and GST (assuming 10% GST)
      const subtotal = Math.round(totalAmount / 1.1);
      const gst = totalAmount - subtotal;

      // Insert into DB
      const insertResult = await db
        .insert(invoices)
        .values({
          invoiceNumber,
          quoteSlug: "",
          quoteNumber: "",
          quoteType: "homeowner",
          recipientName: input.recipientName,
          recipientEmail: input.recipientEmail,
          recipientPhone: input.recipientPhone || null,
          propertyAddress: input.propertyAddress,
          lineItemsJson: JSON.stringify(input.lineItems),
          subtotal,
          gst,
          totalAmount,
          pdfUrl: pdfUrl || null,
          paymentTermsDays: input.paymentTermsDays || 30,
          paymentStatus: "unpaid",
        });

      const invoiceId = (insertResult as any).insertId || 0;

      // Send email
      try {
        const emailHtml = buildInvoiceEmailHtml({
          recipientName: input.recipientName,
          invoiceNumber,
          quoteNumber: "",
          propertyAddress: input.propertyAddress,
          totalAmount,
          pdfUrl: pdfUrl || undefined,
          paymentTermsDays: input.paymentTermsDays || 30,
        });

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) throw new Error("Email service not configured");

        const emailPayload: Record<string, unknown> = {
          from: "Bell Carpets <quotes@bellcarpets.com.au>",
          reply_to: "hello@bellcarpets.com.au",
          to: [input.recipientEmail],
          bcc: ["hello@bellcarpets.com.au"],
          subject: `Tax Invoice ${invoiceNumber} — Bell Carpets`,
          html: emailHtml,
        };

        if (pdfUrl) {
          emailPayload.attachments = [
            {
              filename: `${invoiceNumber}.pdf`,
              path: pdfUrl,
            },
          ];
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("[Invoice] Direct invoice email send failed:", response.status, errText);
        }
      } catch (err) {
        console.error("[Invoice] Direct invoice email error:", err);
      }

      return { success: true, invoiceId, invoiceNumber };
    }),
});
