/**
 * invoicePdfForSlug.ts
 *
 * Smart PDF generator used by the GET /api/quote/:slug/pdf endpoint.
 *
 * - For quotes with jobStatus "accepted" or beyond (deposit_paid, scheduled,
 *   completed, paid_in_full), it generates an INVOICE PDF:
 *     • Uses the existing invoice record's invoiceNumber if one exists, so the
 *       number is stable and matches what was emailed to the customer.
 *     • Falls back to generating a temporary INV-xxx number if no invoice record
 *       exists yet (edge case — the invoice is normally created at acceptance).
 *     • Uses the accepted tier / accepted total from the quote row.
 *
 * - For draft / quote_sent quotes it generates a QUOTE PDF (no invoiceNumber,
 *   shows all tiers, uses configured pricing).
 *
 * The invoiceGenerator already handles the INVOICE vs QUOTE distinction based
 * on whether invoiceNumber is present in InvoiceData.
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { invoices, quotes } from "../drizzle/schema";
import type { QuoteConfigData, QuoteType } from "../shared/quoteConfigTypes";
import { usesAgentPaymentTerms } from "../shared/quoteConfigTypes";
import { getDescriptionLines } from "../shared/quoteDescription";
import { formatAESTDate } from "../shared/aestUtils";
import { getDb } from "./db";
import { generateInvoicePdf, type InvoiceData } from "./invoiceGenerator";

const POST_ACCEPTANCE_STATUSES = new Set([
  "accepted",
  "deposit_paid",
  "scheduled",
  "completed",
  "paid_in_full",
]);

export async function generateInvoicePdfForSlug(quoteSlug: string): Promise<{
  pdfBuffer: Buffer;
  filename: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ── Fetch the quote ─────────────────────────────────────────────────────────
  const quoteRows = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.slug, quoteSlug), isNull(quotes.deletedAt)))
    .limit(1);
  if (quoteRows.length === 0) throw new Error("Quote not found");
  const quote = quoteRows[0]!;
  const config = JSON.parse(quote.configJson) as QuoteConfigData;
  const quoteType = (quote.quoteType as QuoteType) || "agent";
  const pricingMode = config.pricingMode ?? "tiered";
  const isSingle = pricingMode === "single";

  const isPostAcceptance = POST_ACCEPTANCE_STATUSES.has(quote.jobStatus ?? "");

  // ── Build common fields ──────────────────────────────────────────────────────
  const tiers = isSingle ? [] : (config.tiers ?? []);

  // For invoice: use the accepted tier; for quote: use first tier
  let selectedTier = isSingle
    ? null
    : (tiers.find((t) => t.name === quote.acceptedTier) ?? tiers[0] ?? null);

  const selectedColour = isSingle
    ? null
    : (selectedTier?.colours?.find((c) => c.name === quote.acceptedColour) ??
       selectedTier?.colours?.[0] ??
       null);

  const isAgentTiered =
    !isPostAcceptance && // invoice shows the accepted tier only, not all tiers
    (quoteType === "agent" || quoteType === "real_estate") &&
    !isSingle &&
    tiers.length > 1;

  const hasRooms =
    (quoteType === "homeowner" ||
      quoteType === "real_estate" ||
      quoteType === "agency_single") &&
    (config.rooms?.length ?? 0) > 0;

  const roomsPayload = hasRooms ? config.rooms : undefined;
  const roomsTotal = hasRooms
    ? (config.rooms?.reduce((sum, r) => sum + r.price, 0) ?? 0)
    : 0;

  const basePrice = isSingle
    ? (config.product?.price ?? 0)
    : (selectedTier?.price ?? 0);
  const effectiveBasePrice = hasRooms ? roomsTotal : basePrice;

  const addons = (config.addons ?? []).map((a) => ({ title: a.title, price: a.price }));

  // For invoice use the accepted total (what the customer agreed to pay).
  // For quote use the calculated total.
  const grandTotal = isPostAcceptance
    ? (quote.acceptedTotal ?? effectiveBasePrice + addons.reduce((s, a) => s + a.price, 0))
    : effectiveBasePrice + addons.reduce((s, a) => s + a.price, 0);

  const allTiersPayload = isAgentTiered
    ? tiers.map((t) => ({
        name: t.name,
        productName: t.productName ?? "",
        manufacturer: t.manufacturer ?? "",
        fibre: t.fibre ?? "",
        pileType: t.pileType ?? "",
        price: t.price,
        depositPercent: config.depositPercent ?? 50,
      }))
    : undefined;

  // ── Invoice number (only for post-acceptance) ────────────────────────────────
  let invoiceNumber: string | undefined;
  if (isPostAcceptance) {
    // Try to use the existing invoice record so the number matches the email
    const invRows = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.quoteSlug, quoteSlug))
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    if (invRows.length > 0) {
      invoiceNumber = invRows[0]!.invoiceNumber;
    } else {
      // No invoice record yet — generate a display number without saving to DB.
      // This is an edge case; normally the invoice is created at acceptance.
      const countRows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(invoices);
      const count = countRows[0]?.count ?? 0;
      invoiceNumber = `INV-${String(count + 1).padStart(3, "0")}`;
    }
  }

  // ── Build InvoiceData ────────────────────────────────────────────────────────
  const invoiceData: InvoiceData = {
    quoteNumber: quote.quoteNumber,
    invoiceNumber, // undefined → QUOTE header; set → INVOICE header
    issueDate: isPostAcceptance
      ? formatAESTDate(new Date(), { day: "2-digit", month: "short", year: "numeric" })
      : config.issueDate,
    validDays: config.validDays,
    depositPercent: config.depositPercent,
    clientName: config.client.name,
    clientType: config.client.type,
    propertyAddress:
      config.property.address || config.property.fullAddress || "",
    tierName: isSingle
      ? (config.product?.productName ?? "Carpet")
      : (selectedTier?.name ?? ""),
    productName: isSingle
      ? (config.product?.productName ?? "")
      : (selectedTier?.productName ?? ""),
    manufacturer: isSingle
      ? (config.product?.manufacturer ?? "")
      : (selectedTier?.manufacturer ?? ""),
    fibre: isSingle
      ? (config.product?.fibre ?? "")
      : (selectedTier?.fibre ?? ""),
    pileType: isSingle
      ? (config.product?.pileType ?? "")
      : (selectedTier?.pileType ?? ""),
    colourName: isSingle
      ? (config.product?.colourName ?? "")
      : (quote.acceptedColour ?? selectedColour?.name ?? ""),
    colourCode: isSingle ? "" : (selectedColour?.code ?? ""),
    basePrice: effectiveBasePrice,
    addons,
    grandTotal,
    rooms: roomsPayload,
    allTiers: allTiersPayload,
    scopeOfWorks: config.scopeOfWorks,
    terms: config.terms,
    agentName: quote.agentName || config.client.name || "",
    agentEmail: quote.agentEmail || "",
    agentPhone: quote.agentPhone || "",
    isAgent: usesAgentPaymentTerms(quote.quoteType),
    descriptionLines: getDescriptionLines(config, { tiered: !isSingle }),
    quoteType,
    isSingleProduct: isSingle,
  };

  const pdfBuffer = await generateInvoicePdf(invoiceData);

  const docLabel = isPostAcceptance ? "Invoice" : "Quote";
  const docNumber = invoiceNumber ?? quote.quoteNumber;
  const filename = `${docNumber}-${docLabel}.pdf`;

  return { pdfBuffer, filename };
}
