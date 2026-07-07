/**
 * Invoice PDF Generator — Bell Carpets
 *
 * Layout: exactly 2 pages.
 *   Page 1: Header, Prepared For, Property, Scope, Product, Pricing, Banking
 *   Page 2: Terms & Conditions (condensed)
 *
 * Design: EB Garamond serif, black & white, tight but generous whitespace.
 * No colour, no gradients. Architectural firm aesthetic.
 *
 * Vertical rhythm: content is distributed evenly across each page so that
 * sections breathe and the page feels intentionally designed, not crammed
 * at the top with empty space below.
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
  descriptionLines?: string[];
  quoteType?: string;
  isSingleProduct?: boolean;
}

// ─── Palette ──────────────────────────────────────────────────────
const BLACK  = "#000000";
const DARK   = "#1a1a1a";
const MID    = "#666666";
const LIGHT  = "#999999";
const RULE   = "#e0e0e0";

// Local logo (served from server/fonts/)
const LOGO_LOCAL = path.join(__dirname, "fonts", "logo.jpg");
const LOGO_URL   = "https://quote.bellcarpets.com.au/images/logo.jpg";

const FONT_DIR     = path.join(__dirname, "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "EBGaramond-Variable.ttf");
const FONT_ITALIC  = path.join(FONT_DIR, "EBGaramond-Italic-Variable.ttf");

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU", { minimumFractionDigits: 0 });
}

async function loadLogo(): Promise<Buffer | null> {
  try {
    if (fs.existsSync(LOGO_LOCAL)) return fs.readFileSync(LOGO_LOCAL);
    return await new Promise((resolve, reject) => {
      const client = LOGO_URL.startsWith("https") ? https : http;
      client.get(LOGO_URL, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          loadLogo().then(resolve).catch(reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const logoBuffer = await loadLogo();
  const hasFont    = fs.existsSync(FONT_REGULAR);
  const hasItalic  = fs.existsSync(FONT_ITALIC);

  return new Promise<Buffer>((resolve, reject) => {
    // ── Document setup ────────────────────────────────────────────
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: true,
      bufferPages: true,
      info: {
        Title: `Bell Carpets — ${data.invoiceNumber ?? data.quoteNumber}`,
        Author: "Bell Carpets",
      },
    });

    if (hasFont)   doc.registerFont("G",  FONT_REGULAR);
    if (hasItalic) doc.registerFont("GI", FONT_ITALIC);

    const R  = hasFont   ? "G"  : "Helvetica";
    const B  = hasFont   ? "G"  : "Helvetica-Bold";   // Garamond variable renders bold at larger sizes
    const I  = hasItalic ? "GI" : "Helvetica-Oblique";

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Page geometry ─────────────────────────────────────────────
    const PW = doc.page.width;   // 595.28
    const PH = doc.page.height;  // 841.89
    const ML = 48;               // left margin
    const MR = 48;               // right margin
    const CW = PW - ML - MR;     // content width  ≈ 499
    const RE = ML + CW;          // right edge

    // ── Helpers ───────────────────────────────────────────────────
    const hRule = (y: number, weight = 0.5, color = RULE) => {
      doc.moveTo(ML, y).lineTo(RE, y).strokeColor(color).lineWidth(weight).stroke();
    };

    const label = (text: string, x: number, y: number, w = CW) => {
      doc.font(R).fontSize(7).fillColor(LIGHT).text(text, x, y, { width: w });
    };

    const body = (text: string, x: number, y: number, w = CW, opts: object = {}) => {
      doc.font(R).fontSize(9.5).fillColor(DARK).text(text, x, y, { width: w, ...opts });
    };

    const lineH = (text: string, size: number, x: number, y: number, w = CW, opts: object = {}) => {
      doc.font(R).fontSize(size).fillColor(DARK).text(text, x, y, { width: w, ...opts });
    };

    const priceRow = (desc: string, amount: string, y: number, bold = false) => {
      doc.font(bold ? B : R).fontSize(bold ? 10.5 : 9.5).fillColor(bold ? BLACK : DARK);
      doc.text(desc, ML, y, { width: CW * 0.65 });
      doc.font(bold ? B : R).fontSize(bold ? 11 : 9.5).fillColor(BLACK);
      doc.text(amount, RE - 90, y, { width: 90, align: "right" });
    };

    const subtleRow = (desc: string, amount: string, y: number) => {
      doc.font(R).fontSize(8.5).fillColor(MID);
      doc.text(desc, ML, y, { width: CW * 0.65 });
      doc.text(amount, RE - 90, y, { width: 90, align: "right" });
    };

    // ══════════════════════════════════════════════════════════════
    // PAGE 1 — generous vertical distribution
    // ══════════════════════════════════════════════════════════════

    // Section gaps — tuned so content fills the full page height.
    // A4 usable: y=52 to footer at ~808 = ~756pt available.
    const S1 = 48;   // after header block (logo + company line + rule) → client details
    const S2 = 40;   // after client details → scope section
    const S3 = 40;   // after scope → pricing
    const S4 = 40;   // after pricing → banking
    const S5 = 28;   // after banking → payment note
    const SCOPE_LINE_GAP = 24;  // between scope description lines

    let y = 52;

    // ── Logo ──────────────────────────────────────────────────────
    if (logoBuffer) {
      try { doc.image(logoBuffer, ML, y, { height: 28 }); }
      catch { doc.font(B).fontSize(16).fillColor(BLACK).text("BELL CARPETS", ML, y + 6); }
    } else {
      doc.font(B).fontSize(16).fillColor(BLACK).text("BELL CARPETS", ML, y + 6);
    }

    // ── Doc type + number (top right) ─────────────────────────────
    const docLabel  = data.invoiceNumber ? "INVOICE" : "QUOTE";
    const docNumber = data.invoiceNumber ?? data.quoteNumber;
    doc.font(R).fontSize(7).fillColor(LIGHT).text(docLabel, RE - 130, y, { width: 130, align: "right" });
    doc.font(B).fontSize(13).fillColor(BLACK).text(docNumber, RE - 130, y + 10, { width: 130, align: "right" });
    doc.font(R).fontSize(8).fillColor(MID).text(data.issueDate, RE - 130, y + 26, { width: 130, align: "right" });

    y += 44;

    // ── Company details line ───────────────────────────────────────
    doc.font(R).fontSize(7).fillColor(LIGHT)
      .text("Bell Spec Pty Ltd  |  ABN 74 613 299 773  |  Unit 1, 41 Olympic Circuit, Southport QLD 4215",
        ML, y, { width: CW });
    y += 14;

    // ── Heavy rule ────────────────────────────────────────────────
    hRule(y, 1.5, BLACK);
    y += S1;

    // ── Two-column: Prepared For (left) | Property (right) ────────
    const colW = CW * 0.48;
    const col2 = ML + CW * 0.52;

    const preparedFor = data.clientName?.trim() || data.agentName || "";
    label("PREPARED FOR", ML, y);
    if (data.propertyAddress) label("PROPERTY", col2, y);
    y += 14;
    doc.font(B).fontSize(11).fillColor(BLACK).text(preparedFor, ML, y, { width: colW });
    if (data.propertyAddress) {
      doc.font(R).fontSize(9.5).fillColor(DARK).text(data.propertyAddress, col2, y, { width: colW });
    }
    y += 28;

    // ── Thin rule ─────────────────────────────────────────────────
    hRule(y, 0.5);
    y += S2;

    // ── Scope of works ────────────────────────────────────────────
    label("SCOPE OF WORKS", ML, y);
    y += 16;

    const descLines = (data.descriptionLines ?? []).filter(l => l?.trim());
    const scopeLines = descLines.length > 0
      ? descLines
      : (data.scopeOfWorks ?? []).map(i => i.description?.trim() || i.title?.trim() || "").filter(Boolean);
    for (const line of scopeLines) {
      doc.font(R).fontSize(9.5).fillColor(DARK).text(line, ML, y, { width: CW, lineGap: 1 });
      y += SCOPE_LINE_GAP;
    }

    // ── Product spec line ─────────────────────────────────────────
    const isTiered = !!(data.allTiers && data.allTiers.length > 1);
    if (!isTiered) {
      const specParts: string[] = [];
      const prodLabel = [data.manufacturer, data.productName].filter(Boolean).join(" ").trim();
      if (prodLabel)    specParts.push(prodLabel);
      if (data.fibre)   specParts.push(data.fibre);
      if (data.pileType) specParts.push(data.pileType);
      if (specParts.length > 0) {
        y += 8;
        doc.font(I).fontSize(8.5).fillColor(MID)
          .text(specParts.join("  ·  "), ML, y, { width: CW });
        y += 18;
      }
    }

    y += S3;

    // ── Pricing ───────────────────────────────────────────────────
    hRule(y, 1, BLACK);
    y += 18;
    label("PRICING", ML, y);
    y += 18;

    if (data.rooms && data.rooms.length > 0) {
      for (const room of data.rooms) {
        priceRow(room.name, fmt(room.price), y);
        y += 22;
        hRule(y, 0.3);
        y += 10;
      }
    } else if (isTiered) {
      for (const tier of data.allTiers!) {
        const spec = [tier.manufacturer, tier.productName].filter(Boolean).join(" ").trim();
        priceRow(tier.name + (spec ? `:  ${spec}` : ""), fmt(tier.price) + " inc GST", y);
        y += 22;
        hRule(y, 0.3);
        y += 10;
      }
      y += 8;
      doc.font(I).fontSize(8.5).fillColor(MID)
        .text("Select one option to proceed. Prices include GST.", ML, y);
      y += 20;
    } else {
      // Single product: show supply & install ex-GST
      const exGst = Math.round(data.basePrice / 1.1);
      priceRow("Supply & installation", fmt(exGst), y);
      y += 22;
      hRule(y, 0.3);
      y += 10;
    }

    // Add-ons
    for (const addon of data.addons) {
      priceRow(addon.title, fmt(Math.round(addon.price / 1.1)), y);
      y += 22;
      hRule(y, 0.3);
      y += 10;
    }

    // Subtotal / GST / Total
    if (!isTiered) {
      y += 10;
      const subtotalEx = Math.round(data.grandTotal / 1.1);
      const gstAmt     = data.grandTotal - subtotalEx;
      subtleRow("Subtotal (ex GST)", fmt(subtotalEx), y);
      y += 18;
      subtleRow("GST (10%)", fmt(gstAmt), y);
      y += 18;
      hRule(y, 1, BLACK);
      y += 12;
      priceRow("Total (inc GST)", fmt(data.grandTotal), y, true);
      y += 28;

      // Deposit / balance
      const depPct = data.depositPercent ?? 0;
      if (depPct > 0) {
        const dep = Math.round(data.grandTotal * (depPct / 100));
        const bal = data.grandTotal - dep;
        subtleRow(`Deposit (${depPct}%)`, fmt(dep), y);
        y += 16;
        subtleRow("Balance on completion", fmt(bal), y);
        y += 20;
      }
    }

    y += S4;

    // ── Banking details (page 1) ──────────────────────────────────
    hRule(y, 0.5);
    y += 18;
    label("BANKING DETAILS", ML, y);
    y += 16;

    const bankRows: [string, string][] = [
      ["Account Name",   "Bell Spec Pty Ltd"],
      ["BSB",            "124 022"],
      ["Account Number", "22496442"],
      ["Reference",      docNumber],
    ];
    const bLabelW = 100;
    for (const [lbl, val] of bankRows) {
      doc.font(R).fontSize(8.5).fillColor(MID).text(lbl, ML, y, { width: bLabelW });
      doc.font(R).fontSize(9.5).fillColor(DARK).text(val, ML + bLabelW, y, { width: CW - bLabelW });
      y += 22;
    }

    y += S5;

    // ── Payment terms ─────────────────────────────────────────────
    doc.font(R).fontSize(8.5).fillColor(MID)
      .text("Payment due on completion of works. Please send remittances to hello@bellcarpets.com.au",
        ML, y, { width: CW });
    y += 22;

    // Tax invoice note (quotes only)
    if (!data.invoiceNumber) {
      const taxNote = (data.isAgent || (data.depositPercent ?? 50) === 0)
        ? "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon completion of works."
        : "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon receipt of deposit.";
      doc.font(I).fontSize(7.5).fillColor(LIGHT).text(taxNote, ML, y, { width: CW, align: "center" });
      y += 12;
    }

    // ── Page 1 footer ─────────────────────────────────────────────
    const f1y = PH - 28;
    hRule(f1y - 6, 0.5);
    doc.font(R).fontSize(7).fillColor(LIGHT).text("Bell Carpets", ML, f1y, { width: CW * 0.5 });
    doc.font(R).fontSize(7).fillColor(LIGHT).text("Page 1", ML, f1y, { width: CW, align: "right" });

    // ══════════════════════════════════════════════════════════════
    // PAGE 2: T&C — balanced to fill the page without overflow
    // ══════════════════════════════════════════════════════════════
    doc.addPage();
    y = 52;

    // ── Page 2 logo + heading ─────────────────────────────────────
    if (logoBuffer) {
      try { doc.image(logoBuffer, ML, y, { height: 22 }); }
      catch { doc.font(B).fontSize(13).fillColor(BLACK).text("BELL CARPETS", ML, y + 4); }
    }
    doc.font(R).fontSize(8).fillColor(MID)
      .text("Terms & Conditions", RE - 130, y + 6, { width: 130, align: "right" });
    doc.font(R).fontSize(7).fillColor(LIGHT)
      .text(`Ref: ${docNumber}`, RE - 130, y + 18, { width: 130, align: "right" });

    y += 40;
    hRule(y, 0.5, BLACK);
    y += 22;

    // ── T&C sections ──────────────────────────────────────────────
    const isInvoiceDoc = !!data.invoiceNumber;
    const depPct = data.depositPercent ?? 50;
    const balPct = 100 - depPct;

    const financialItems = isInvoiceDoc
      ? [{ label: "Payment Terms", text: "Payment of the remaining balance is due on completion of works. Payment is to be made by direct bank transfer." }]
      : data.isAgent
      ? [
          { label: "Payment Terms", text: "Full payment is strictly due upon practical completion of the installation on the scheduled day. Materials will not be ordered until written acceptance is received." },
          { label: "Invoicing",     text: "A tax invoice will be issued upon completion of works. Payment is to be made by direct bank transfer within 7 days of invoice date." },
        ]
      : depPct === 0
      ? [{ label: "Payment Terms", text: "Full payment is due upon practical completion of the installation. A tax invoice will be issued upon completion of works." }]
      : [
          { label: "Deposit", text: `A non-refundable deposit of ${depPct}% is required to confirm your booking and order materials.` },
          { label: "Balance", text: `The remaining ${balPct}% is due upon practical completion of the installation on the scheduled day.` },
          { label: "Urgent Works", text: "If the job is to be completed within 10 business days, the deposit must be paid in full before works commence." },
        ];

    const tcSections = [
      { title: "Financial Commitment", items: financialItems },
      { title: "Scheduling & Access", items: [
          { label: "Lead Time",   text: "Installation dates are subject to material availability. Typical lead time is 5 to 10 business days from deposit receipt." },
          { label: "Site Access", text: "Clear and safe access must be provided. Furniture must be removed from the work area prior to the installation date unless a furniture removal add-on is included." },
          { label: "Subfloor",   text: "Subfloor must be structurally sound, dry, and level. Any remediation required beyond normal preparation will be quoted separately." },
        ]},
      { title: "Variations & Cancellations", items: [
          { label: "Variations",   text: "Any changes to the scope of works after acceptance must be agreed in writing. Additional costs will be quoted and confirmed before proceeding." },
          { label: "Cancellation", text: "If you cancel after materials have been ordered, you forfeit the deposit. If materials have been cut or customised, the full material cost is non-refundable." },
        ]},
      { title: "Warranty & Liability", items: [
          { label: "Installation Guarantee", text: "All installations are guaranteed for life against installation defects. This does not cover damage caused by misuse, flooding, or failure to follow manufacturer care instructions." },
          { label: "Manufacturer Warranty", text: "Product warranties are provided by the manufacturer and are separate from our installation guarantee." },
          { label: "Limitation",            text: "Our liability is limited to the quoted amount. We are not liable for consequential loss or damage to existing fixtures unless caused by our negligence." },
        ]},
      { title: "General", items: [
          ...(isInvoiceDoc ? [] : [{ label: "Quote Validity", text: `This quote is valid for ${data.validDays} days from the issue date.` }]),
          { label: "Colour Variation", text: "Carpet and flooring products may vary slightly in colour from samples due to dye lot variations. This is normal and not a defect." },
          { label: "Governing Law",    text: "This agreement is governed by the laws of Queensland, Australia." },
        ]},
    ];

    // T&C spacing constants — balanced to fill page without overflow
    const TC_SECTION_GAP = 22;     // space between sections
    const TC_TITLE_GAP = 14;       // space after section title before first item
    const TC_ITEM_GAP = 10;        // extra space after each item
    const TC_LINE_GAP = 1.5;       // lineGap within text blocks

    // Render T&C in a compact two-column label/text style
    for (let si = 0; si < tcSections.length; si++) {
      const section = tcSections[si];

      // Section heading
      doc.font(B).fontSize(9).fillColor(BLACK).text(section.title, ML, y);
      y += TC_TITLE_GAP;

      for (const item of section.items) {
        const labelW2 = 110;
        const textW2  = CW - labelW2;
        const textH   = doc.heightOfString(item.text, { width: textW2, lineGap: TC_LINE_GAP });
        const rowH    = Math.max(13, textH);

        doc.font(B).fontSize(8.5).fillColor(DARK).text(item.label, ML, y, { width: labelW2 });
        doc.font(R).fontSize(8.5).fillColor(MID).text(item.text, ML + labelW2, y, { width: textW2, lineGap: TC_LINE_GAP });
        y += rowH + TC_ITEM_GAP;
      }

      // Add section gap (except after last section)
      if (si < tcSections.length - 1) {
        y += TC_SECTION_GAP;
      }
    }

    // Custom terms
    if (data.terms && data.terms.length > 0) {
      y += TC_SECTION_GAP;
      doc.font(B).fontSize(9).fillColor(BLACK).text("Additional Terms", ML, y);
      y += TC_TITLE_GAP;
      for (const term of data.terms) {
        const h = doc.heightOfString(`·  ${term}`, { width: CW - 12, lineGap: TC_LINE_GAP });
        doc.font(R).fontSize(8.5).fillColor(MID).text(`·  ${term}`, ML + 12, y, { width: CW - 12, lineGap: TC_LINE_GAP });
        y += h + TC_ITEM_GAP;
      }
    }

    // ── Page 2 footer ─────────────────────────────────────────────
    const f2y = PH - 28;
    hRule(f2y - 6, 0.5);
    doc.font(R).fontSize(7).fillColor(LIGHT).text("Bell Carpets", ML, f2y, { width: CW * 0.5 });
    doc.font(R).fontSize(7).fillColor(LIGHT).text("Page 2", ML, f2y, { width: CW, align: "right" });

    doc.end();
  });
}
