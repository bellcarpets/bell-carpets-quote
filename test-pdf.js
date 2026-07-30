const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg";
const FONT_DIR = path.join("/tmp/bell-carpets-quote/server/fonts");
const FONT_REGULAR = path.join(FONT_DIR, "EBGaramond-Variable.ttf");
const FONT_ITALIC = path.join(FONT_DIR, "EBGaramond-Italic-Variable.ttf");

const BLACK = "#000000";
const DARK = "#1a1a1a";
const MID = "#666666";
const LIGHT = "#999999";
const RULE = "#e0e0e0";

function formatPrice(n) {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  let logoBuffer = null;
  try {
    logoBuffer = await downloadImage(LOGO_URL);
    console.log("Logo downloaded:", logoBuffer.length, "bytes");
  } catch (e) {
    console.warn("Failed to download logo:", e.message);
  }

  const hasCustomFont = fs.existsSync(FONT_REGULAR);
  const hasItalicFont = fs.existsSync(FONT_ITALIC);
  console.log("Custom font:", hasCustomFont, "Italic font:", hasItalicFont);

  const data = {
    quoteNumber: "BC-050",
    issueDate: "10 Jun 2026",
    validDays: 10,
    depositPercent: 0,
    clientName: "Coastal Property Agents",
    clientType: "Real Estate Agency",
    propertyAddress: "704/30 Garrick Street, Coolangatta QLD 4225",
    tierName: "Godfrey Hirst Carramar Wool",
    productName: "Carramar Wool",
    manufacturer: "Godfrey Hirst",
    fibre: "Wool",
    pileType: "Loop Pile",
    colourName: "Dove Grey",
    basePrice: 2750,
    addons: [{ title: "Remove & Reinstate Heavy Furniture", price: 250 }],
    grandTotal: 3000,
    scopeOfWorks: [
      { title: "Removal & Disposal", description: "Removal and disposal of existing floor coverings" },
      { title: "Preparation", description: "Sub-floor inspection and smooth-edge check" },
      { title: "Installation", description: "Professional installation compliant with AS/NZS 2455.1" },
      { title: "Site Clean", description: "Vacuum on completion, scraps and packaging removed" },
      { title: "Lifetime Guarantee", description: "Your installation is guaranteed for life" },
    ],
    terms: ["Full payment due upon practical completion"],
    agentName: "Kate Gordon",
    agentEmail: "kate@coastalproperty.com.au",
    isAgent: true,
  };

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    autoFirstPage: true,
    bufferPages: true,
    info: { Title: "Bell Carpets - BC-050", Author: "Bell Carpets" },
  });

  if (hasCustomFont) doc.registerFont("Garamond", FONT_REGULAR);
  if (hasItalicFont) doc.registerFont("Garamond-Italic", FONT_ITALIC);

  const fontRegular = hasCustomFont ? "Garamond" : "Helvetica";
  const fontBold = hasCustomFont ? "Garamond" : "Helvetica-Bold";
  const fontItalic = hasItalicFont ? "Garamond-Italic" : "Helvetica-Oblique";

  const outPath = "/tmp/Bell-Carpets-Quote-BC-050.pdf";
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const pageWidth = doc.page.width - 120;
  const leftMargin = 60;
  const rightEdge = leftMargin + pageWidth;
  const pageHeight = doc.page.height;
  const SAFE_BOTTOM = pageHeight - 110;
  let pageCount = 1;

  function drawPageFooter(pageNum) {
    const footerY = pageHeight - 50;
    doc.moveTo(leftMargin, footerY - 6).lineTo(rightEdge, footerY - 6)
      .strokeColor(RULE).lineWidth(0.5).stroke();
    doc.font(fontRegular).fontSize(7).fillColor(LIGHT);
    doc.text("Bell Carpets  \u00b7  Established 1987", leftMargin, footerY + 2, { width: pageWidth * 0.6, align: "left" });
    doc.font(fontRegular).fontSize(7).fillColor(LIGHT);
    doc.text("Page " + pageNum, leftMargin + pageWidth * 0.6, footerY + 2, { width: pageWidth * 0.4, align: "right" });
  }

  function ensureSpace(needed, y) {
    if (y + needed > SAFE_BOTTOM) {
      drawPageFooter(pageCount);
      doc.addPage();
      pageCount++;
      return 60;
    }
    return y;
  }

  // PAGE 1
  let y = 60;

  if (logoBuffer) {
    try { doc.image(logoBuffer, leftMargin, y, { height: 32 }); } catch (e) {
      doc.font(fontBold).fontSize(20).fillColor(BLACK).text("BELL CARPETS", leftMargin, y + 6);
    }
  }

  y += 56;
  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(BLACK).lineWidth(1).stroke();
  y += 24;

  // Quote number right
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("QUOTE", rightEdge - 160, y, { width: 160, align: "right" });
  doc.font(fontBold).fontSize(18).fillColor(BLACK);
  doc.text(data.quoteNumber, rightEdge - 160, y + 12, { width: 160, align: "right" });

  // Client left
  const detailStartY = y;
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("PREPARED FOR", leftMargin, detailStartY);
  doc.font(fontRegular).fontSize(11).fillColor(DARK);
  doc.text(data.agentName, leftMargin, detailStartY + 14);
  doc.font(fontRegular).fontSize(10).fillColor(MID);
  doc.text(data.clientName, leftMargin, detailStartY + 28);

  y = detailStartY + 50;

  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("PROPERTY", leftMargin, y);
  doc.font(fontRegular).fontSize(10).fillColor(DARK);
  doc.text(data.propertyAddress, leftMargin, y + 14);
  y += 36;

  y += 8;
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("ISSUED", leftMargin, y);
  doc.font(fontRegular).fontSize(10).fillColor(DARK);
  doc.text(data.issueDate, leftMargin + 80, y);
  y += 16;
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("VALID UNTIL", leftMargin, y);
  doc.font(fontRegular).fontSize(10).fillColor(DARK);
  doc.text("20 Jun 2026", leftMargin + 80, y);
  y += 36;

  // Product
  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(RULE).lineWidth(0.5).stroke();
  y += 16;
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("PRODUCT", leftMargin, y);
  y += 18;
  doc.font(fontBold).fontSize(12).fillColor(BLACK);
  doc.text(data.manufacturer + " " + data.productName, leftMargin, y);
  y += 18;
  doc.font(fontRegular).fontSize(10).fillColor(MID);
  doc.text(data.fibre + "  \u00b7  " + data.pileType + "  \u00b7  " + data.colourName, leftMargin, y);
  y += 26;

  // Scope
  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(RULE).lineWidth(0.5).stroke();
  y += 16;
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("SCOPE OF WORKS", leftMargin, y);
  y += 18;

  for (const item of data.scopeOfWorks) {
    doc.font(fontRegular).fontSize(10).fillColor(DARK);
    doc.text(item.title, leftMargin, y, { width: 140 });
    doc.font(fontRegular).fontSize(9).fillColor(MID);
    doc.text(item.description, leftMargin + 150, y, { width: pageWidth - 150 });
    y += 16;
  }
  y += 12;

  // Pricing
  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(BLACK).lineWidth(0.75).stroke();
  y += 16;
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("PRICING", leftMargin, y);
  y += 20;

  doc.font(fontRegular).fontSize(10).fillColor(DARK);
  doc.text("Carpet supply & installation", leftMargin, y, { width: pageWidth * 0.65 });
  doc.font(fontRegular).fontSize(10).fillColor(BLACK);
  doc.text(formatPrice(Math.round(data.basePrice / 1.1)), rightEdge - 100, y, { width: 100, align: "right" });
  y += 18;
  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(RULE).lineWidth(0.3).stroke();
  y += 8;

  for (const addon of data.addons) {
    doc.font(fontRegular).fontSize(10).fillColor(DARK);
    doc.text(addon.title, leftMargin, y, { width: pageWidth * 0.65 });
    doc.font(fontRegular).fontSize(10).fillColor(BLACK);
    doc.text(formatPrice(Math.round(addon.price / 1.1)), rightEdge - 100, y, { width: 100, align: "right" });
    y += 18;
    doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(RULE).lineWidth(0.3).stroke();
    y += 8;
  }

  y += 4;
  doc.font(fontRegular).fontSize(9).fillColor(MID);
  doc.text("GST (10%)", leftMargin, y, { width: pageWidth * 0.65 });
  doc.text(formatPrice(Math.round(data.grandTotal / 11)), rightEdge - 100, y, { width: 100, align: "right" });
  y += 18;

  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(BLACK).lineWidth(0.75).stroke();
  y += 10;
  doc.font(fontBold).fontSize(12).fillColor(BLACK);
  doc.text("Total (inc GST)", leftMargin, y, { width: pageWidth * 0.65 });
  doc.font(fontBold).fontSize(14).fillColor(BLACK);
  doc.text(formatPrice(data.grandTotal), rightEdge - 120, y, { width: 120, align: "right" });
  y += 28;

  // Banking
  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(RULE).lineWidth(0.5).stroke();
  y += 16;
  doc.font(fontRegular).fontSize(9).fillColor(LIGHT);
  doc.text("BANKING DETAILS", leftMargin, y);
  y += 20;

  const bankRows = [
    ["Account Name", "Bell Spec Pty Ltd"],
    ["BSB", "124 022"],
    ["Account Number", "22496442"],
    ["Reference", data.quoteNumber],
  ];
  for (const [label, value] of bankRows) {
    doc.font(fontRegular).fontSize(9).fillColor(MID);
    doc.text(label, leftMargin, y, { width: 120 });
    doc.font(fontRegular).fontSize(10).fillColor(DARK);
    doc.text(value, leftMargin + 120, y);
    y += 16;
  }
  y += 12;

  doc.font(fontRegular).fontSize(9).fillColor(MID);
  doc.text("Full payment is due upon practical completion. Please send remittances to hello@bellcarpets.com.au", leftMargin, y, { width: pageWidth });
  y += 24;

  doc.font(fontRegular).fontSize(7.5).fillColor(LIGHT);
  doc.text("Bell Spec Pty Ltd  \u00b7  ABN 74 613 299 773  \u00b7  Unit 1, 41 Olympic Circuit, Southport QLD 4215", leftMargin, y, { width: pageWidth, align: "center" });
  y += 12;
  doc.font(fontItalic).fontSize(7.5).fillColor(LIGHT);
  doc.text("This document is a quotation and does not constitute a tax invoice. A tax invoice will be issued upon completion of works.", leftMargin, y, { width: pageWidth, align: "center" });

  drawPageFooter(pageCount);

  // PAGE 2: T&C
  doc.addPage();
  pageCount++;
  y = 60;

  if (logoBuffer) {
    try { doc.image(logoBuffer, leftMargin, y, { height: 24 }); } catch (e) {}
  }
  doc.font(fontRegular).fontSize(9).fillColor(MID);
  doc.text("Terms and Conditions", rightEdge - 160, y + 8, { width: 160, align: "right" });
  doc.font(fontRegular).fontSize(8).fillColor(LIGHT);
  doc.text("Reference: " + data.quoteNumber, rightEdge - 160, y + 20, { width: 160, align: "right" });

  y += 44;
  doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor(BLACK).lineWidth(0.5).stroke();
  y += 20;

  const tcSections = [
    { title: "Financial Commitment", items: [
      { label: "Payment Terms", text: "Full payment of the invoice total is strictly due upon practical completion of the installation on the scheduled day. Materials will not be ordered until written acceptance of this quotation is received." },
      { label: "Invoicing", text: "A tax invoice will be issued upon completion of works. Payment is to be made by direct bank transfer within 7 days of invoice date." },
    ]},
    { title: "Scheduling & Access", items: [
      { label: "Lead Time", text: "Installation dates are subject to material availability. Typical lead time is 5\u201310 business days from acceptance." },
      { label: "Site Access", text: "Clear and safe access to the installation area must be provided. Furniture must be removed from the work area prior to the scheduled installation date unless a furniture removal add-on has been included." },
      { label: "Subfloor", text: "Subfloor must be structurally sound, dry, and level. Any remediation required beyond normal preparation will be quoted separately." },
    ]},
    { title: "Variations & Cancellations", items: [
      { label: "Variations", text: "Any changes to the scope of works after acceptance must be agreed in writing. Additional costs will be quoted and confirmed before proceeding." },
      { label: "Cancellation", text: "If you cancel after materials have been ordered, you forfeit the deposit. If materials have been cut or customised, the full material cost is non-refundable." },
    ]},
    { title: "Warranty & Liability", items: [
      { label: "Installation Guarantee", text: "All installations are guaranteed for life against installation defects. This does not cover damage caused by misuse, flooding, or failure to follow manufacturer care instructions." },
      { label: "Manufacturer Warranty", text: "Product warranties are provided by the manufacturer and are separate from our installation guarantee." },
      { label: "Limitation", text: "Our liability is limited to the quoted amount. We are not liable for consequential loss, loss of use, or damage to existing fixtures unless caused by our negligence." },
    ]},
    { title: "General", items: [
      { label: "Quote Validity", text: "This quote is valid for 10 days from the issue date. After expiry, pricing may be subject to change." },
      { label: "Colour Variation", text: "Carpet and flooring products may vary slightly in colour from samples due to dye lot variations. This is normal and not a defect." },
      { label: "Governing Law", text: "This agreement is governed by the laws of Queensland, Australia." },
    ]},
  ];

  for (const section of tcSections) {
    y = ensureSpace(60, y);
    doc.font(fontBold).fontSize(10).fillColor(BLACK);
    doc.text(section.title, leftMargin, y);
    y += 18;

    for (const item of section.items) {
      y = ensureSpace(40, y);
      doc.font(fontBold).fontSize(9).fillColor(DARK);
      doc.text(item.label, leftMargin, y);
      y += 13;
      doc.font(fontRegular).fontSize(9).fillColor(MID);
      const h = doc.heightOfString(item.text, { width: pageWidth - 12 });
      doc.text(item.text, leftMargin + 12, y, { width: pageWidth - 12 });
      y += h + 10;
    }
    y += 8;
  }

  y = ensureSpace(40, y);
  doc.font(fontBold).fontSize(10).fillColor(BLACK);
  doc.text("Additional Terms", leftMargin, y);
  y += 18;
  for (const term of data.terms) {
    doc.font(fontRegular).fontSize(9).fillColor(MID);
    doc.text("\u00b7  " + term, leftMargin + 12, y, { width: pageWidth - 12 });
    y += 16;
  }

  drawPageFooter(pageCount);
  doc.end();

  stream.on("finish", () => {
    console.log("PDF generated:", outPath);
    console.log("Size:", fs.statSync(outPath).size, "bytes");
  });
}

main().catch(console.error);
