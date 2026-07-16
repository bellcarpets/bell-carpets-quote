/**
 * Quote Router — handles quote acceptance submissions
 * 
 * When an agent accepts a quote:
 * 1. Saves the acceptance to the database
 * 2. Sends an email notification to Bell Carpets (via Resend API)
 * 3. Sends an SMS notification (via Twilio-style API or fallback)
 * 4. Sends an in-app owner notification via Manus Forge
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { quoteAcceptances, quotes, invoices, quoteViews } from "../drizzle/schema";
import { sql, isNull, eq, and } from "drizzle-orm";
import { ENV } from "./_core/env";
import { generateInvoicePdf, type InvoiceData } from "./invoiceGenerator";
import { storagePut } from "./storage";
import type { QuoteConfigData, QuoteType } from "../shared/quoteConfigTypes";
import { usesAgentPaymentTerms, routeNotificationsToAgent } from "../shared/quoteConfigTypes";
import { getDescriptionLines } from "../shared/quoteDescription";
import { sendAcceptanceSmsToBellCarpets } from "./smsHelper";

// Zod schema for the quote acceptance input
const acceptQuoteInput = z.object({
  quoteNumber: z.string().min(1),
  propertyAddress: z.string().optional().default(""),
  clientName: z.string().optional().default(""),
  tierName: z.string().min(1),
  productName: z.string().optional().default(""),
  manufacturer: z.string().optional().default(""),
  colourName: z.string().optional().default("Not specified"),
  colourCode: z.string().optional(),
  basePrice: z.number().int().positive(),
  addons: z.array(z.object({
    id: z.string(),
    title: z.string(),
    price: z.number(),
  })),
  grandTotal: z.number().int().positive(),
  agentName: z.string().min(1, "Please enter your name"),
  agentEmail: z.string().email("Please enter a valid email address"),
  agentPhone: z.string().min(8, "Please enter a valid phone number"),
  agentNotes: z.string().optional().default(""),
  rooms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().int(),
  })).optional(),
});

type AcceptQuoteInput = z.infer<typeof acceptQuoteInput>;

// ─── Email via Resend API ───────────────────────────────────────────

async function sendEmailNotification(data: AcceptQuoteInput, pdfAttachment?: { content: string; filename: string }, quoteType: QuoteType = "agent", depositPct?: number): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn("[Quote] RESEND_API_KEY not configured — skipping email notification");
    return false;
  }

  const formatPrice = (n: number) => "$" + n.toLocaleString("en-AU");
  const pct = depositPct ?? 50;
  const deposit = Math.round(data.grandTotal * (pct / 100));

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>New Quote Accepted — Bell Carpets</title>
  <style>a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important;}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr><td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #e8e8e8;">
          <img src="https://quote.bellcarpets.com.au/images/logo.jpg" alt="Bell Carpets" width="160" style="width:160px;max-width:160px;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:48px 48px 40px;">

          <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
            New quote accepted.
          </h1>

          <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
            ${data.quoteNumber} — <a href="x-apple-data-detectors://0" dir="ltr" style="color:#666;text-decoration:none;pointer-events:none;">${data.propertyAddress}</a>
          </p>

          <!-- Quote details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Quote</td>
                <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.quoteNumber}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Property</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;"><a href="x-apple-data-detectors://0" dir="ltr" style="color:#333;text-decoration:none;pointer-events:none;">${data.propertyAddress}</a></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Client</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.clientName}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Tier</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.tierName}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Product</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.manufacturer} — ${data.productName}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Colour</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.colourCode ? data.colourCode + " " : ""}${data.colourName}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Total (inc GST)</td>
                <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${formatPrice(data.grandTotal)}</td>
              </tr></table>
            </td></tr>
            ${!usesAgentPaymentTerms(quoteType) ? `<tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">${pct}% Deposit</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${formatPrice(deposit)}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Balance on completion</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${formatPrice(data.grandTotal - deposit)}</td>
              </tr></table>
            </td></tr>` : ""}
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Contact</td>
                <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.agentName} &nbsp;&middot;&nbsp; <a href="mailto:${data.agentEmail}" style="color:#555;">${data.agentEmail}</a> &nbsp;&middot;&nbsp; <a href="tel:${data.agentPhone}" style="color:#555;">${data.agentPhone}</a></td>
              </tr></table>
            </td></tr>
            ${data.agentNotes ? `<tr><td style="padding:16px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Notes</td>
                <td style="color:#333;font-size:13px;font-family:Arial,sans-serif;line-height:1.7;white-space:pre-wrap;">${data.agentNotes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
              </tr></table>
            </td></tr>` : ""}
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 48px;text-align:center;background:#ffffff;border-top:1px solid #e8e8e8;">
          <img src="https://quote.bellcarpets.com.au/images/logo.jpg" alt="Bell Carpets" width="120" style="width:120px;max-width:120px;display:block;margin:0 auto;" />
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;


  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bell Carpets <quotes@bellcarpets.com.au>",
        reply_to: "hello@bellcarpets.com.au",
        to: ["hello@bellcarpets.com.au"],
        ...(data.agentEmail ? { cc: [data.agentEmail] } : {}),
        subject: `Your quote from Bell Carpets`,
        html: htmlBody,
        ...(pdfAttachment ? {
          attachments: [{
            content: pdfAttachment.content,
            filename: pdfAttachment.filename,
          }],
        } : {}),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Quote] Resend email failed:", response.status, err);
      return false;
    }

    console.log("[Quote] Email notification sent successfully");
    return true;
  } catch (error) {
    console.error("[Quote] Email send error:", error);
    return false;
  }
}

// ─── Acceptance confirmation email to agent/homeowner ────────────────

async function sendAcceptanceConfirmationEmail(
  data: AcceptQuoteInput,
  quoteType: QuoteType,
  invoiceNumber?: string,
  pdfAttachment?: { content: string; filename: string },
  depositPercent?: number
): Promise<boolean> {
  // Use the new centralized notification service
  const { notifyQuoteAccepted } = await import("./notificationService");

  try {
    // Calculate deposit from config.depositPercent (not hardcoded 50%)
    const pct = depositPercent ?? 50;
    const depositAmount = Math.round(data.grandTotal * (pct / 100));
    await notifyQuoteAccepted({
      recipientName: data.agentName,
      recipientEmail: data.agentEmail,
      recipientPhone: data.agentPhone,
      quoteNumber: data.quoteNumber,
      invoiceNumber,
      propertyAddress: data.propertyAddress || "",
      quoteType,
      depositAmount,
      totalAmount: data.grandTotal,
      depositPercent: pct,
      rooms: data.rooms,
      pdfAttachment,
    });
    return true;
  } catch (error) {
    console.error("[Quote] sendAcceptanceConfirmationEmail error:", error);
    return false;
  }
}

// ─── Owner notification via Manus Forge ─────────────────────────────

async function sendOwnerNotification(data: AcceptQuoteInput, quoteType: QuoteType = "agent", depositPercent?: number): Promise<boolean> {
  const formatPrice = (n: number) => "$" + n.toLocaleString("en-AU");
  const addonsText = data.addons.length > 0
    ? "\n\nAdd-ons:\n" + data.addons.map(a => `• ${a.title}: ${formatPrice(a.price)}`).join("\n")
    : "";

  const pct = depositPercent ?? 50;
  const depositLine = !usesAgentPaymentTerms(quoteType) ? `\nDeposit (${pct}%): ${formatPrice(Math.round(data.grandTotal * (pct / 100)))}` : "";
  const billingNote = usesAgentPaymentTerms(quoteType) ? "\nBilling: Invoice after job completion" : "";

  const title = `✅ Quote #${data.quoteNumber} Accepted — ${data.tierName} — ${formatPrice(data.grandTotal)}`;
  const content = `Agent: ${data.agentName}
Email: ${data.agentEmail}
Phone: ${data.agentPhone}

Property: ${data.propertyAddress}
Client: ${data.clientName}

Selection:
• Tier: ${data.tierName}
• Product: ${data.manufacturer} — ${data.productName}
• Colour: ${data.colourCode ? data.colourCode + " " : ""}${data.colourName}

Base Price: ${formatPrice(data.basePrice)}${addonsText}
Total: ${formatPrice(data.grandTotal)}${depositLine}${billingNote}`;

  try {
    const delivered = await notifyOwner({ title, content });
    if (delivered) {
      console.log("[Quote] Owner notification sent successfully");
    }
    return delivered;
  } catch (error) {
    console.error("[Quote] Owner notification error:", error);
    return false;
  }
}

// ─── Router ─────────────────────────────────────────────────────────

export const quoteRouter = router({
  accept: publicProcedure
    .input(acceptQuoteInput)
    .mutation(async ({ input }) => {
      const addonsTotal = input.addons.reduce((sum, a) => sum + a.price, 0);

      // 0. Server-side expiry check — reject expired quotes before any DB writes
      try {
        const db = await getDb();
        if (db) {
          const quoteRows = await db
            .select({ expiresAt: quotes.expiresAt, jobStatus: quotes.jobStatus })
            .from(quotes)
            .where(and(eq(quotes.quoteNumber, input.quoteNumber), isNull(quotes.deletedAt)))
            .limit(1);
          const quoteRow = quoteRows[0];
          if (quoteRow) {
            // Block acceptance if already accepted
            if (quoteRow.jobStatus === "accepted" || quoteRow.jobStatus === "deposit_paid" ||
                quoteRow.jobStatus === "scheduled" || quoteRow.jobStatus === "completed" ||
                quoteRow.jobStatus === "paid_in_full") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "This quote has already been accepted.",
              });
            }
            // Block acceptance if expired
            if (quoteRow.expiresAt && new Date() > new Date(quoteRow.expiresAt)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "QUOTE_EXPIRED",
              });
            }
          }
        }
      } catch (err) {
        // Re-throw TRPCErrors (expiry/already-accepted), swallow DB connection errors
        if (err instanceof TRPCError) throw err;
        console.error("[Quote] Expiry pre-check error:", err);
      }

      // 1. Save to database
      let dbSaved = false;
      try {
        const db = await getDb();
        if (db) {
          await db.insert(quoteAcceptances).values({
            quoteNumber: input.quoteNumber,
            propertyAddress: input.propertyAddress,
            clientName: input.clientName,
            tierName: input.tierName,
            productName: input.productName,
            manufacturer: input.manufacturer,
            colourName: input.colourName,
            colourCode: input.colourCode || null,
            basePrice: input.basePrice,
            addonsJson: JSON.stringify(input.addons),
            addonsTotal,
            grandTotal: input.grandTotal,
            agentName: input.agentName,
            agentEmail: input.agentEmail,
            agentPhone: input.agentPhone,
            agentNotes: input.agentNotes || null,
          });
          dbSaved = true;
          console.log("[Quote] Acceptance saved to quoteAcceptances table");

          // CRITICAL: Also update the quotes table with accepted contact info and status.
          // Without this, subsequent status transitions (deposit_paid, scheduled, completed)
          // cannot find the client's email/phone for notifications.
          //
          // BUG FIX: For agent/insurance quotes, do NOT overwrite acceptedAgentEmail/Phone/Name
          // with the form-filler's (homeowner's) details. The adminRouter already reads
          // agentEmail/agentPhone directly for agent quotes, so leaving acceptedAgent* as NULL
          // is correct and prevents homeowner contact details from polluting agent notifications.
          //
          // For homeowner quotes: the form-filler IS the client, so store their contact details.
          const quoteTypeRows = await db.select({ quoteType: quotes.quoteType })
            .from(quotes)
            .where(and(eq(quotes.quoteNumber, input.quoteNumber), isNull(quotes.deletedAt)))
            .limit(1);
          const isHomeownerQuote = quoteTypeRows.length > 0 && (quoteTypeRows[0]!.quoteType === "homeowner" || quoteTypeRows[0]!.quoteType === "agency_single");

          // Agent/insurance: leave acceptedAgentName/Email/Phone as NULL.
          // adminRouter uses agentEmail/agentPhone columns directly for these quote types.
          if (isHomeownerQuote) {
            // Homeowner: store the form-filler's contact details for downstream notifications
            await db.update(quotes)
              .set({
                jobStatus: "accepted",
                acceptedTier: input.tierName,
                acceptedColour: input.colourName,
                acceptedTotal: input.grandTotal,
                acceptedAt: new Date(),
                acceptedNotes: input.agentNotes || null,
                acceptedAgentName: input.agentName,
                acceptedAgentEmail: input.agentEmail,
                acceptedAgentPhone: input.agentPhone,
              })
              .where(eq(quotes.quoteNumber, input.quoteNumber));
          } else {
            // Agent/insurance: do NOT set acceptedAgentName/Email/Phone
            await db.update(quotes)
              .set({
                jobStatus: "accepted",
                acceptedTier: input.tierName,
                acceptedColour: input.colourName,
                acceptedTotal: input.grandTotal,
                acceptedAt: new Date(),
                acceptedNotes: input.agentNotes || null,
              })
              .where(eq(quotes.quoteNumber, input.quoteNumber));
          }
          console.log(`[Quote] Updated quotes table — quoteType=${isHomeownerQuote ? 'homeowner' : 'agent/insurance'}, acceptedAgent fields ${isHomeownerQuote ? 'set' : 'left as NULL'}`);
        }
      } catch (error) {
        console.error("[Quote] Database save error:", error);
      }

      // 2. Generate PDF invoice and attach to email
      let pdfAttachment: { content: string; filename: string } | undefined;
      try {
        const db2 = await getDb();
        if (db2) {
          // Try to find the quote by quoteNumber to get full config
          const quoteRows = await db2.select().from(quotes).where(and(eq(quotes.quoteNumber, input.quoteNumber), isNull(quotes.deletedAt))).limit(1);
          if (quoteRows.length > 0) {
            const quoteRow = quoteRows[0]!;
            const config = JSON.parse(quoteRow.configJson) as QuoteConfigData;
            // Derive invoice number for the PDF (BC-007 → INV-007)
            const derivedInvoiceNumber = `INV-${input.quoteNumber.replace(/^BC-/, '').replace(/^[A-Z]+-/, '')}`;

            const invoiceData: InvoiceData = {
              quoteNumber: input.quoteNumber,
              invoiceNumber: derivedInvoiceNumber,
              issueDate: config.issueDate,
              validDays: config.validDays,
              depositPercent: config.depositPercent,
              clientName: config.client.name,
              clientType: config.client.type,
              propertyAddress: input.propertyAddress,
              tierName: input.tierName,
              productName: input.productName,
              manufacturer: input.manufacturer,
              fibre: "",
              pileType: "",
              colourName: input.colourName,
              colourCode: input.colourCode,
              basePrice: input.basePrice,
              addons: input.addons.map(a => ({ title: a.title, price: a.price })),
              grandTotal: input.grandTotal,
              scopeOfWorks: config.scopeOfWorks,
              terms: config.terms,
              agentName: input.agentName,
              agentEmail: input.agentEmail,
              agentPhone: input.agentPhone,
              // Room itemisation: pass through for homeowner/agency_single quotes with room breakdown
              rooms: (input.rooms && input.rooms.length > 0) ? input.rooms : (config.rooms && config.rooms.length > 0 ? config.rooms : undefined),
              // Flowing description lines: same shared source as the web page + quote PDF.
              descriptionLines: getDescriptionLines(config, { tiered: (config.pricingMode ?? "tiered") !== "single" }),
              quoteType: config.quoteType,
              isSingleProduct: (config.pricingMode ?? "tiered") === "single",
            };

            // Resolve fibre/pileType based on quote type
            // Homeowner/agency_single: use config.product
            // Agent/real_estate: use matched tier from config.tiers
            if (usesAgentPaymentTerms(config.quoteType) === true) {
              // Agent/real_estate: use tier
              const matchedTier = config.tiers?.find(t => t.name === input.tierName);
              if (matchedTier) {
                invoiceData.fibre = matchedTier.fibre || "";
                invoiceData.pileType = matchedTier.pileType || "";
              }
            } else if (config.product) {
              // Homeowner/agency_single: use product
              invoiceData.fibre = config.product.fibre || "";
              invoiceData.pileType = config.product.pileType || "";
            }

            const pdfBuffer = await generateInvoicePdf(invoiceData);

            // BUSINESS RULE: ALL quote types get an invoice at acceptance with matching number.
            // Homeowner: depositAmount = config.depositPercent% of total (e.g. 50% of $4450 = $2225).
            //   May be overridden later when admin enters actual deposit via deposit_paid status.
            // Agent/insurance: depositAmount=0 (no deposit required, full amount owed at completion).
            // agency_single uses agent payment terms (no deposit), so treat like agent for invoice purposes
            const isHomeowner = quoteRow.quoteType === "homeowner";

            if (isHomeowner) {
              // Homeowner: attach deposit invoice PDF to acceptance email
              pdfAttachment = {
                content: pdfBuffer.toString("base64"),
                filename: `Bell-Carpets-Invoice-${input.quoteNumber}.pdf`,
              };
            }
            // Agent/insurance: no PDF attachment at acceptance (invoice created for records only)

            // Upload to S3 and save invoice record for ALL quote types at acceptance
            try {
              const timestamp = Date.now();
              const fileKey = `invoices/${input.quoteNumber}-${timestamp}.pdf`;
              const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");
              // Calculate line items and totals for the new invoice schema
              const lineItems = [
                { description: `${input.tierName} — Carpet supply & installation`, qty: 1, unitPrice: input.basePrice, total: input.basePrice },
                ...input.addons.map(a => ({ description: a.title, qty: 1, unitPrice: a.price, total: a.price })),
              ];
              const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
              const gst = Math.round(subtotal / 11);
              // Homeowner: calculate deposit from config.depositPercent at acceptance
              // Agent/insurance: depositAmount=0 (no deposit required, full amount owed at completion)
              const depositAmount = isHomeowner
                ? Math.round(input.grandTotal * ((config.depositPercent || 50) / 100))
                : 0;
              // Derive invoice number from quote number (BC-007 → INV-007, no suffixes)
              const quoteNum = input.quoteNumber.replace(/^BC-/, '').replace(/^[A-Z]+-/, '');
              const invoiceNumber = `INV-${quoteNum}`;
              // Store the actual quoteType — DB enum now supports homeowner | agent | real_estate
              const quoteType = (quoteRow.quoteType as 'homeowner' | 'agent' | 'real_estate' | 'agency_single') || 'agent';
              await db2.insert(invoices).values({
                invoiceNumber,
                quoteSlug: quoteRow.slug,
                quoteNumber: input.quoteNumber,
                quoteType,
                recipientName: input.agentName,
                recipientEmail: input.agentEmail,
                recipientPhone: input.agentPhone,
                propertyAddress: input.propertyAddress,
                lineItemsJson: JSON.stringify(lineItems),
                subtotal,
                gst,
                totalAmount: input.grandTotal,
                depositAmount,
                pdfUrl,
                pdfKey: fileKey,
              });
              console.log(`[Quote] Invoice ${invoiceNumber} created at acceptance for ${quoteType} quote ${input.quoteNumber}`);

              // SINGLE-INVOICE XERO FLOW:
              // Homeowner: create full invoice in Xero at acceptance, then record deposit as partial payment.
              // Agent/real_estate: no deposit — Xero invoice created when balance is paid at completion.
              if (isHomeowner) {
                try {
                  const { isXeroConnected, syncFullInvoiceToXero, recordDepositPaymentToXero } = await import("./xeroHelper");
                  if (await isXeroConnected()) {
                    const [newInv] = await db2.select({ id: invoices.id }).from(invoices).where(eq(invoices.quoteSlug, quoteRow.slug)).orderBy(sql`id DESC`).limit(1);
                    if (newInv) {
                      // Step 1: Create full-amount invoice in Xero
                      const syncResult = await syncFullInvoiceToXero(newInv.id);
                      if (syncResult.success) {
                        console.log(`[Xero] Created full invoice for ${input.quoteNumber} in Xero`);
                        // Step 2: Record deposit as partial payment against the invoice
                        const depositResult = await recordDepositPaymentToXero(newInv.id);
                        if (depositResult.success) {
                          console.log(`[Xero] Recorded deposit payment for ${input.quoteNumber}`);
                        } else {
                          console.warn(`[Xero] Deposit payment recording failed for ${input.quoteNumber}: ${depositResult.error}`);
                        }
                      } else {
                        console.warn(`[Xero] Full invoice sync failed for ${input.quoteNumber}: ${syncResult.error}`);
                      }
                    }
                  }
                } catch (xeroErr) {
                  console.error("[Xero] Xero sync error at acceptance (non-critical):", xeroErr);
                }
              }
            } catch (s3Err) {
              console.error("[Quote] Failed to create invoice at acceptance:", s3Err);
            }
          }
        }
      } catch (pdfErr) {
        console.error("[Quote] PDF generation error (non-critical):", pdfErr);
      }

      // Determine quoteType and depositPercent for acceptance confirmation email
      let quoteType: QuoteType = "agent";
      let invoiceNumber: string | undefined;
      let depositPercent: number | undefined;
      try {
        const db3 = await getDb();
        if (db3) {
          const qRows = await db3.select().from(quotes).where(and(eq(quotes.quoteNumber, input.quoteNumber), isNull(quotes.deletedAt))).limit(1);
          if (qRows.length > 0) {
            quoteType = (qRows[0]!.quoteType as QuoteType) || "agent";
            // Extract depositPercent from config for accurate notification amounts
            try {
              const cfg = JSON.parse(qRows[0]!.configJson) as QuoteConfigData;
              depositPercent = cfg.depositPercent;
            } catch { /* use default 50% */ }
          }
          // Get invoice number for the reference
          const invRows = await db3.select().from(invoices).where(eq(invoices.quoteNumber, input.quoteNumber)).limit(1);
          if (invRows.length > 0) {
            invoiceNumber = invRows[0]!.invoiceNumber;
          }
        }
      } catch (e) {
        console.error("[Quote] Error fetching quoteType for confirmation email:", e);
      }

      // 3. Send notifications in parallel (don't block on failures)
      // Pass depositPercent so notifications use the correct % from config (not hardcoded 50%)
      const [emailSent, smsSent, notificationSent, confirmationSent] = await Promise.all([
        sendEmailNotification(input, pdfAttachment, quoteType, depositPercent),
        Promise.resolve(false), // SMS to Leon disabled — email-only for owner notifications
        sendOwnerNotification(input, quoteType, depositPercent),
        sendAcceptanceConfirmationEmail(input, quoteType, invoiceNumber, pdfAttachment, depositPercent),
      ]);

      // Set acceptanceEmailSent flag so admin re-accepting never fires a duplicate client email
      if (confirmationSent) {
        try {
          const dbFlag = await getDb();
          if (dbFlag) {
            await dbFlag.update(quotes)
              .set({ acceptanceEmailSent: 1 })
              .where(eq(quotes.quoteNumber, input.quoteNumber));
            console.log(`[Quote] acceptanceEmailSent flag set for ${input.quoteNumber}`);
          }
        } catch (flagErr) {
          console.error("[Quote] Failed to set acceptanceEmailSent flag:", flagErr);
        }
      }

      // 3. Update notification status in DB
      if (dbSaved) {
        try {
          const db = await getDb();
          if (db) {
            // We just inserted the latest record, update it
            // Simple approach: update by quoteNumber + agentEmail combo
            const { eq, and } = await import("drizzle-orm");
            const records = await db.select()
              .from(quoteAcceptances)
              .where(
                and(
                  eq(quoteAcceptances.quoteNumber, input.quoteNumber),
                  eq(quoteAcceptances.agentEmail, input.agentEmail)
                )
              )
              .orderBy(quoteAcceptances.id)
              .limit(1);
            
            if (records.length > 0) {
              await db.update(quoteAcceptances)
                .set({
                  emailSent: emailSent ? 1 : 0,
                  smsSent: smsSent ? 1 : 0,
                  notificationSent: notificationSent ? 1 : 0,
                })
                .where(eq(quoteAcceptances.id, records[0]!.id));
            }
          }
        } catch (error) {
          console.error("[Quote] Failed to update notification status:", error);
        }
      }

      // Log the full acceptance for debugging
      console.log("[Quote] Acceptance processed:", {
        quoteNumber: input.quoteNumber,
        tier: input.tierName,
        colour: input.colourName,
        total: input.grandTotal,
        agent: input.agentName,
        dbSaved,
        emailSent,
        smsSent,
        notificationSent,
      });

      return {
        success: true,
        dbSaved,
        emailSent,
        smsSent,
        notificationSent,
      };
    }),

  /**
   * Track a public quote page view.
   * Called fire-and-forget from the client-facing quote page on mount.
   * Does NOT require authentication — this is a public endpoint.
   * Captures IP, geo-location (city/country), and device type for analytics.
   */
  trackView: publicProcedure
    .input(z.object({
      slug: z.string().min(1),
      userAgent: z.string().optional(),
      isAdmin: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Skip tracking if this is an admin preview
      if (input.isAdmin) return { success: true };
      try {
        const db = await getDb();
        if (!db) return { success: true };

        // Extract client IP from request headers (X-Forwarded-For for proxied requests)
        const forwarded = ctx.req.headers["x-forwarded-for"];
        const rawIp = typeof forwarded === "string"
          ? forwarded.split(",")[0]!.trim()
          : ctx.req.socket?.remoteAddress || null;
        const ipAddress = rawIp?.replace(/^::ffff:/, "") || null;

        // Derive device type from user-agent
        const ua = input.userAgent || "";
        let deviceType: string = "desktop";
        if (/bot|crawler|spider|crawling/i.test(ua)) deviceType = "bot";
        else if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) deviceType = "mobile";
        else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) deviceType = "tablet";

        // Geo-lookup via free ip-api.com (non-blocking, best-effort)
        let city: string | null = null;
        let country: string | null = null;
        if (ipAddress && ipAddress !== "127.0.0.1" && ipAddress !== "::1") {
          try {
            const geoRes = await fetch(`http://ip-api.com/json/${ipAddress}?fields=city,countryCode`, { signal: AbortSignal.timeout(3000) });
            if (geoRes.ok) {
              const geo = await geoRes.json() as { city?: string; countryCode?: string };
              city = geo.city || null;
              country = geo.countryCode || null;
            }
          } catch {
            // Geo-lookup failed — non-critical, continue without it
          }
        }

        await db.insert(quoteViews).values({
          quoteSlug: input.slug,
          userAgent: ua.substring(0, 512) || null,
          ipAddress,
          city,
          country,
          deviceType,
          isAdmin: false,
        });
      } catch (error) {
        // Non-critical — don't fail the page load
        console.error("[Quote] trackView error:", error);
      }
      return { success: true };
    }),
});
