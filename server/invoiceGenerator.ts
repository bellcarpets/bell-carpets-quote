/**
 * Invoice PDF Generator — creates a luxury branded Bell Carpets quote PDF
 * Uses PDFKit for server-side generation.
 *
 * Design: Black & white, EB Garamond serif font, generous whitespace,
 * architectural firm aesthetic. No gold, no colour, no gradients.
 *
 * Page 1: Quote details, product, pricing, banking
 * Page 2+: Full Terms & Conditions (auto-paginates)
 * Every page: minimal footer with Bell Carpets wordmark
 */

import PDFDocument from "pdfkit";
import https from "https";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { formatAESTDate, nowAEST } from "../shared/aestUtils";

export interface InvoiceData {
  quoteNumber: string;
  invoiceNumber?: string;
  issueDate: string;
  validDays: number;
  depositPercent: number;

  clientName: string;
  clientType: string;
  propertyAddress: string;

  tierName: string;
  productName: string;
  manufacturer: string;
  fibre: string;
  pileType: string;
  colourName: string;
  colourCode?: string;

  basePrice: number;
  addons: { title: string; price: number }[];
  grandTotal: number;

  rooms?: { id: string; name: string; price: number }[];

  allTiers?: {
    name: string;
    productName: string;
    manufacturer: string;
    fibre: string;
    pileType: string;
    price: number;
    depositPercent: number;
  }[];

  scopeOfWorks: { title: string; description: string }[];
  terms: string[];

  agentName: string;
  agentEmail: string;
  agentPhone: string;

  isAgent?: boolean;

  /**
   * Flowing description lines shown on the quote (identical to the web page).
   * When provided, the PDF renders these as natural sentences instead of the
   * legacy labelled "SCOPE OF WORKS" rows. Source: shared getDescriptionLines
   * (config.description if admin-written, else generateDefaultDescription).
   */
  descriptionLines?: string[];

  /** Quote type, used to match the web page's heading + prepared-for logic. */
  quoteType?: string;

  /** True for single-product layouts (homeowner / agency_single). */
  isSingleProduct?: boolean;
}

// ─── Palette: Pure B&W ─────────────────────────────────────────────
const BLACK = "#000000";
const DARK = "#1a1a1a";
const MID = "#666666";
const LIGHT = "#999999";
const RULE = "#e0e0e0";
const FAINT = "#f5f5f5";
// Warm cream accent — matches the customer-facing quote page (#EDE8DF).
const CREAM = "#EDE8DF";

// Logo URL (black wordmark on white)
const LOGO_URL = "https://quote.bellcarpets.com.au/images/logo.jpg";

// Font paths — relative to this file's directory
const FONT_DIR = path.join(__dirname, "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "EBGaramond-Variable.ttf");
const FONT_ITALIC = path.join(FONT_DIR, "EBGaramond-Italic-Variable.ttf");

function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });
}

function calculateValidUntil(issueDate: string, validDays: number): string {
  try {
    const d = new Date(issueDate);
    if (isNaN(d.getTime())) {
      const now = nowAEST();
      now.setDate(now.getDate() + validDays);
      return formatAESTDate(now, { day: "2-digit", month: "short", year: "numeric" });
    }
    d.setDate(d.getDate() + validDays);
    return formatAESTDate(d, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  let logoBuffer: Buffer | null = null;
  try {
    logoBuffer = await downloadImage(LOGO_URL);
  } catch (e) {
    console.warn("[InvoiceGenerator] Failed to download logo:", e);
  }

  // Check if custom fonts exist, fall back to Helvetica if not
  const hasCustomFont = fs.existsSync(FONT_REGULAR);
  const hasItalicFont = fs.existsSync(FONT_ITALIC);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 0, left: 60, right: 60 },
      autoFirstPage: true,
      bufferPages: true,
      info: {
        Title: `Bell Carpets — ${data.invoiceNumber ?? data.quoteNumber}`,
        Author: "Bell Carpets",
        Subject: `Quote ${data.invoiceNumber ?? data.quoteNumber}`,
      },
    });

    // Register fonts
    if (hasCustomFont) {
      doc.registerFont("Garamond", FONT_REGULAR);
    }
    if (hasItalicFont) {
      doc.registerFont("Garamond-Italic", FONT_ITALIC);
    }

    const fontRegular = hasCustomFont ? "Garamond" : "Helvetica";
    const fontBold = hasCustomFont ? "Garamond" : "Helvetica-Bold";
    const fontItalic = hasItalicFont ? "Garamond-Italic" : "Helvetica-Oblique";

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 120; // 60 left + 60 right
    const leftMargin = 60;
    const rightEdge = leftMargin + pageWidth;
    const pageHeight = doc.page.height;
    const FOOTER_H = 50;
    const SAFE_BOTTOM = pageHeight - FOOTER_H - 60;

    let pageCount = 1;

    // ─── Helper: draw minimal footer ─────────────────────────────
    function drawPageFooter(pageNum: number) {
      const footerY = pageHeight - 50;
      doc.moveTo(leftMargin, footerY - 6)
        .lineTo(rightEdge, footerY - 6)
        .strokeColor(RULE).lineWidth(0.5).stroke();

      doc.font(fontRegular).fontSize(7).fillColor(LIGHT);
      doc.text(
        "Bell Carpets  ·  Established 1987",
        leftMargin, footerY + 2,
        { width: pageWidth * 0.6, align: "left" }
      );
      doc.font(fontRegular).fontSize(7).fillColor(LIGHT);
      doc.text(
        `Page ${pageNum}`,
        leftMargin + pageWidth * 0.6, footerY + 2,
        { width: pageWidth * 0.4, align: "right" }
      );
    }

    // ─── Helper: check page break ────────────────────────────────
    function ensureSpace(needed: number, y: number): number {
      if (y + needed > SAFE_BOTTOM) {
        drawPageFooter(pageCount);
        doc.addPage();
        pageCount++;
        return 60;
      }
      return y;
    }

    // ═══════════════════════════════════════════════════════════════
    // PAGE 1: Quote
    // ═══════════════════════════════════════════════════════════════

    let y = 60;

    // Logo
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, leftMargin, y, { height: 32 });
      } catch {
        doc.font(fontBold).fontSize(20).fillColor(BLACK);
        doc.text("BELL CARPETS", leftMargin, y + 6);
      }
    } else {
      doc.font(fontBold).fontSize(20).fillColor(BLACK);
      doc.text("BELL CARPETS", leftMargin, y + 6);
    }

    y += 56;

    // Thin rule below logo
    doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
      .strokeColor(BLACK).lineWidth(1).stroke();

    y += 24;

    // QUOTE number and dates — right aligned
    const docLabel = data.invoiceNumber ? "INVOICE" : "QUOTE";
    const docNumber = data.invoiceNumber ?? data.quoteNumber;
    const validUntil = calculateValidUntil(data.issueDate, data.validDays);

    doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
    doc.text(docLabel, rightEdge - 160, y, { width: 160, align: "right" });
    y += 2;
    doc.font(fontBold).fontSize(18).fillColor(BLACK);
    doc.text(docNumber, rightEdge - 160, y + 10, { width: 160, align: "right" });

    // Left side: client details.
    // Prepared-for name mirrors the web page: agency quotes use config.client.name
    // (falling back to agentName), homeowner quotes use config.client.name. The
    // unified fallback chain is correct for every quote type because agentName is
    // only the raw contact person on agency_single, and client.name is set on all
    // live quotes.
    const preparedForName = data.clientName?.trim() || data.agentName || "";
    const detailStartY = y;
    doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
    doc.text("PREPARED FOR", leftMargin, detailStartY);
    doc.font(fontRegular).fontSize(11).fillColor(DARK);
    doc.text(preparedForName, leftMargin, detailStartY + 14);

    y = detailStartY + 42;

    // Property address
    if (data.propertyAddress) {
      doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
      doc.text("PROPERTY", leftMargin, y);
      doc.font(fontRegular).fontSize(10).fillColor(DARK);
      doc.text(data.propertyAddress, leftMargin, y + 14);
      y += 36;
    }

    // Dates
    y += 8;
    doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
    doc.text("ISSUED", leftMargin, y);
    doc.font(fontRegular).fontSize(10).fillColor(DARK);
    doc.text(data.issueDate, leftMargin + 80, y);

    if (validUntil && !data.invoiceNumber) {
      y += 16;
      doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
      doc.text("VALID UNTIL", leftMargin, y);
      doc.font(fontRegular).fontSize(10).fillColor(DARK);
      doc.text(validUntil, leftMargin + 80, y);
    }

    y += 36;

    // ─── Heading + flowing description (matches the web quote page) ──────
    // Single-product quotes show "Your Quote" (the product is named in the
    // description line below). Tiered quotes show the product-agnostic heading
    // and list the options in the pricing section, matching the web tier cards.
    doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
      .strokeColor(RULE).lineWidth(0.5).stroke();
    y += 20;

    const isTiered = !!(data.allTiers && data.allTiers.length > 1);
    const heading = data.invoiceNumber ? "Your Invoice" : isTiered ? "Your Options" : "Your Quote";
    doc.font(fontBold).fontSize(16).fillColor(BLACK);
    doc.text(heading, leftMargin, y);
    y += 26;

    // Flowing description lines: identical to the web page. These already
    // include the carpet line, the separate underlay line, and the scope items
    // as natural sentences. A cream accent bar mirrors the web page's left border.
    const descLines = (data.descriptionLines ?? []).filter((l) => l && l.trim());
    if (descLines.length > 0) {
      const barTop = y;
      const barX = leftMargin;
      const textX = leftMargin + 14;
      const textWidth = pageWidth - 14;
      for (const line of descLines) {
        doc.font(fontRegular).fontSize(11).fillColor(DARK);
        const h = doc.heightOfString(line, { width: textWidth, lineGap: 2 });
        // Page-break guard: draw the accent bar for the current segment, break,
        // then continue on the next page.
        if (y + h > SAFE_BOTTOM) {
          doc.moveTo(barX, barTop).lineTo(barX, y - 4)
            .strokeColor(CREAM).lineWidth(3).stroke();
          drawPageFooter(pageCount);
          doc.addPage();
          pageCount++;
          y = 60;
        }
        doc.font(fontRegular).fontSize(11).fillColor(DARK);
        doc.text(line, textX, y, { width: textWidth, lineGap: 2 });
        y += h + 8;
      }
      // Cream accent bar down the left of the description block (final segment).
      doc.moveTo(barX, barTop).lineTo(barX, y - 6)
        .strokeColor(CREAM).lineWidth(3).stroke();
      y += 6;
    } else {
      // Fallback for legacy quotes with no description lines: keep the old
      // labelled scope list so nothing is lost.
      for (const item of data.scopeOfWorks) {
        y = ensureSpace(20, y);
        doc.font(fontRegular).fontSize(10).fillColor(DARK);
        doc.text(item.title, leftMargin, y);
        if (item.description) {
          doc.font(fontRegular).fontSize(9).fillColor(MID);
          doc.text(item.description, leftMargin + 160, y, { width: pageWidth - 160 });
        }
        y += 16;
      }
      y += 4;
    }

    // Product specifications in small, subtle text (matches the web spec line).
    if (!isTiered) {
      const specParts: string[] = [];
      const productLabel = [data.manufacturer, data.productName].filter(Boolean).join(" ").trim();
      if (productLabel) specParts.push(productLabel);
      if (data.fibre) specParts.push(data.fibre);
      if (data.pileType) specParts.push(data.pileType);
      if (data.colourName) specParts.push(data.colourName);
      if (specParts.length > 0) {
        y = ensureSpace(20, y);
        doc.font(fontRegular).fontSize(8.5).fillColor(LIGHT);
        doc.text(specParts.join("   ·   "), leftMargin, y, { width: pageWidth });
        y += 18;
      }
    }

    y += 8;

    // ─── Pricing ─────────────────────────────────────────────────
    y = ensureSpace(120, y);
    doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
      .strokeColor(BLACK).lineWidth(0.75).stroke();
    y += 16;

    doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
    doc.text("PRICING", leftMargin, y);
    y += 20;

    if (data.rooms && data.rooms.length > 0) {
      // Room itemisation
      for (const room of data.rooms) {
        y = ensureSpace(22, y);
        doc.font(fontRegular).fontSize(10).fillColor(DARK);
        doc.text(`${room.name}: Supply & installation`, leftMargin, y, { width: pageWidth * 0.65 });
        doc.font(fontRegular).fontSize(10).fillColor(BLACK);
        doc.text(formatPrice(room.price), rightEdge - 100, y, { width: 100, align: "right" });
        y += 18;
        doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
          .strokeColor(RULE).lineWidth(0.3).stroke();
        y += 8;
      }
    } else if (data.allTiers && data.allTiers.length > 1) {
      // Multi-tier pricing
      for (const tier of data.allTiers) {
        y = ensureSpace(22, y);
        doc.font(fontRegular).fontSize(10).fillColor(DARK);
        doc.text(`${tier.name}: Supply & installation`, leftMargin, y, { width: pageWidth * 0.65 });
        doc.font(fontRegular).fontSize(10).fillColor(BLACK);
        doc.text(formatPrice(tier.price) + " inc GST", rightEdge - 140, y, { width: 140, align: "right" });
        y += 18;
        doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
          .strokeColor(RULE).lineWidth(0.3).stroke();
        y += 8;
      }
      // Note for multi-tier
      y += 4;
      doc.font(fontItalic).fontSize(9).fillColor(MID);
      doc.text("Select one option to proceed. Prices include GST.", leftMargin, y);
      y += 20;
    } else {
      // Single product pricing
      doc.font(fontRegular).fontSize(10).fillColor(DARK);
      doc.text("Carpet supply & installation", leftMargin, y, { width: pageWidth * 0.65 });
      doc.font(fontRegular).fontSize(10).fillColor(BLACK);
      doc.text(formatPrice(Math.round(data.basePrice / 1.1)), rightEdge - 100, y, { width: 100, align: "right" });
      y += 18;
      doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
        .strokeColor(RULE).lineWidth(0.3).stroke();
      y += 8;
    }

    // Add-ons
    for (const addon of data.addons) {
      y = ensureSpace(22, y);
      doc.font(fontRegular).fontSize(10).fillColor(DARK);
      doc.text(addon.title, leftMargin, y, { width: pageWidth * 0.65 });
      doc.font(fontRegular).fontSize(10).fillColor(BLACK);
      doc.text(formatPrice(Math.round(addon.price / 1.1)), rightEdge - 100, y, { width: 100, align: "right" });
      y += 18;
      doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
        .strokeColor(RULE).lineWidth(0.3).stroke();
      y += 8;
    }

    // Total (for single-tier / rooms only)
    if (!data.allTiers || data.allTiers.length <= 1) {
      y += 4;
      // GST line
      doc.font(fontRegular).fontSize(9).fillColor(MID);
      doc.text("GST (10%)", leftMargin, y, { width: pageWidth * 0.65 });
      doc.text(formatPrice(Math.round(data.grandTotal / 11)), rightEdge - 100, y, { width: 100, align: "right" });
      y += 18;

      // Total
      doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
        .strokeColor(BLACK).lineWidth(0.75).stroke();
      y += 10;
      doc.font(fontBold).fontSize(12).fillColor(BLACK);
      doc.text("Total (inc GST)", leftMargin, y, { width: pageWidth * 0.65 });
      doc.font(fontBold).fontSize(14).fillColor(BLACK);
      doc.text(formatPrice(data.grandTotal), rightEdge - 120, y, { width: 120, align: "right" });
      y += 28;
    }

    // ─── Deposit / Payment Terms ─────────────────────────────────
    if (!data.isAgent) {
      y = ensureSpace(50, y);
      const summaryTotal = (data.allTiers && data.allTiers.length > 1)
        ? data.allTiers[0]!.price
        : data.grandTotal;
      const summaryDepositPct = (data.allTiers && data.allTiers.length > 1)
        ? data.allTiers[0]!.depositPercent
        : data.depositPercent;
      const deposit = Math.round(summaryTotal * (summaryDepositPct / 100));
      const balance = summaryTotal - deposit;

      if (summaryDepositPct > 0) {
        doc.font(fontRegular).fontSize(9).fillColor(MID);
        doc.text(`${summaryDepositPct}% non-refundable deposit`, leftMargin, y);
        doc.text(formatPrice(deposit), rightEdge - 100, y, { width: 100, align: "right" });
        y += 16;
        doc.text("Balance on practical completion", leftMargin, y);
        doc.text(formatPrice(balance), rightEdge - 100, y, { width: 100, align: "right" });
        y += 24;
      }
    }

    // ─── Banking Details ─────────────────────────────────────────
    y = ensureSpace(100, y);
    doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
      .strokeColor(RULE).lineWidth(0.5).stroke();
    y += 16;

    doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
    doc.text("BANKING DETAILS", leftMargin, y);
    y += 20;

    const bankRows: [string, string][] = [
      ["Account Name", "Bell Spec Pty Ltd"],
      ["BSB", "124 022"],
      ["Account Number", "22496442"],
      ["Reference", data.invoiceNumber ?? data.quoteNumber],
    ];

    for (const [label, value] of bankRows) {
      doc.font(fontRegular).fontSize(9).fillColor(MID);
      doc.text(label, leftMargin, y, { width: 120 });
      doc.font(fontRegular).fontSize(10).fillColor(DARK);
      doc.text(value, leftMargin + 120, y);
      y += 16;
    }

    y += 12;

    // Payment note
    const paymentNote = data.isAgent
      ? "Full payment is due upon practical completion. Please send remittances to hello@bellcarpets.com.au"
      : `Payment due within ${data.validDays} days. Please send remittances to hello@bellcarpets.com.au`;
    doc.font(fontRegular).fontSize(9).fillColor(MID);
    doc.text(paymentNote, leftMargin, y, { width: pageWidth });
    y += 24;

    // ABN
    doc.font(fontRegular).fontSize(7.5).fillColor(LIGHT);
    doc.text(
      "Bell Spec Pty Ltd  ·  ABN 74 613 299 773  ·  Unit 1, 41 Olympic Circuit, Southport QLD 4215",
      leftMargin, y, { width: pageWidth, align: "center" }
    );
    y += 12;

    // Tax invoice note — only shown on quotes, not on invoice PDFs
    if (!data.invoiceNumber) {
      const taxNote = data.isAgent
        ? "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon completion of works."
        : (data.depositPercent ?? 50) === 0
        ? "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon completion of works."
        : "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon receipt of deposit.";
      doc.font(fontItalic).fontSize(7.5).fillColor(LIGHT);
      doc.text(taxNote, leftMargin, y, { width: pageWidth, align: "center" });
    }

    // Page 1 Footer
    drawPageFooter(pageCount);

    // ═══════════════════════════════════════════════════════════════
    // T&C PAGES
    // ═══════════════════════════════════════════════════════════════
    const depPct = data.depositPercent ?? 50;
    const balPct = 100 - depPct;
    const isInvoiceDoc = !!data.invoiceNumber;
    // Invoice PDFs use simple payment language; quote PDFs use the full quote-specific text.
    const financialCommitmentItems = isInvoiceDoc
      ? [
          {
            label: "Payment Terms",
            text: "Payment of the remaining balance is due on completion of works. Payment is to be made by direct bank transfer.",
          },
        ]
      : data.isAgent
      ? [
          {
            label: "Payment Terms",
            text: "Full payment of the invoice total is strictly due upon practical completion of the installation on the scheduled day. Materials will not be ordered until written acceptance of this quotation is received.",
          },
          {
            label: "Invoicing",
            text: "A tax invoice will be issued upon completion of works. Payment is to be made by direct bank transfer within 7 days of invoice date.",
          },
        ]
      : depPct === 0
      ? [
          {
            label: "Payment Terms",
            text: "Full payment is due upon practical completion of the installation. A tax invoice will be issued upon completion of works.",
          },
        ]
      : [
          {
            label: "Deposit",
            text: `A non-refundable deposit of ${depPct}% of the total quoted amount is required to confirm your booking and order materials. Materials will not be ordered until the deposit is received.`,
          },
          {
            label: "Balance",
            text: `The remaining ${balPct}% is due upon practical completion of the installation on the scheduled day.`,
          },
        ];

    const tcSections = [
      {
        title: "Financial Commitment",
        items: financialCommitmentItems,
      },
      {
        title: "Scheduling & Access",
        items: [
          { label: "Lead Time", text: "Installation dates are subject to material availability. Typical lead time is 5 to 10 business days from deposit receipt." },
          { label: "Site Access", text: "Clear and safe access to the installation area must be provided. Furniture must be removed from the work area prior to the scheduled installation date unless a furniture removal add-on has been included in this quote." },
          { label: "Subfloor", text: "Subfloor must be structurally sound, dry, and level. Any remediation required beyond normal preparation (e.g. levelling compound, moisture barriers) will be quoted separately." },
        ],
      },
      {
        title: "Variations & Cancellations",
        items: [
          { label: "Variations", text: "Any changes to the scope of works after acceptance must be agreed in writing. Additional costs will be quoted and confirmed before proceeding." },
          { label: "Cancellation", text: "If you cancel after materials have been ordered, you forfeit the deposit. If materials have been cut or customised, the full material cost is non-refundable." },
        ],
      },
      {
        title: "Warranty & Liability",
        items: [
          { label: "Installation Guarantee", text: "All installations are guaranteed for life against installation defects. This does not cover damage caused by misuse, flooding, or failure to follow manufacturer care instructions." },
          { label: "Manufacturer Warranty", text: "Product warranties are provided by the manufacturer and are separate from our installation guarantee. Warranty documentation will be provided upon completion." },
          { label: "Limitation", text: "Our liability is limited to the quoted amount. We are not liable for consequential loss, loss of use, or damage to existing fixtures unless caused by our negligence." },
        ],
      },
      {
        title: "General",
        items: [
          ...(isInvoiceDoc ? [] : [{ label: "Quote Validity", text: `This quote is valid for ${data.validDays} days from the issue date. After expiry, pricing may be subject to change.` }]),
          { label: "Colour Variation", text: "Carpet and flooring products may vary slightly in colour from samples due to dye lot variations. This is normal and not a defect." },
          { label: "Governing Law", text: "This agreement is governed by the laws of Queensland, Australia." },
        ],
      },
    ];

    // Start T&C on new page
    drawPageFooter(pageCount);
    doc.addPage();
    pageCount++;
    y = 60;

    // T&C header
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, leftMargin, y, { height: 24 });
      } catch {
        doc.font(fontBold).fontSize(14).fillColor(BLACK);
        doc.text("BELL CARPETS", leftMargin, y + 4);
      }
    }

    doc.font(fontRegular).fontSize(9).fillColor(MID);
    doc.text("Terms and Conditions", rightEdge - 160, y + 8, { width: 160, align: "right" });
    doc.font(fontRegular).fontSize(8).fillColor(LIGHT);
    doc.text(`Reference: ${data.invoiceNumber ?? data.quoteNumber}`, rightEdge - 160, y + 20, { width: 160, align: "right" });

    y += 44;
    doc.moveTo(leftMargin, y).lineTo(rightEdge, y)
      .strokeColor(BLACK).lineWidth(0.5).stroke();
    y += 20;

    // Render T&C sections
    for (const section of tcSections) {
      y = ensureSpace(60, y);
      if (y <= 60) {
        // New page — add mini header
        if (logoBuffer) {
          try { doc.image(logoBuffer, leftMargin, 60, { height: 20 }); } catch {}
        }
        y = 90;
      }

      doc.font(fontBold).fontSize(10).fillColor(BLACK);
      doc.text(section.title, leftMargin, y);
      y += 18;

      for (const item of section.items) {
        y = ensureSpace(40, y);
        if (y <= 60) {
          if (logoBuffer) {
            try { doc.image(logoBuffer, leftMargin, 60, { height: 20 }); } catch {}
          }
          y = 90;
        }

        doc.font(fontBold).fontSize(9).fillColor(DARK);
        doc.text(item.label, leftMargin, y);
        y += 13;
        doc.font(fontRegular).fontSize(9).fillColor(MID);
        const textHeight = doc.heightOfString(item.text, { width: pageWidth - 12 });
        doc.text(item.text, leftMargin + 12, y, { width: pageWidth - 12 });
        y += textHeight + 10;
      }

      y += 8;
    }

    // Custom terms from quote config
    if (data.terms && data.terms.length > 0) {
      y = ensureSpace(40, y);
      doc.font(fontBold).fontSize(10).fillColor(BLACK);
      doc.text("Additional Terms", leftMargin, y);
      y += 18;

      for (const term of data.terms) {
        y = ensureSpace(24, y);
        doc.font(fontRegular).fontSize(9).fillColor(MID);
        doc.text(`·  ${term}`, leftMargin + 12, y, { width: pageWidth - 12 });
        y += 16;
      }
    }

    // Final footer on last page
    drawPageFooter(pageCount);

    doc.end();
  });
}
