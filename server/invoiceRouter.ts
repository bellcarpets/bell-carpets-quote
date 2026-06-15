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

/** Build the branded invoice email HTML */
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

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111111;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
  <!-- Header -->
  <tr><td style="background-color:#000000;padding:32px 40px;text-align:center;border-bottom:2px solid #B8965A;">
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg" alt="Bell Carpets" width="180" style="display:block;margin:0 auto 8px;" />
    <p style="margin:0;font-size:10px;letter-spacing:2px;color:#888888;">Established 1987</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:40px;">
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Tax Invoice</h1>
    <p style="margin:0 0 24px;font-size:13px;color:#B8965A;font-weight:600;">${data.invoiceNumber} &nbsp;·&nbsp; Ref: ${data.quoteNumber}</p>
    
    <p style="margin:0 0 24px;font-size:15px;color:#cccccc;line-height:1.6;">
      Dear ${data.recipientName || "Valued Client"},<br/><br/>
      Please find attached your tax invoice for the carpet installation at <strong style="color:#ffffff;">${data.propertyAddress || "your property"}</strong>.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#888888;padding-bottom:8px;">Total Amount (inc GST)</td>
            <td style="font-size:24px;font-weight:700;color:#ffffff;text-align:right;padding-bottom:8px;">${formatPrice(data.totalAmount)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(184,150,90,0.08);border-radius:12px;border:1px solid rgba(184,150,90,0.2);margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <p style="margin:0 0 12px;font-size:12px;color:#B8965A;font-weight:600;letter-spacing:1px;">BANKING DETAILS</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#cccccc;">
          <tr><td style="padding:3px 0;color:#888888;width:120px;">ACC NAME</td><td style="padding:3px 0;color:#ffffff;font-weight:600;">Bell Spec Pty Ltd</td></tr>
          <tr><td style="padding:3px 0;color:#888888;">BSB</td><td style="padding:3px 0;color:#ffffff;font-weight:600;">124 022</td></tr>
          <tr><td style="padding:3px 0;color:#888888;">ACC NUMBER</td><td style="padding:3px 0;color:#ffffff;font-weight:600;">22496442</td></tr>
          <tr><td style="padding:3px 0;color:#888888;">REFERENCE</td><td style="padding:3px 0;color:#B8965A;font-weight:600;">${data.invoiceNumber}</td></tr>
        </table>
      </td></tr>
    </table>
    
    <p style="margin:0 0 8px;font-size:12px;color:#888888;line-height:1.5;">
      Payment due within <strong style="color:#ffffff;">${data.paymentTermsDays ?? 30} days</strong>. Please send all remittances by email to: <a href="mailto:hello@bellcarpets.com.au" style="color:#B8965A;">hello@bellcarpets.com.au</a>
    </p>
    <p style="margin:0;font-size:11px;color:#666666;">
      BELL SPEC PTY LTD &nbsp;·&nbsp; ABN 74 613 299 773 &nbsp;·&nbsp; Unit 1, 41 Olympic Circuit, Southport QLD 4215
    </p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background-color:#000000;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
    <p style="margin:0;font-size:11px;color:#666666;">Bell Carpets &nbsp;·&nbsp; Established 1987 &nbsp;·&nbsp; Gold Coast, QLD</p>
    <p style="margin:4px 0 0;font-size:10px;color:#555555;">07 5571 1177 &nbsp;·&nbsp; hello@bellcarpets.com.au &nbsp;·&nbsp; bellcarpets.com.au</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
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
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const quoteRows = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.slug, input.quoteSlug), isNull(quotes.deletedAt)))
        .limit(1);

      if (quoteRows.length === 0) throw new Error("Quote not found");

      const quote = quoteRows[0]!;
      const config = JSON.parse(quote.configJson) as QuoteConfigData;

      const invoiceData: InvoiceData = {
        quoteNumber: quote.quoteNumber,
        issueDate: config.issueDate,
        validDays: config.validDays,
        depositPercent: config.depositPercent,
        clientName: config.client.name,
        clientType: config.client.type,
        propertyAddress:
          config.property.address || config.property.fullAddress || "",
        tierName: input.tierName,
        productName: input.productName,
        manufacturer: input.manufacturer,
        fibre: input.fibre || "",
        pileType: input.pileType || "",
        colourName: input.colourName,
        colourCode: input.colourCode,
        basePrice: input.basePrice,
        addons: input.addons,
        grandTotal: input.grandTotal,
        rooms: input.rooms,
        allTiers: input.allTiers,
        scopeOfWorks: config.scopeOfWorks,
        terms: config.terms,
        agentName: quote.agentName || config.client.name || "",
        agentEmail: quote.agentEmail || "",
        agentPhone: quote.agentPhone || "",
        isAgent: usesAgentPaymentTerms(quote.quoteType),
      };

      const pdfBuffer = await generateInvoicePdf(invoiceData);

      return {
        pdfBase64: pdfBuffer.toString("base64"),
        quoteNumber: quote.quoteNumber,
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
