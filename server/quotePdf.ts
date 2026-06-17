import { and, eq, isNull } from "drizzle-orm";

import { quotes } from "../drizzle/schema";
import type { QuoteConfigData, QuoteType } from "../shared/quoteConfigTypes";
import { usesAgentPaymentTerms } from "../shared/quoteConfigTypes";
import { getDb } from "./db";
import { generateInvoicePdf, type InvoiceData } from "./invoiceGenerator";

export async function generateQuotePdfBuffer(quoteSlug: string): Promise<{
  pdfBuffer: Buffer;
  quoteNumber: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const quoteRows = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.slug, quoteSlug), isNull(quotes.deletedAt)))
    .limit(1);

  if (quoteRows.length === 0) {
    throw new Error("Quote not found");
  }

  const quote = quoteRows[0]!;
  const config = JSON.parse(quote.configJson) as QuoteConfigData;
  const quoteType = (quote.quoteType as QuoteType) || "agent";
  const pricingMode = config.pricingMode ?? "tiered";
  const isSingle = pricingMode === "single";
  const tiers = isSingle ? [] : (config.tiers ?? []);
  const selectedTier = tiers[0] ?? null;
  const selectedColour = isSingle ? null : (selectedTier?.colours?.[0] ?? null);

  const isAgentTiered =
    (quoteType === "agent" || quoteType === "real_estate") &&
    !isSingle &&
    tiers.length > 1;

  const hasRooms =
    (quoteType === "homeowner" || quoteType === "real_estate" || quoteType === "agency_single") &&
    (config.rooms?.length ?? 0) > 0;

  const roomsPayload = hasRooms ? config.rooms : undefined;
  const roomsTotal = hasRooms
    ? (config.rooms?.reduce((sum, room) => sum + room.price, 0) ?? 0)
    : 0;

  const basePrice = isSingle ? (config.product?.price ?? 0) : (selectedTier?.price ?? 0);
  const effectiveBasePrice = hasRooms ? roomsTotal : basePrice;
  const addons = (config.addons ?? []).map((addon) => ({
    title: addon.title,
    price: addon.price,
  }));
  const grandTotal = effectiveBasePrice + addons.reduce((sum, addon) => sum + addon.price, 0);

  const allTiersPayload = isAgentTiered
    ? tiers.map((tier) => ({
        name: tier.name,
        productName: tier.productName ?? "",
        manufacturer: tier.manufacturer ?? "",
        fibre: tier.fibre ?? "",
        pileType: tier.pileType ?? "",
        price: tier.price,
        depositPercent: config.depositPercent ?? 50,
      }))
    : undefined;

  const invoiceData: InvoiceData = {
    quoteNumber: quote.quoteNumber,
    issueDate: config.issueDate,
    validDays: config.validDays,
    depositPercent: config.depositPercent,
    clientName: config.client.name,
    clientType: config.client.type,
    propertyAddress: config.property.address || config.property.fullAddress || "",
    tierName: isSingle ? (config.product?.productName ?? "Carpet") : (selectedTier?.name ?? ""),
    productName: isSingle ? (config.product?.productName ?? "") : (selectedTier?.productName ?? ""),
    manufacturer: isSingle ? (config.product?.manufacturer ?? "") : (selectedTier?.manufacturer ?? ""),
    fibre: isSingle ? (config.product?.fibre ?? "") : (selectedTier?.fibre ?? ""),
    pileType: isSingle ? (config.product?.pileType ?? "") : (selectedTier?.pileType ?? ""),
    colourName: isSingle ? (config.product?.colourName ?? "") : (selectedColour?.name ?? ""),
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
  };

  const pdfBuffer = await generateInvoicePdf(invoiceData);

  return {
    pdfBuffer,
    quoteNumber: quote.quoteNumber,
  };
}
