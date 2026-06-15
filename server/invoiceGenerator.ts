/**
 * Invoice PDF Generator — creates a branded Bell Carpets quote PDF
 * Uses PDFKit for server-side generation.
 *
 * Page 1: Quote details, pricing, banking details
 * Page 2+: Full Terms & Conditions (auto-paginates without blank pages)
 * Every page: footer with "BELL CARPETS | ESTABLISHED 1987" and "RESIDENTIAL | COMMERCIAL | PROJECTS"
 *
 * Printer-friendly: white background, black/dark text, champagne gold accents.
 */

import PDFDocument from "pdfkit";
import https from "https";
import http from "http";
import { formatAESTDate, nowAEST } from "../shared/aestUtils";

export interface InvoiceData {
  quoteNumber: string;
  invoiceNumber?: string; // When set, PDF shows "INVOICE INV-XXX" instead of "QUOTE BC-XXX"
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

  /** For homeowner quotes with room itemisation: array of rooms with individual prices.
   * When present, the PDF shows a room-by-room breakdown instead of a single product line.
   */
  rooms?: { id: string; name: string; price: number }[];

  /** For agent/tiered quotes: all tiers to show in the PDF comparison layout.
   * When present, overrides the single-tier product section with a multi-tier layout.
   * NOTE: rooms and allTiers are mutually exclusive — rooms for homeowner, allTiers for agent.
   */
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

  /** When true, hides deposit/balance breakdown and uses agent-specific T&C payment terms */
  isAgent?: boolean;
}

// ─── Printer-Friendly Palette ─────────────────────────────────────
const WHITE        = "#FFFFFF";
const PAGE_BG      = "#FFFFFF";
const INK_BLACK    = "#111111";
const INK_DARK     = "#222222";
const INK_MID      = "#555555";
const INK_LIGHT    = "#888888";
const RULE_LIGHT   = "#DDDDDD";
const RULE_DARK    = "#AAAAAA";
const ROW_ALT      = "#F7F7F5";
const CHAMPAGNE    = "#B8965A";
const HEADER_BG    = "#111111";

// Logo — dark version for white backgrounds
const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg";

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

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 50, right: 50 },
      autoFirstPage: true,
      bufferPages: true,   // ← key: buffer all pages so we can patch footers
      info: {
        Title: `Bell Carpets — ${data.quoteNumber}`,
        Author: "Bell Carpets",
        Subject: `Quote ${data.quoteNumber}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth  = doc.page.width - 100;   // 50 left + 50 right
    const leftMargin = 50;
    const fullWidth  = doc.page.width;
    const pageHeight = doc.page.height;
    const FOOTER_H   = 40;                       // reserved at bottom of every page
    const SAFE_BOTTOM = pageHeight - FOOTER_H;   // content must stay above this

    let pageCount = 1;

    // ─── Helper: draw page footer ─────────────────────────────────
    function drawPageFooter(pageNum: number) {
      const footerY = pageHeight - 30;
      doc.moveTo(leftMargin, footerY - 8)
        .lineTo(leftMargin + pageWidth, footerY - 8)
        .strokeColor(CHAMPAGNE).lineWidth(0.5).stroke();

      doc.font("Helvetica-Bold").fontSize(6.5).fillColor(INK_MID);
      doc.text(
        "BELL CARPETS  |  ESTABLISHED 1987",
        leftMargin, footerY,
        { width: pageWidth * 0.5, align: "left", characterSpacing: 0.8 }
      );
      doc.font("Helvetica").fontSize(6).fillColor(INK_LIGHT);
      doc.text(
        "RESIDENTIAL  |  COMMERCIAL  |  PROJECTS",
        leftMargin, footerY + 10,
        { width: pageWidth * 0.5, align: "left", characterSpacing: 0.6 }
      );
      doc.font("Helvetica").fontSize(6.5).fillColor(INK_LIGHT);
      doc.text(
        `Page ${pageNum}`,
        leftMargin + pageWidth * 0.5, footerY + 3,
        { width: pageWidth * 0.5, align: "right" }
      );
    }

    // ─── Helper: section heading ──────────────────────────────────
    function sectionHeading(label: string, yPos: number): number {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(INK_MID);
      doc.text(label, leftMargin, yPos, { characterSpacing: 1.2 });
      const ruleY = yPos + 13;
      doc.moveTo(leftMargin, ruleY).lineTo(leftMargin + pageWidth, ruleY)
        .strokeColor(RULE_DARK).lineWidth(0.5).stroke();
      return ruleY + 8;
    }

    // ─── Helper: start a new T&C page ────────────────────────────
    function startTCPage(isFirst: boolean): number {
      if (!isFirst) {
        drawPageFooter(pageCount);
        doc.addPage();
        pageCount++;
        doc.rect(0, 0, fullWidth, pageHeight).fill(PAGE_BG);
      }

      // Minimal header band
      doc.rect(0, 0, fullWidth, 50).fill(HEADER_BG);
      doc.rect(0, 50, fullWidth, 2).fill(CHAMPAGNE);

      if (logoBuffer) {
        try {
          doc.save();
          doc.rect(leftMargin - 2, 10, 110, 30).fill(WHITE);
          doc.image(logoBuffer, leftMargin, 12, { height: 26 });
          doc.restore();
        } catch {
          doc.font("Helvetica-Bold").fontSize(14).fillColor(WHITE);
          doc.text("BELL CARPETS", leftMargin, 18);
        }
      } else {
        doc.font("Helvetica-Bold").fontSize(14).fillColor(WHITE);
        doc.text("BELL CARPETS", leftMargin, 18);
      }

      doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE);
      doc.text("Standard Terms and Conditions of Trade", leftMargin + pageWidth * 0.35, 20, {
        width: pageWidth * 0.65,
        align: "right",
      });
      doc.font("Helvetica").fontSize(7).fillColor("#999999");
      doc.text(`Reference: ${data.invoiceNumber ?? data.quoteNumber}`, leftMargin + pageWidth * 0.35, 33, {
        width: pageWidth * 0.65,
        align: "right",
      });

      return 68; // content starts here
    }

    // ═══════════════════════════════════════════════════════════════
    // PAGE 1: Quote Details
    // ═══════════════════════════════════════════════════════════════
    doc.rect(0, 0, fullWidth, pageHeight).fill(PAGE_BG);

    // Dark header band
    const headerHeight = 90;
    doc.rect(0, 0, fullWidth, headerHeight).fill(HEADER_BG);
    doc.rect(0, headerHeight, fullWidth, 2).fill(CHAMPAGNE);

    let y = 22;

    // Logo
    if (logoBuffer) {
      try {
        doc.save();
        doc.rect(leftMargin - 2, y - 2, 148, 38).fill(WHITE);
        doc.image(logoBuffer, leftMargin, y, { height: 34 });
        doc.restore();
      } catch {
        doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE);
        doc.text("BELL CARPETS", leftMargin, y + 8);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE);
      doc.text("BELL CARPETS", leftMargin, y + 8);
    }

    // Tagline below logo
    doc.font("Helvetica").fontSize(5.5).fillColor("#888888");
    doc.text("RESIDENTIAL  |  COMMERCIAL  |  PROJECTS", leftMargin, y + 40, {
      width: 160,
      align: "left",
      characterSpacing: 0.8,
    });

    // Quote number (right side of header)
    doc.font("Helvetica").fontSize(7).fillColor("#999999");
    doc.text(data.invoiceNumber ? "INVOICE" : "QUOTE", leftMargin + pageWidth * 0.65, y + 4, {
      width: pageWidth * 0.35,
      align: "right",
      characterSpacing: 1.5,
    });
    doc.font("Helvetica-Bold").fontSize(20).fillColor(WHITE);
    doc.text(data.invoiceNumber ?? data.quoteNumber, leftMargin + pageWidth * 0.65, y + 16, {
      width: pageWidth * 0.35,
      align: "right",
    });

    // Dates (right side)
    const validUntil = calculateValidUntil(data.issueDate, data.validDays);
    doc.font("Helvetica").fontSize(7.5).fillColor("#999999");
    doc.text(`Issued: ${data.issueDate}`, leftMargin + pageWidth * 0.65, y + 42, {
      width: pageWidth * 0.35,
      align: "right",
    });
    if (validUntil) {
      doc.font("Helvetica").fontSize(7.5).fillColor(CHAMPAGNE);
      doc.text(`Valid until: ${validUntil}`, leftMargin + pageWidth * 0.65, y + 54, {
        width: pageWidth * 0.35,
        align: "right",
      });
    }

    // Contact info bar
    y = headerHeight + 10;
    doc.font("Helvetica").fontSize(7).fillColor(INK_LIGHT);
    doc.text(
      "41 Olympic Circuit, Southport QLD 4215  ·  07 5571 1177  ·  hello@bellcarpets.com.au  ·  bellcarpets.com.au",
      leftMargin, y, { width: pageWidth, align: "center" }
    );

    // Client & Property
    y = headerHeight + 28;
    y = sectionHeading("CLIENT & PROPERTY", y);

    const colW = pageWidth / 2 - 12;
    const isHomeowner = !data.isAgent && data.clientType?.includes("Residential");

    if (isHomeowner) {
      // Homeowner: show customer name once (no duplication)
      doc.font("Helvetica").fontSize(7).fillColor(INK_LIGHT);
      doc.text("Customer", leftMargin, y);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK_BLACK);
      doc.text(data.clientName || "—", leftMargin, y + 11, { width: colW });
      doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
      if (data.agentEmail || data.agentPhone) {
        doc.text(
          [data.agentEmail, data.agentPhone].filter(Boolean).join("  ·  "),
          leftMargin, y + 24, { width: pageWidth }
        );
      }
      y += 44;
    } else {
      // Agent/real_estate: show both "Prepared for" (agency) and "Agent Contact" (person)
      doc.font("Helvetica").fontSize(7).fillColor(INK_LIGHT);
      doc.text("Prepared for", leftMargin, y);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK_BLACK);
      doc.text(data.clientName || "—", leftMargin, y + 11, { width: colW });
      doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
      doc.text(data.clientType, leftMargin, y + 24, { width: colW });

      doc.font("Helvetica").fontSize(7).fillColor(INK_LIGHT);
      doc.text("Agent Contact", leftMargin + colW + 24, y);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(INK_BLACK);
      doc.text(data.agentName || "—", leftMargin + colW + 24, y + 11, { width: colW });
      doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
      if (data.agentEmail || data.agentPhone) {
        doc.text(
          [data.agentEmail, data.agentPhone].filter(Boolean).join("  ·  "),
          leftMargin + colW + 24, y + 24, { width: colW }
        );
      }
      y += 44;
    }

    doc.font("Helvetica").fontSize(7).fillColor(INK_LIGHT);
    doc.text("Property", leftMargin, y);
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK_BLACK);
    doc.text(data.propertyAddress || "—", leftMargin, y + 11, { width: colW });

    y += 16;

    // Product Selection — multi-tier or single-tier

    if (data.allTiers && data.allTiers.length > 1) {
      // ── MULTI-TIER COMPARISON LAYOUT ──────────────────────────────
      y = sectionHeading("PRODUCT OPTIONS", y);

      const tierColW = Math.floor(pageWidth / data.allTiers.length);
      const labelRows = data.isAgent
        ? ["Product", "Fibre", "Pile Type", "Price (inc GST)"]
        : ["Product", "Fibre", "Pile Type", "Price (inc GST)", "Deposit Required"];
      const ROW_H = 20;

      // Tier header row
      doc.rect(leftMargin, y, pageWidth, ROW_H).fill(INK_BLACK);
      doc.rect(leftMargin, y, 3, ROW_H).fill(CHAMPAGNE);
      data.allTiers.forEach((tier, ti) => {
        const tx = leftMargin + ti * tierColW;
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(WHITE);
        doc.text(tier.name, tx + 8, y + 6, { width: tierColW - 12, align: "center" });
      });
      y += ROW_H;

      // Product name row
      doc.rect(leftMargin, y, pageWidth, ROW_H).fill(ROW_ALT);
      data.allTiers.forEach((tier, ti) => {
        const tx = leftMargin + ti * tierColW;
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK_DARK);
        doc.text(`${tier.manufacturer} — ${tier.productName}`, tx + 8, y + 5, { width: tierColW - 14 });
      });
      y += ROW_H;

      // Fibre row
      doc.rect(leftMargin, y, pageWidth, ROW_H).fill(WHITE);
      doc.font("Helvetica").fontSize(6.5).fillColor(INK_LIGHT);
      doc.text("Fibre", leftMargin + 4, y + 3, { width: 40 });
      data.allTiers.forEach((tier, ti) => {
        const tx = leftMargin + ti * tierColW;
        doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
        doc.text(tier.fibre || "—", tx + 8, y + 5, { width: tierColW - 14 });
      });
      y += ROW_H;

      // Pile type row
      doc.rect(leftMargin, y, pageWidth, ROW_H).fill(ROW_ALT);
      doc.font("Helvetica").fontSize(6.5).fillColor(INK_LIGHT);
      doc.text("Pile Type", leftMargin + 4, y + 3, { width: 50 });
      data.allTiers.forEach((tier, ti) => {
        const tx = leftMargin + ti * tierColW;
        doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
        doc.text(tier.pileType || "—", tx + 8, y + 5, { width: tierColW - 14 });
      });
      y += ROW_H;

      // Price row
      doc.rect(leftMargin, y, pageWidth, ROW_H + 2).fill(WHITE);
      doc.rect(leftMargin, y, 3, ROW_H + 2).fill(CHAMPAGNE);
      data.allTiers.forEach((tier, ti) => {
        const tx = leftMargin + ti * tierColW;
        doc.font("Helvetica-Bold").fontSize(10).fillColor(INK_BLACK);
        doc.text(formatPrice(tier.price), tx + 8, y + 5, { width: tierColW - 14, align: "center" });
      });
      y += ROW_H + 2;

      // Deposit row — homeowner only; agent quotes pay in full on completion
      if (!data.isAgent) {
        doc.rect(leftMargin, y, pageWidth, ROW_H).fill(ROW_ALT);
        doc.font("Helvetica").fontSize(6.5).fillColor(INK_LIGHT);
        doc.text("Deposit", leftMargin + 4, y + 3, { width: 40 });
        data.allTiers.forEach((tier, ti) => {
          const tx = leftMargin + ti * tierColW;
          const dep = Math.round(tier.price * (tier.depositPercent / 100));
          doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
          doc.text(`${formatPrice(dep)} (${tier.depositPercent}%)`, tx + 8, y + 5, { width: tierColW - 14, align: "center" });
        });
        y += ROW_H;
      }

      // Vertical dividers between tiers
      const tableRowCount = data.isAgent ? 4 : 5; // 4 rows without deposit, 5 with
      for (let ti = 1; ti < data.allTiers.length; ti++) {
        const divX = leftMargin + ti * tierColW;
        const startY = y - (ROW_H * tableRowCount + ROW_H + 2); // back to start of table
        doc.moveTo(divX, startY).lineTo(divX, y)
          .strokeColor(RULE_LIGHT).lineWidth(0.5).stroke();
      }
    // ── PREMIUM UNDERLAY CALLOUT (agent/tiered quotes only) ────────────
    if (data.allTiers && data.allTiers.length > 1 && data.isAgent) {
      y += 10;
      const GOLD_BG    = "#FBF5E8";
      // Section heading
      y = sectionHeading("PREMIUM UNDERLAY INCLUDED", y);
      // Outer box
      const boxH = 88;
      doc.rect(leftMargin, y, pageWidth, boxH).fill(GOLD_BG);
      doc.rect(leftMargin, y, 3, boxH).fill(CHAMPAGNE);
      // Header line
      doc.font("Helvetica-Bold").fontSize(9).fillColor(INK_BLACK);
      doc.text("Premium Underlay Included", leftMargin + 12, y + 8, { width: pageWidth - 20 });
      doc.font("Helvetica-Bold").fontSize(11).fillColor(INK_BLACK);
      doc.text("Dunlop Eureka\u00ae", leftMargin + 12, y + 20, { width: pageWidth - 20 });
      // Key selling point
      doc.font("Helvetica-Bold").fontSize(8).fillColor(CHAMPAGNE);
      doc.text("Premium comfort underlay — trusted by professionals", leftMargin + 12, y + 34, { width: pageWidth - 20 });
      // Spec columns — two rows of specs
      const underlaySpecs = [
        "10mm Thickness",
        "High Density Foam",
        "Acoustic Insulation",
        "Thermal Performance",
        "Australian Made",
      ];
      const colW = Math.floor(pageWidth / 3);
      underlaySpecs.forEach((spec, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const sx = leftMargin + 12 + col * colW;
        const sy = y + 48 + row * 14;
        doc.font("Helvetica").fontSize(7).fillColor(INK_MID);
        doc.text("\u2022  " + spec, sx, sy, { width: colW - 8 });
      });
      y += boxH + 6;
    }

    } else {
      // ── SINGLE-TIER LAYOUT (homeowner / single-price agent) ────────────
      y = sectionHeading("PRODUCT SELECTION", y);

      const productRows: [string, string][] = [
        ["Tier", data.tierName],
        ["Product", `${data.manufacturer} — ${data.productName}`],
        ["Fibre", data.fibre],
        ["Pile Type", data.pileType],
        ["Colour", data.colourCode ? `${data.colourCode}  ${data.colourName}` : data.colourName],
      ];

      for (let ri = 0; ri < productRows.length; ri++) {
        const [label, value] = productRows[ri]!;
        doc.rect(leftMargin, y - 2, pageWidth, 16).fill(ri % 2 === 0 ? WHITE : ROW_ALT);
        doc.font("Helvetica").fontSize(7.5).fillColor(INK_LIGHT);
        doc.text(label, leftMargin + 6, y + 2, { width: 90 });
        doc.font("Helvetica").fontSize(8).fillColor(INK_DARK);
        doc.text(value, leftMargin + 100, y + 2, { width: pageWidth - 106 });
        y += 16;
      }
    }

    // Scope of Works
    y += 8;
    y = sectionHeading("SCOPE OF WORKS", y);

    for (const item of data.scopeOfWorks) {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK_DARK);
      doc.text(item.title, leftMargin + 6, y, { width: 110 });
      doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
      doc.text(item.description, leftMargin + 120, y, { width: pageWidth - 126 });
      y += 15;
    }

    // Pricing Table
    y += 8;
    y = sectionHeading("PRICING", y);

    // Table header
    doc.rect(leftMargin, y, pageWidth, 20).fill(INK_BLACK);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(WHITE);
    doc.text("Description", leftMargin + 8, y + 6, {
      width: pageWidth * 0.68,
      characterSpacing: 0.5,
    });
    doc.text("Amount (ex GST)", leftMargin + pageWidth * 0.68, y + 6, {
      width: pageWidth * 0.32 - 8,
      align: "right",
      characterSpacing: 0.5,
    });
    y += 20;

    if (data.rooms && data.rooms.length > 0) {
      // Room itemisation: show each room as a separate pricing row
      for (let ri = 0; ri < data.rooms.length; ri++) {
        const room = data.rooms[ri]!;
        doc.rect(leftMargin, y, pageWidth, 20).fill(ri % 2 === 0 ? WHITE : ROW_ALT);
        doc.font("Helvetica").fontSize(8.5).fillColor(INK_DARK);
        doc.text(`${room.name} — Carpet supply & installation`, leftMargin + 8, y + 6, {
          width: pageWidth * 0.68,
        });
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK_BLACK);
        doc.text(formatPrice(Math.round(room.price / 1.1)), leftMargin + pageWidth * 0.68, y + 6, {
          width: pageWidth * 0.32 - 8,
          align: "right",
        });
        y += 20;
        doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y)
          .strokeColor(RULE_LIGHT).lineWidth(0.3).stroke();
      }
    } else if (data.allTiers && data.allTiers.length > 1) {
      // Multi-tier: show each tier as a separate pricing row
      for (let ai = 0; ai < data.allTiers.length; ai++) {
        const tier = data.allTiers[ai]!;
        doc.rect(leftMargin, y, pageWidth, 20).fill(ai % 2 === 0 ? WHITE : ROW_ALT);
        doc.font("Helvetica").fontSize(8.5).fillColor(INK_DARK);
        doc.text(`${tier.name} — Carpet supply & installation`, leftMargin + 8, y + 6, {
          width: pageWidth * 0.68,
        });
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK_BLACK);
        doc.text(formatPrice(Math.round(tier.price / 1.1)), leftMargin + pageWidth * 0.68, y + 6, {
          width: pageWidth * 0.32 - 8,
          align: "right",
        });
        y += 20;
        doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y)
          .strokeColor(RULE_LIGHT).lineWidth(0.3).stroke();
      }
    } else {
      // Single-tier: show one base price row
      doc.rect(leftMargin, y, pageWidth, 20).fill(WHITE);
      doc.font("Helvetica").fontSize(8.5).fillColor(INK_DARK);
      doc.text(`${data.tierName} — Carpet supply & installation`, leftMargin + 8, y + 6, {
        width: pageWidth * 0.68,
      });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK_BLACK);
      doc.text(formatPrice(Math.round(data.basePrice / 1.1)), leftMargin + pageWidth * 0.68, y + 6, {
        width: pageWidth * 0.32 - 8,
        align: "right",
      });
      y += 20;
      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y)
        .strokeColor(RULE_LIGHT).lineWidth(0.3).stroke();
    }

    // Add-on rows (shared for both layouts)
    for (let ai = 0; ai < data.addons.length; ai++) {
      const addon = data.addons[ai]!;
      doc.rect(leftMargin, y, pageWidth, 20).fill(ai % 2 === 0 ? ROW_ALT : WHITE);
      doc.font("Helvetica").fontSize(8.5).fillColor(INK_DARK);
      doc.text(addon.title, leftMargin + 8, y + 6, { width: pageWidth * 0.68 });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK_BLACK);
      doc.text(formatPrice(Math.round(addon.price / 1.1)), leftMargin + pageWidth * 0.68, y + 6, {
        width: pageWidth * 0.32 - 8,
        align: "right",
      });
      y += 20;
      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y)
        .strokeColor(RULE_LIGHT).lineWidth(0.3).stroke();
    }

    // For multi-tier: no single "Total" row — each tier has its own price shown above.
    // For single-tier: show GST row then grand total row.
    if (!data.allTiers || data.allTiers.length <= 1) {
      // GST row
      y += 4;
      doc.rect(leftMargin, y, pageWidth, 20).fill(WHITE);
      doc.font("Helvetica").fontSize(8.5).fillColor(INK_MID);
      doc.text("GST (10%)", leftMargin + 12, y + 5, { width: pageWidth * 0.6 });
      doc.font("Helvetica").fontSize(8.5).fillColor(INK_MID);
      doc.text(formatPrice(Math.round(data.grandTotal / 11)), leftMargin + pageWidth * 0.6, y + 5, {
        width: pageWidth * 0.4 - 8,
        align: "right",
      });
      y += 20;
      // Total row
      doc.rect(leftMargin, y, pageWidth, 30).fill(ROW_ALT);
      doc.rect(leftMargin, y, 3, 30).fill(CHAMPAGNE);
      doc.font("Helvetica").fontSize(9).fillColor(INK_MID);
      doc.text("Total (inc GST)", leftMargin + 12, y + 10, { width: pageWidth * 0.6 });
      doc.font("Helvetica-Bold").fontSize(15).fillColor(INK_BLACK);
      doc.text(formatPrice(data.grandTotal), leftMargin + pageWidth * 0.6, y + 8, {
        width: pageWidth * 0.4 - 8,
        align: "right",
      });
      y += 30;
    } else {
      // Multi-tier: show a note instead of a single total
      y += 4;
      doc.rect(leftMargin, y, pageWidth, 24).fill(ROW_ALT);
      doc.rect(leftMargin, y, 3, 24).fill(CHAMPAGNE);
      doc.font("Helvetica").fontSize(8).fillColor(INK_MID);
      doc.text("Prices shown per option above (ex GST). Select one option to proceed.", leftMargin + 12, y + 7, {
        width: pageWidth - 20,
      });
      y += 24;
    }

    // Deposit / Balance — homeowner quotes only; agent quotes pay in full on completion
    if (!data.isAgent) {
      y += 6;
      // For multi-tier, use the first tier's price for the deposit/balance summary
      const summaryTotal = (data.allTiers && data.allTiers.length > 1)
        ? data.allTiers[0]!.price
        : data.grandTotal;
      const summaryDepositPct = (data.allTiers && data.allTiers.length > 1)
        ? data.allTiers[0]!.depositPercent
        : data.depositPercent;
      const deposit = Math.round(summaryTotal * (summaryDepositPct / 100));
      const balance = summaryTotal - deposit;

      if (summaryDepositPct > 0) {
        doc.font("Helvetica").fontSize(8).fillColor(INK_LIGHT);
        doc.text(`${summaryDepositPct}% Non-refundable Deposit`, leftMargin + 6, y + 4, {
          width: pageWidth * 0.7,
        });
        doc.font("Helvetica-Bold").fontSize(8).fillColor(INK_DARK);
        doc.text(formatPrice(deposit), leftMargin + pageWidth * 0.7, y + 4, {
          width: pageWidth * 0.3 - 6,
          align: "right",
        });
        y += 18;
        doc.font("Helvetica").fontSize(8).fillColor(INK_LIGHT);
        doc.text("Balance on Practical Completion", leftMargin + 6, y + 4, {
          width: pageWidth * 0.7,
        });
        doc.font("Helvetica-Bold").fontSize(8).fillColor(INK_DARK);
        doc.text(formatPrice(balance), leftMargin + pageWidth * 0.7, y + 4, {
          width: pageWidth * 0.3 - 6,
          align: "right",
        });
        y += 28;
      } else {
        // 0% deposit — full payment on completion
        doc.font("Helvetica").fontSize(8).fillColor(INK_LIGHT);
        doc.text("Full Payment on Practical Completion", leftMargin + 6, y + 4, {
          width: pageWidth * 0.7,
        });
        doc.font("Helvetica-Bold").fontSize(8).fillColor(INK_DARK);
        doc.text(formatPrice(summaryTotal), leftMargin + pageWidth * 0.7, y + 4, {
          width: pageWidth * 0.3 - 6,
          align: "right",
        });
        y += 28;
      }
    }

    // Banking Details
    y = sectionHeading("BANKING DETAILS", y);

    doc.rect(leftMargin, y, pageWidth, 72).fill(ROW_ALT);
    doc.rect(leftMargin, y, 3, 72).fill(CHAMPAGNE);

    const bankLeft = leftMargin + 14;
    const bankLabelW = 90;
    const bankValueX = leftMargin + 110;
    const bankValueW = pageWidth - 120;

    const bankRows: [string, string][] = [
      ["ACC NAME", "Bell Spec Pty Ltd"],
      ["BSB", "124 022"],
      ["ACC NUMBER", "22496442"],
      ["REFERENCE", data.invoiceNumber ?? data.quoteNumber],
    ];

    let by = y + 10;
    for (const [label, value] of bankRows) {
      doc.font("Helvetica").fontSize(7.5).fillColor(INK_LIGHT);
      doc.text(label, bankLeft, by, { width: bankLabelW });
      doc.font("Helvetica-Bold").fontSize(8).fillColor(INK_DARK);
      doc.text(value, bankValueX, by, { width: bankValueW });
      by += 14;
    }

    y += 78;

    // Payment terms note
    doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
    const paymentNote = data.isAgent
      ? `Full payment is due upon practical completion of the installation. Payment can be made direct into our bank account. Please send all remittances by email to: hello@bellcarpets.com.au`
      : `Payment due within ${data.validDays} days. Payment can be made direct into our bank account. Please send all remittances by email to: hello@bellcarpets.com.au`;
    doc.text(paymentNote, leftMargin, y, { width: pageWidth });
    y += 24;

    // ABN note
    doc.font("Helvetica").fontSize(6.5).fillColor(INK_LIGHT);
    doc.text(
      "BELL SPEC PTY LTD  ·  ABN 74 613 299 773  ·  Unit 1, 41 Olympic Circuit, Southport QLD 4215",
      leftMargin, y, { width: pageWidth, align: "center" }
    );
    y += 12;
    doc.font("Helvetica").fontSize(6.5).fillColor(INK_LIGHT);
    const taxInvoiceNote = data.isAgent
      ? "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon completion of works."
      : (data.depositPercent ?? 50) === 0
      ? "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon completion of works."
      : "This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon receipt of deposit.";
    doc.text(taxInvoiceNote, leftMargin, y, { width: pageWidth, align: "center" });

    // Page 1 Footer
    drawPageFooter(pageCount);

    // ═══════════════════════════════════════════════════════════════
    // T&C PAGES — auto-paginate without blank pages
    // ═══════════════════════════════════════════════════════════════
    const depPct = data.depositPercent ?? 50;
    const balPct = 100 - depPct;
    const financialCommitmentItems = data.isAgent
      ? [
          {
            label: "Payment Terms",
            text: "Full payment of the invoice total is strictly due upon practical completion of the installation on the scheduled day. Materials will not be ordered until written acceptance of this quotation is received.",
          },
          {
            label: "Express Installations",
            text: "If an installation is scheduled within ten (10) business days of the order date, 100% of the invoice total is required upon booking confirmation.",
          },
        ]
      : depPct === 0
      ? [
          {
            label: "Payment Terms",
            text: "Full payment of the invoice total is strictly due upon practical completion of the installation on the scheduled day. Materials will not be ordered until written acceptance of this quotation is received.",
          },
          {
            label: "Express Installations",
            text: "If an installation is scheduled within ten (10) business days of the order date, 100% of the invoice total is required upon booking.",
          },
        ]
      : [
          {
            label: "Booking Deposit",
            text: `A ${depPct}% non-refundable deposit is required to secure your booking, allocate our installation teams, and order materials. Materials will not be ordered until this deposit is received in cleared funds.`,
          },
          {
            label: "Final Balance",
            text: `The remaining ${balPct}% balance is strictly due upon practical completion of the installation on the scheduled day.`,
          },
          {
            label: "Express Installations",
            text: "If an installation is scheduled within ten (10) business days of the order date, 100% of the invoice total is required upon booking.",
          },
        ];
    const tAndC: { section: string; items: { label: string; text: string }[] }[] = [
      {
        section: "1. Financial Commitment & Payment Terms",
        items: financialCommitmentItems,
      },
      {
        section: "2. Sub-Floor Preparation & Variations",
        items: [
          {
            label: "Site Unseen Clause",
            text: "Floor preparation is the critical foundation of any hard flooring installation. If the existing sub-floor is obscured by current floor coverings at the time of quotation, this quote assumes a standard, level surface.",
          },
          {
            label: "Automatic Variations",
            text: "Should the removal of existing flooring reveal undulations, moisture issues, or damage requiring rectification, these works fall outside the initial scope. The client acknowledges that such necessary preparation will incur an automatic variation charge based on materials and labour required to meet manufacturer warranty standards.",
          },
        ],
      },
      {
        section: "3. Site Readiness & Furniture",
        items: [
          {
            label: "Client Responsibility",
            text: "Unless explicitly itemised in the quotation, the movement of furniture, removal of existing floor coverings, and disposal of waste are the sole responsibility of the client prior to our arrival.",
          },
          {
            label: "Subcontractor Liability",
            text: "If Bell Carpets is contracted to move furniture, our elite subcontracted installation teams will exercise the utmost care. However, Bell Carpets and its contractors hold zero liability for any incidental damage to fragile items, electronics, antiques, or structural fixtures during this process. All valuables must be removed by the client prior to site handover.",
          },
          {
            label: "Site Delays",
            text: "If the site is not ready for installation upon our team's scheduled arrival, a stand-by or rescheduling fee will apply.",
          },
        ],
      },
      {
        section: "4. Exclusions of Scope",
        items: [
          {
            label: "Unforeseen Works",
            text: "This quotation strictly covers the supply and installation of flooring as itemised. It explicitly excludes: structural sub-floor repairs, asbestos testing or removal, plumbing or electrical disconnections/re-connections, and the repair or repainting of existing skirting boards.",
          },
        ],
      },
      {
        section: "5. Asset Protection & Retention of Title",
        items: [
          {
            label: "Ownership",
            text: "All goods remain the exclusive property of Bell Carpets until the invoice is paid in full with cleared funds.",
          },
          {
            label: "Right of Recovery",
            text: "In the event of non-payment, the client grants Bell Carpets and its agents the irrevocable right to enter the premises to recover the goods, without liability for any damage caused to the premises during the recovery of our property. Bell Carpets reserves the right to register a security interest on the Personal Property Securities Register (PPSR).",
          },
        ],
      },
      {
        section: "6. Cancellations & Manufacturing Delays",
        items: [
          {
            label: "Binding Orders",
            text: data.isAgent
              ? `Orders cannot be cancelled without the express written consent of Bell Carpets management. Approved cancellations may incur a cancellation fee to cover administrative, allocation, and restocking liabilities.`
              : depPct === 0
              ? `Orders cannot be cancelled without the express written consent of Bell Carpets management. Approved cancellations may incur a cancellation fee to cover administrative, allocation, and restocking liabilities.`
              : `Orders cannot be cancelled without the express written consent of Bell Carpets management. Approved cancellations will result in the immediate forfeiture of the ${depPct}% deposit to cover administrative, allocation, and restocking liabilities.`,
          },
          {
            label: "External Delays",
            text: "Bell Carpets operates with world-class suppliers but cannot be held liable for manufacturing delays, shipping disruptions, or acts of God outside of our direct control.",
          },
        ],
      },
      {
        section: "7. Quality of Workmanship & Industry Tolerances",
        items: [
          {
            label: "Standard of Excellence",
            text: "Bell Carpets exclusively deploys rigorously vetted, highly qualified subcontracted craftsmen. All installations are strictly executed in accordance with current Australian Building Standards and precise manufacturer specifications to ensure maximum product longevity.",
          },
          {
            label: "Material and Environmental Tolerances",
            text: "Hard flooring is a dynamic product influenced by environmental factors, structural settling, and natural lighting. The client acknowledges that minor, industry-acceptable tolerances and variations do not constitute defective workmanship.",
          },
          {
            label: "Practical Completion & Handover",
            text: "Upon the conclusion of the installation, the work is deemed to meet our elite operational standards. The client is required to conduct a final site inspection with the installation team prior to their departure to ensure complete satisfaction.",
          },
        ],
      },
    ];

    // Start first T&C page — startTCPage(false) already calls addPage() and increments pageCount
    let ty = startTCPage(false);

    for (const section of tAndC) {
      // Measure section heading height (18) + all items
      // Check if we need a new page before starting this section
      const sectionHeadingH = 22;
      let sectionContentH = 0;
      doc.fontSize(7.5);
      for (const item of section.items) {
        const textH = doc.heightOfString(item.text, { width: pageWidth - 126 });
        sectionContentH += Math.max(textH + 10, 20) + 1; // +1 for rule
      }
      sectionContentH += 8; // trailing gap

      // If the whole section fits on remaining space, draw it; otherwise start new page
      // (but always start a new page if we're very close to the bottom)
      if (ty + sectionHeadingH + 40 > SAFE_BOTTOM) {
        // Not even the heading fits — start new page
        ty = startTCPage(false);
        pageCount++;
      }

      // Section heading bar
      doc.rect(leftMargin, ty, pageWidth, 18).fill(INK_BLACK);
      doc.rect(leftMargin, ty, 3, 18).fill(CHAMPAGNE);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE);
      doc.text(section.section, leftMargin + 10, ty + 5, {
        width: pageWidth - 14,
        characterSpacing: 0.3,
      });
      ty += 22;

      for (const item of section.items) {
        doc.fontSize(7.5);
        const textHeight = doc.heightOfString(item.text, { width: pageWidth - 126 });
        const rowHeight = Math.max(textHeight + 10, 20);

        // If this item won't fit, start a new page
        if (ty + rowHeight > SAFE_BOTTOM) {
          ty = startTCPage(false);
          pageCount++;
        }

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK_DARK);
        doc.text(item.label + ":", leftMargin + 6, ty + 3, { width: 110 });
        doc.font("Helvetica").fontSize(7.5).fillColor(INK_MID);
        doc.text(item.text, leftMargin + 120, ty + 3, { width: pageWidth - 126 });

        ty += rowHeight;

        // Light rule between items
        doc.moveTo(leftMargin, ty).lineTo(leftMargin + pageWidth, ty)
          .strokeColor(RULE_LIGHT).lineWidth(0.2).stroke();
      }

      ty += 8;
    }

    // Footer on the last T&C page
    drawPageFooter(pageCount);

    doc.end();
  });
}
