/**
 * Admin Router — manages multi-quote system
 *
 * Routes:
 * - verifyPassword: Checks the admin password
 * - listQuotes: Password-protected, returns all quotes for the dashboard
 * - getQuote: Public, returns a single quote by slug (for public page)
 * - getQuoteForEdit: Password-protected, returns a quote for admin editing
 * - createQuote: Password-protected, creates a new quote with next sequential number
 * - duplicateQuote: Password-protected, duplicates an existing quote
 * - updateQuote: Password-protected, updates a quote's config
 * - markAccepted: Public, marks a quote as accepted (called from public acceptance flow)
 * - deleteQuote: Password-protected, deletes a quote
 * - getConfig: LEGACY — returns the first quote's config (backward compat)
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { quotes, invoices, quoteViews } from "../drizzle/schema";
import { eq, desc, sql, isNull, and } from "drizzle-orm";
import type { QuoteConfigData, QuoteType } from "../shared/quoteConfigTypes";
import { routeNotificationsToAgent } from "../shared/quoteConfigTypes";
import { sendQuoteLinkSms, sendAcceptanceSmsToBellCarpets, sendSms, normaliseAuPhone } from "./smsHelper";
import { logNotification } from "./notificationLog";
import { formatAESTDate, todayAESTString, parseAESTDate, addDaysAEST } from "../shared/aestUtils";
import { generateQuotePdfBuffer } from "./quotePdf";

// ─── Default Templates ────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449952732/a29pcHdf6xRSErj7q2ehpL";

/** Default config for Agent quotes (3-tier Good/Better/Best) */
export const DEFAULT_AGENT_CONFIG: QuoteConfigData = {
  quoteNumber: "BC-001",
  quoteType: "agent",
  issueDate: formatAESTDate(new Date(), { day: "2-digit", month: "short", year: "numeric" }),
  validDays: 10,
  depositPercent: 50,

  client: {
    name: "",
    type: "Real Estate Agency",
  },

  property: {
    address: "",
    fullAddress: "",
  },

  scope: "Supply and Installation",
  scopeOfWorks: [
    { title: "Removal & Disposal", description: "Removal and disposal of existing floor coverings" },
    { title: "Preparation", description: "Sub-floor inspection and smooth-edge check" },
    { title: "Installation", description: "Professional installation compliant with Australian Standards (AS/NZS 2455.1)" },
    { title: "Site Clean", description: "Vacuum on completion, scraps and packaging removed" },
    { title: "Lifetime Guarantee", description: "Your installation is guaranteed for life." },
  ],

  addons: [
    {
      id: "furniture",
      title: "Remove & Reinstate Heavy Furniture",
      description: "Move heavy items of furniture out and back into position",
      price: 250,
    },
    {
      id: "underlay-upgrade",
      title: "Underlay Upgrade",
      description: "Premium underlay upgrade for enhanced comfort and longevity",
      price: 250,
    },
  ],

  tiers: [
    {
      id: "bronze",
      name: "Good",
      label: "GOOD",
      productName: "Enforcer",
      manufacturer: "Godfrey Hirst",
      fibre: "Polypropylene",
      pileType: "Textured Loop Pile",
      badges: [],
      price: 0,
      color: "#A67C52",
      colorAccent: "#C4956A",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/31051966",
      productUrl: "https://www.bellcarpets.com.au/products/godfrey-hirst-enforcer",
      colours: [
        { id: "warmstone", name: "Warmstone", code: "5160", swatchImage: "/images/swatches/enforcer-warmstone.jpg" },
        { id: "windspray", name: "Windspray", code: "7108", swatchImage: "/images/swatches/enforcer-windspray.jpg" },
        { id: "smoke", name: "Smoke", code: "7250", swatchImage: "/images/swatches/enforcer-smoke.jpg" },
        { id: "lava", name: "Lava", code: "7350", swatchImage: "/images/swatches/enforcer-lava.jpg" },
        { id: "aggregate", name: "Aggregate", code: "7450", swatchImage: "/images/swatches/enforcer-aggregate.jpg" },
      ],
    },
    {
      id: "silver",
      name: "Better",
      label: "BETTER",
      productName: "Serina",
      manufacturer: "Godfrey Hirst",
      fibre: "100% Duratuft Polyester",
      pileType: "Twist Pile",
      badges: [],
      price: 0,
      color: "#B8BCC4",
      colorAccent: "#D0D4DC",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/31051966",
      productUrl: "https://www.bellcarpets.com.au/products/godfrey-hirst-serina",
      colours: [
        { id: "orchard", name: "Orchard", code: "506", swatchImage: "/images/swatches/serina-orchard.jpg" },
        { id: "valley", name: "Valley", code: "510", swatchImage: "/images/swatches/serina-valley.jpg" },
        { id: "vintage", name: "Vintage", code: "542", swatchImage: "/images/swatches/serina-vintage.jpg" },
        { id: "province", name: "Province", code: "715", swatchImage: "/images/swatches/serina-province.jpg" },
        { id: "vineyard", name: "Vineyard", code: "750", swatchImage: "/images/swatches/serina-vineyard.jpg" },
      ],
    },
    {
      id: "gold",
      name: "Best",
      label: "BEST",
      productName: "Lemar Twist",
      manufacturer: "Victoria Carpets",
      fibre: "100% Solution Dyed Nylon",
      pileType: "Twist Pile",
      badges: [],
      price: 0,
      color: "#D4AF37",
      colorAccent: "#E8C84D",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/31051966",
      productUrl: "https://www.bellcarpets.com.au/products/victoria-carpets-lemar-twist",
      colours: [
        { id: "smokey-canvas", name: "Smokey Canvas", code: "32", swatchImage: "/images/swatches/lemar-smokey-canvas.jpg" },
        { id: "alicante", name: "Alicante", code: "23", swatchImage: "/images/swatches/lemar-alicante.jpg" },
        { id: "platinum-grey", name: "Platinum Grey", code: "54", swatchImage: "/images/swatches/lemar-platinum-grey.jpg" },
        { id: "black-finestone", name: "Black Finestone", code: "51", swatchImage: "/images/swatches/lemar-black-finestone.jpg" },
        { id: "bellville", name: "Bellville", code: "55", swatchImage: "/images/swatches/lemar-bellville.jpg" },
      ],
    },
  ],

  terms: [
    "Full payment due upon practical completion",
  ],

  customerNotes: "",
};

/** Default config for Homeowner quotes (single product) */
export const DEFAULT_HOMEOWNER_CONFIG: QuoteConfigData = {
  quoteNumber: "BC-001",
  quoteType: "homeowner",
  issueDate: formatAESTDate(new Date(), { day: "2-digit", month: "short", year: "numeric" }),
  validDays: 10,
  depositPercent: 50,

  client: {
    name: "",
    type: "Residential",
  },

  property: {
    address: "",
    fullAddress: "",
  },

  scope: "Supply and Installation",
  scopeOfWorks: [
    { title: "Removal & Disposal", description: "Removal and disposal of existing floor coverings" },
    { title: "Preparation", description: "Sub-floor inspection and smooth-edge check" },
    { title: "Installation", description: "Professional installation compliant with Australian Standards (AS/NZS 2455.1)" },
    { title: "Site Clean", description: "Vacuum on completion, scraps and packaging removed" },
    { title: "Lifetime Guarantee", description: "Your installation is guaranteed for life." },
  ],

  addons: [
    {
      id: "furniture",
      title: "Remove & Reinstate Heavy Furniture",
      description: "Move heavy items of furniture out and back into position",
      price: 250,
    },
    {
      id: "underlay-upgrade",
      title: "Underlay Upgrade",
      description: "Premium underlay upgrade for enhanced comfort and longevity",
      price: 250,
    },
  ],

  tiers: [], // Not used for homeowner quotes

  product: {
    id: "product-1",
    productName: "",
    manufacturer: "",
    fibre: "",
    pileType: "",
    badges: [],
    price: 0,
    productUrl: "",
    colours: [],
  },

  terms: [
    "50% non-refundable deposit to secure booking",
    "Remaining 50% due upon practical completion",
  ],

  customerNotes: "",
};

// Keep DEFAULT_CONFIG as alias for backward compat
export const DEFAULT_CONFIG = DEFAULT_AGENT_CONFIG;

// ─── Helpers ──────────────────────────────────────────────────────────

function verifyAdmin(password: string): void {
  const adminPassword = process.env.ADMIN_PASSWORD || "bellcarpets2026";
  if (password !== adminPassword) {
    throw new Error("Invalid admin password");
  }
}

async function getNextQuoteNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return "BC-001";

  // Fetch ALL quote numbers (including soft-deleted) to avoid duplicate-key collisions
  const allQuotes = await db.select({ quoteNumber: quotes.quoteNumber }).from(quotes);
  const maxNum = allQuotes.reduce((max, q) => {
    const num = parseInt((q.quoteNumber || "").replace(/^BC-/, ""), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `BC-${String(maxNum + 1).padStart(3, "0")}`;
}

function generateSlug(quoteNumber: string): string {
  return quoteNumber.toLowerCase();
}

// ─── Email Helpers ────────────────────────────────────────────────────

const LOGO_CDN_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663449952732/EvSxkTrWsYNTCIAI.jpg";

// ─── Scheduling Confirmation Email ─────────────────────────────────────────

interface SchedulingConfirmationData {
  recipientName: string;
  recipientEmail: string;
  quoteNumber: string;
  propertyAddress: string;
  scheduledDate: Date;
  quoteType: "agent" | "homeowner";
}

export async function sendSchedulingConfirmationEmail(data: SchedulingConfirmationData): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[Admin] RESEND_API_KEY not configured — skipping scheduling confirmation email");
    return false;
  }

  const dateStr = formatAESTDate(data.scheduledDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Installation Scheduled — Bell Carpets</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr><td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #e8e8e8;">
          <img src="${LOGO_CDN_URL}" alt="Bell Carpets" style="width:200px;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:48px 48px 40px;">

          <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
            Dear ${data.recipientName},
          </p>

          <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
            Installation scheduled.
          </h1>

          <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
            Your installation at <strong style="color:#111;">${data.propertyAddress}</strong> has been confirmed.
            Please ensure access is available on the day.
          </p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Quote</td>
                  <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.quoteNumber}</td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Property</td>
                  <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.propertyAddress}</td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding:16px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Installation Date</td>
                  <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${dateStr}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">
            If you need to reschedule or have any questions, please reply to this email.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 48px;text-align:center;background:#ffffff;border-top:1px solid #e8e8e8;">
          <img src="${LOGO_CDN_URL}" alt="Bell Carpets" style="height:30px;display:block;margin:0 auto 12px;" />
          <p style="margin:0;font-size:11px;color:#999;font-family:Arial,sans-serif;line-height:1.6;">
            Bell Spec Pty Ltd &nbsp;&middot;&nbsp; ABN 74 613 299 773<br />
            Unit 1, 41 Olympic Circuit, Southport QLD 4215
          </p>
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
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bell Carpets <quotes@bellcarpets.com.au>",
        reply_to: "hello@bellcarpets.com.au",
        to: [data.recipientEmail],
        subject: `Installation Scheduled — ${data.propertyAddress} on ${dateStr}`,
        html: htmlBody,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("[Admin] Scheduling confirmation email failed:", err);
      return false;
    }
    console.log(`[Admin] Scheduling confirmation email sent to ${data.recipientEmail} for ${data.quoteNumber}`);
    return true;
  } catch (e) {
    console.error("[Admin] Scheduling confirmation email error:", e);
    return false;
  }
}

interface QuoteLinkEmailData {
  agentName: string;
  agentEmail: string;
  agentPropertyManager?: string | null;
  quoteNumber: string;
  slug: string;
  clientName: string;
  propertyAddress: string;
  expiresAt: Date;
  origin?: string;
}

export async function sendQuoteLinkEmail(data: QuoteLinkEmailData): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[Admin] RESEND_API_KEY not configured — skipping quote link email");
    return false;
  }

  const origin = data.origin || "https://quote.bellcarpets.com.au";
  const quoteUrl = `${origin}/quote/${data.slug}`;
  const expiryStr = formatAESTDate(data.expiresAt, { day: "2-digit", month: "long", year: "numeric" });

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your Flooring Quote — Bell Carpets</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr><td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #e8e8e8;">
          <img src="${LOGO_CDN_URL}" alt="Bell Carpets" style="width:200px;display:block;margin:0 auto 8px;" />

        </td></tr>

        <!-- Body -->
        <tr><td style="padding:48px 48px 40px;">

          <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
            Dear ${data.agentPropertyManager ? data.agentPropertyManager : data.agentName},
          </p>

          <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
            Your flooring quote is ready.
          </h1>

          <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
            Please review the options below and make your selection before the quote expires.
          </p>

          <!-- Quote details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Quote</td>
                  <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.quoteNumber}</td>
                </tr>
              </table>
            </td></tr>
            ${data.clientName ? `<tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Client</td>
                  <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.clientName}</td>
                </tr>
              </table>
            </td></tr>` : ""}
            ${data.propertyAddress ? `<tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Property</td>
                  <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.propertyAddress}</td>
                </tr>
              </table>
            </td></tr>` : ""}
            <tr><td style="padding:16px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Valid Until</td>
                  <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${expiryStr}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
            <tr><td>
              <a href="${quoteUrl}" style="display:inline-block;background:#ffffff;color:#fff;text-decoration:none;padding:16px 40px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">
                View Your Quote
              </a>
            </td></tr>
          </table>

          <!-- Fallback link -->
          <p style="color:#999;font-size:11px;line-height:1.6;margin:0 0 32px;font-family:Arial,sans-serif;">
            If the button doesn't work, paste this link into your browser:<br />
            <a href="${quoteUrl}" style="color:#555;word-break:break-all;">${quoteUrl}</a>
          </p>

          <!-- Alternative products note -->
          <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;border-top:1px solid #e8e8e8;padding-top:32px;">
            If you'd like a quote on an alternative product, please let us know — we have a wide range of options available.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 48px;text-align:center;background:#ffffff;">
          <img src="${LOGO_CDN_URL}" alt="Bell Carpets" style="height:30px;display:block;margin:0 auto;" />
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Generate the quote PDF to attach
  let pdfAttachment: { filename: string; content: string } | undefined;
  try {
    const { pdfBuffer } = await generateQuotePdfBuffer(data.slug);
    pdfAttachment = {
      filename: `Bell-Carpets-Quote-${data.quoteNumber}.pdf`,
      content: pdfBuffer.toString("base64"),
    };
  } catch (pdfErr) {
    console.warn("[Admin] Could not generate PDF for quote email attachment:", pdfErr);
  }

  try {
    const emailPayload: Record<string, unknown> = {
      from: "Bell Carpets <quotes@bellcarpets.com.au>",
      reply_to: "hello@bellcarpets.com.au",
      to: [data.agentEmail],
      bcc: ["hello@bellcarpets.com.au"],
      subject: `Your Flooring Quote ${data.quoteNumber} — Bell Carpets`,
      html: htmlBody,
    };
    if (pdfAttachment) {
      emailPayload.attachments = [{
        filename: pdfAttachment.filename,
        content: pdfAttachment.content,
      }];
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
      const err = await response.text();
      console.error("[Admin] Quote link email failed:", err);
      return false;
    }
    console.log(`[Admin] Quote link email sent to ${data.agentEmail} for ${data.quoteNumber}${pdfAttachment ? " (with PDF)" : ""}`);
    return true;
  } catch (e) {
    console.error("[Admin] Quote link email error:", e);
    return false;
  }
}

export async function sendReminderEmail(data: QuoteLinkEmailData & { daysLeft: number }): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return false;

  const origin = data.origin || "https://quote.bellcarpets.com.au";
  const quoteUrl = `${origin}/quote/${data.slug}`;
  const expiryStr = formatAESTDate(data.expiresAt, { day: "2-digit", month: "long", year: "numeric" });
  const urgencyText = data.daysLeft === 1 ? "expires tomorrow" : `expires in ${data.daysLeft} days`;
  const isUrgent = data.daysLeft <= 1;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Quote Reminder — Bell Carpets</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr><td style="padding:48px 48px 32px;text-align:center;border-bottom:1px solid #e8e8e8;">
          <img src="${LOGO_CDN_URL}" alt="Bell Carpets" style="width:200px;display:block;margin:0 auto 8px;" />

        </td></tr>

        <!-- Body -->
        <tr><td style="padding:48px 48px 40px;">

          <p style="color:#333;font-size:14px;margin:0 0 32px;font-family:Arial,sans-serif;line-height:1.6;">
            Dear ${data.agentPropertyManager ? data.agentPropertyManager : data.agentName},
          </p>

          <h1 style="color:#111;font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;letter-spacing:-0.01em;">
            ${isUrgent ? "Your quote expires tomorrow." : "A reminder about your quote."}
          </h1>

          <p style="color:#666;font-size:13px;margin:0 0 40px;font-family:Arial,sans-serif;line-height:1.7;">
            Quote <strong style="color:#111;">${data.quoteNumber}</strong> expires on <strong style="color:#111;">${expiryStr}</strong>. Accept before it expires to secure your pricing.
          </p>

          <!-- Quote details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-bottom:40px;">
            <tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Quote</td>
                  <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${data.quoteNumber}</td>
                </tr>
              </table>
            </td></tr>
            ${data.clientName ? `<tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Client</td>
                  <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.clientName}</td>
                </tr>
              </table>
            </td></tr>` : ""}
            ${data.propertyAddress ? `<tr><td style="padding:16px 0;border-bottom:1px solid #e8e8e8;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Property</td>
                  <td style="color:#333;font-size:14px;font-family:Arial,sans-serif;">${data.propertyAddress}</td>
                </tr>
              </table>
            </td></tr>` : ""}
            <tr><td style="padding:16px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#999;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;width:140px;">Expires</td>
                  <td style="color:#111;font-size:14px;font-family:Arial,sans-serif;font-weight:600;">${expiryStr}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
            <tr><td>
              <a href="${quoteUrl}" style="display:inline-block;background:#ffffff;color:#fff;text-decoration:none;padding:16px 40px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">
                ${isUrgent ? "Accept Now" : "Review Quote"}
              </a>
            </td></tr>
          </table>

          <!-- Fallback link -->
          <p style="color:#999;font-size:11px;line-height:1.6;margin:0 0 32px;font-family:Arial,sans-serif;">
            If the button doesn't work, paste this link into your browser:<br />
            <a href="${quoteUrl}" style="color:#555;word-break:break-all;">${quoteUrl}</a>
          </p>

          <!-- Note -->
          <p style="color:#666;font-size:13px;line-height:1.7;margin:0;font-family:Arial,sans-serif;border-top:1px solid #e8e8e8;padding-top:32px;">
            If you have any questions, please don't hesitate to get in touch.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 48px;text-align:center;background:#ffffff;">
          <img src="${LOGO_CDN_URL}" alt="Bell Carpets" style="height:30px;display:block;margin:0 auto;" />
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
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bell Carpets <quotes@bellcarpets.com.au>",
        reply_to: "hello@bellcarpets.com.au",
        to: [data.agentEmail],
        bcc: ["hello@bellcarpets.com.au"],
        subject: `Reminder: Your Quote ${data.quoteNumber} ${urgencyText} — Bell Carpets`,
        html: htmlBody,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("[Admin] Reminder email failed:", err);
      return false;
    }
    console.log(`[Admin] Reminder email sent to ${data.agentEmail} for ${data.quoteNumber}`);
    return true;
  } catch (e) {
    console.error("[Admin] Reminder email error:", e);
    return false;
  }
}


// ─── Router ───────────────────────────────────────────────────────────

export const adminRouter = router({
  /** Password verification */
  verifyPassword: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      const adminPassword = process.env.ADMIN_PASSWORD || "bellcarpets2026";
      return { valid: input.password === adminPassword };
    }),

  /** List all quotes for the admin dashboard */
  listQuotes: publicProcedure
    .input(z.object({ password: z.string() }))
    .query(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) return [];

      // EXPLICIT column selection — never fetch configJson for the list view
      const rows = await db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          slug: quotes.slug,
          quoteType: quotes.quoteType,
          configJson: quotes.configJson,
          jobStatus: quotes.jobStatus,
          acceptedTier: quotes.acceptedTier,
          acceptedColour: quotes.acceptedColour,
          acceptedTotal: quotes.acceptedTotal,
          acceptedAgentName: quotes.acceptedAgentName,
          agentName: quotes.agentName,
          agentEmail: quotes.agentEmail,
          agentPhone: quotes.agentPhone,
          agentPropertyManager: quotes.agentPropertyManager,
          quoteLinkEmailSent: quotes.quoteLinkEmailSent,
          reminderSentAt: quotes.reminderSentAt,
          expiresAt: quotes.expiresAt,
          scheduledDate: quotes.scheduledDate,
          depositPaidAmount: quotes.depositPaidAmount,
          discountAmount: quotes.discountAmount,
          paymentTermsDays: quotes.paymentTermsDays,
          isInsuranceAssessment: quotes.isInsuranceAssessment,
          linkedQuoteSlug: quotes.linkedQuoteSlug,
          reviewStatus: quotes.reviewStatus,
          reviewRequestedAt: quotes.reviewRequestedAt,
          createdAt: quotes.createdAt,
          updatedAt: quotes.updatedAt,
        })
        .from(quotes)
        .where(isNull(quotes.deletedAt))
        .orderBy(desc(quotes.createdAt));

      // Fetch view stats for all quotes in a single query
      const viewStats = await db
        .select({
          quoteSlug: quoteViews.quoteSlug,
          viewCount: sql<number>`COUNT(*)`.as('viewCount'),
          lastViewedAt: sql<Date | null>`MAX(${quoteViews.viewedAt})`.as('lastViewedAt'),
          uniqueIPs: sql<number>`COUNT(DISTINCT ${quoteViews.ipAddress})`.as('uniqueIPs'),
        })
        .from(quoteViews)
        .where(sql`(${quoteViews.isAdmin} = false OR ${quoteViews.isAdmin} IS NULL)`)
        .groupBy(quoteViews.quoteSlug);
      const viewStatsMap = new Map(
        viewStats.map((v) => [v.quoteSlug, { viewCount: Number(v.viewCount), lastViewedAt: v.lastViewedAt, uniqueIPs: Number(v.uniqueIPs) }])
      );

      return rows.map((row) => {
        // Parse configJson ONLY to extract clientName, propertyAddress, pricingMode, and prices
        let clientName = '';
        let propertyAddress = '';
        let pricingMode: string = 'tiered';
        let lowestPrice = 0;
        let highestPrice = 0;
        let depositPercent = 50;
        let tierSummaries: { name: string; price: number }[] = [];
        try {
          const config = JSON.parse(row.configJson) as QuoteConfigData;
          clientName = (config.client?.name ?? '').substring(0, 255);
          propertyAddress = (config.property?.address ?? '').substring(0, 512);
          pricingMode = config.pricingMode ?? 'tiered';
          depositPercent = config.depositPercent ?? 50;
          if (pricingMode !== 'single' && config.tiers?.length > 0) {
            lowestPrice = Math.min(...config.tiers.map((t) => t.price));
            highestPrice = Math.max(...config.tiers.map((t) => t.price));
            tierSummaries = config.tiers.map((t) => ({ name: t.name, price: t.price }));
          } else if (config.product) {
            lowestPrice = config.product.price;
            highestPrice = config.product.price;
          }
        } catch { /* ignore parse errors */ }

        const quoteType = (row.quoteType as QuoteType) || 'agent';

        // Return ONLY safe scalar values — configJson is NEVER included
        return {
          id: row.id,
          quoteNumber: row.quoteNumber,
          slug: row.slug,
          quoteType,
          pricingMode,
          jobStatus: row.jobStatus,
          clientName,
          propertyAddress,
          lowestPrice,
          highestPrice,
          tierSummaries,
          acceptedTier: row.acceptedTier,
          acceptedColour: row.acceptedColour,
          acceptedTotal: row.acceptedTotal,
          depositPercent,
          acceptedAgentName: row.acceptedAgentName,
          agentName: row.agentName,
          agentEmail: row.agentEmail,
          agentPhone: row.agentPhone,
          agentPropertyManager: row.agentPropertyManager,
          quoteLinkEmailSent: row.quoteLinkEmailSent,
          reminderSentAt: row.reminderSentAt,
          expiresAt: row.expiresAt,
          scheduledDate: row.scheduledDate,
          depositPaidAmount: row.depositPaidAmount,
          discountAmount: row.discountAmount ?? 0,
          paymentTermsDays: row.paymentTermsDays ?? 30,
          isInsuranceAssessment: row.isInsuranceAssessment === 1,
          linkedQuoteSlug: row.linkedQuoteSlug,
          reviewStatus: row.reviewStatus ?? "none",
          reviewRequestedAt: row.reviewRequestedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          viewCount: viewStatsMap.get(row.slug)?.viewCount ?? 0,
          lastViewedAt: viewStatsMap.get(row.slug)?.lastViewedAt ?? null,
          uniqueIPs: viewStatsMap.get(row.slug)?.uniqueIPs ?? 0,
          sharingAlert: (viewStatsMap.get(row.slug)?.uniqueIPs ?? 0) > 2,
        };
      });
    }),

  /** Get a single quote by slug (public — for the agent-facing page) */
  getQuote: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select()
        .from(quotes)
        .where(and(eq(sql`LOWER(${quotes.slug})`, input.slug.toLowerCase()), isNull(quotes.deletedAt)))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0]!;
      const config = JSON.parse(row.configJson) as QuoteConfigData;

      // Look up linked quote number if linkedQuoteSlug is set
      let linkedQuoteNumber: string | null = null;
      if (row.linkedQuoteSlug) {
        const linkedRows = await db
          .select({ quoteNumber: quotes.quoteNumber })
          .from(quotes)
          .where(and(eq(quotes.slug, row.linkedQuoteSlug), isNull(quotes.deletedAt)))
          .limit(1);
        linkedQuoteNumber = linkedRows[0]?.quoteNumber ?? null;
      }

      return {
        id: row.id,
        quoteNumber: row.quoteNumber,
        slug: row.slug,
        quoteType: (row.quoteType as QuoteType) || "agent",
        jobStatus: row.jobStatus,
        config,
        acceptedTier: row.acceptedTier,
        acceptedColour: row.acceptedColour,
        acceptedTotal: row.acceptedTotal,
        acceptedAgentName: row.acceptedAgentName,
        acceptedAt: row.acceptedAt,
        expiresAt: row.expiresAt,
        agentName: row.agentName,
        agentEmail: row.agentEmail,
        agentPhone: row.agentPhone,
        agentPropertyManager: row.agentPropertyManager,
        isInsuranceAssessment: row.isInsuranceAssessment === 1,
        linkedQuoteSlug: row.linkedQuoteSlug,
        linkedQuoteNumber,
        scheduledDate: row.scheduledDate,
      };
    }),
  /** Get a single quote config for admin editing */
  getQuoteForEdit: publicProcedure
    .input(z.object({ password: z.string(), slug: z.string() }))
    .query(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select()
        .from(quotes)
        .where(and(eq(sql`LOWER(${quotes.slug})`, input.slug.toLowerCase()), isNull(quotes.deletedAt)))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0]!;

      // Fetch view stats for this quote
      const viewStatsRows = await db
        .select({
          viewCount: sql<number>`COUNT(*)`.as('viewCount'),
          lastViewedAt: sql<Date | null>`MAX(${quoteViews.viewedAt})`.as('lastViewedAt'),
        })
        .from(quoteViews)
        .where(eq(quoteViews.quoteSlug, row.slug));
      const viewCount = Number(viewStatsRows[0]?.viewCount ?? 0);
      const lastViewedAt = viewStatsRows[0]?.lastViewedAt ?? null;

      return {
        id: row.id,
        quoteNumber: row.quoteNumber,
        slug: row.slug,
        quoteType: (row.quoteType as QuoteType) || "agent",
        jobStatus: row.jobStatus,
        expiresAt: row.expiresAt,
        agentName: row.agentName,
        agentEmail: row.agentEmail,
        agentPhone: row.agentPhone,
        agentPropertyManager: row.agentPropertyManager,
        quoteLinkEmailSent: row.quoteLinkEmailSent,
        acceptedTier: row.acceptedTier,
        acceptedColour: row.acceptedColour,
        acceptedTotal: row.acceptedTotal,
        acceptedAt: row.acceptedAt,
        acceptedNotes: row.acceptedNotes,
        scheduledDate: row.scheduledDate,
        internalNotes: row.internalNotes,
        depositPaidAmount: row.depositPaidAmount,
        discountAmount: row.discountAmount ?? 0,
        paymentTermsDays: row.paymentTermsDays ?? 30,
        isInsuranceAssessment: row.isInsuranceAssessment === 1,
        linkedQuoteSlug: row.linkedQuoteSlug,
        reviewStatus: row.reviewStatus ?? "none",
        reviewRequestedAt: row.reviewRequestedAt,
        config: JSON.parse(row.configJson) as QuoteConfigData,
        viewCount,
        lastViewedAt,
      };
    }),

  /** Update internal admin notes on a quote */
  updateInternalNotes: publicProcedure
    .input(
      z.object({
        password: z.string(),
        slug: z.string(),
        internalNotes: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(quotes)
        .set({ internalNotes: input.internalNotes })
        .where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /** Update payment terms (days) on a quote */
  updatePaymentTerms: publicProcedure
    .input(
      z.object({
        password: z.string(),
        slug: z.string(),
        paymentTermsDays: z.number().int().min(1).max(365),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(quotes)
        .set({ paymentTermsDays: input.paymentTermsDays })
        .where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /** Create a new quote with the next sequential number */
  createQuote: publicProcedure
    .input(
      z.object({
        password: z.string(),
        quoteType: z.enum(["agent", "homeowner", "real_estate", "agency_single"]).default("agent"),
        clientName: z.string().optional(),
        propertyAddress: z.string().optional(),
        agentName: z.string().optional(),
        agentEmail: z.string().optional(),
        agentPhone: z.string().optional(),
        agentPropertyManager: z.string().optional(),
        sendQuoteEmail: z.boolean().optional().default(true),
        isInsuranceAssessment: z.boolean().optional().default(false),
        linkedQuoteSlug: z.string().optional(),
        manualQuoteNumber: z.string().optional(), // Allow manual override for recreating deleted quotes like BC-015
        // agency_single fields
        productName: z.string().optional(),
        manufacturer: z.string().optional(),
        colour: z.string().optional(),
        price: z.number().optional(),
        scopeOfWorks: z.array(z.string()).optional(),
        terms: z.array(z.string()).optional()
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Allow manual override for recreating deleted quotes (e.g., BC-015)
      const quoteNumber = input.manualQuoteNumber || (await getNextQuoteNumber());
      const slug = generateSlug(quoteNumber);
      const quoteType: QuoteType = input.quoteType;

      // Determine layout based on quoteType:
      // - homeowner: single product, deposit required
      // - agency_single: single product, NO deposit (agent payment terms)
      // - real_estate: 3-tier, NO deposit (agent payment terms) — ALWAYS tiered, no toggle
      // - agent: 3-tier (legacy)
      const isHomeowner = input.quoteType === "homeowner";
      const isAgencySingle = input.quoteType === "agency_single";
      const usesSingleLayout = isHomeowner || isAgencySingle;
      const baseConfig = usesSingleLayout ? DEFAULT_HOMEOWNER_CONFIG : DEFAULT_AGENT_CONFIG;
      // pricingMode: single for homeowner/agency_single, tiered for real_estate/agent
      const pricingMode: "single" | "tiered" = usesSingleLayout ? "single" : "tiered";

      // For agency_single: build product from input fields if provided
      const agencySingleProduct = isAgencySingle ? {
        id: "product-1",
        productName: input.productName || "",
        manufacturer: input.manufacturer || "",
        fibre: "",
        pileType: "",
        badges: [],
        price: input.price || 0,
        productUrl: "",
        colours: input.colour ? [{ id: "colour-1", name: input.colour, swatchImage: "" }] : [],
        colourName: input.colour || "",
      } : undefined;

      // For agency_single: use no-deposit terms
      const agencySingleTerms = isAgencySingle ? (
        input.terms && input.terms.length > 0
          ? input.terms.map(t => t)
          : ["Full payment due upon practical completion"]
      ) : undefined;

      // For agency_single: use provided scope of works
      const agencySingleScope = isAgencySingle && input.scopeOfWorks && input.scopeOfWorks.length > 0
        ? input.scopeOfWorks.map(s => ({ title: s, description: "" }))
        : undefined;

      const config: QuoteConfigData = {
        ...baseConfig,
        ...(isAgencySingle && agencySingleProduct ? { product: agencySingleProduct } : {}),
        ...(isAgencySingle ? { tiers: [], depositPercent: 0 } : {}),
        ...(agencySingleTerms ? { terms: agencySingleTerms } : {}),
        ...(agencySingleScope ? { scopeOfWorks: agencySingleScope } : {}),
        quoteNumber,
        quoteType,
        pricingMode,
        issueDate: formatAESTDate(new Date(), {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        client: {
          ...baseConfig.client,
          name: input.clientName || "",
          type: isHomeowner ? "Residential" : "Real Estate Agency",
          // Store email in config for homeowner quotes so acceptance emails always have a destination
          ...(isHomeowner && input.agentEmail ? { email: input.agentEmail } : {}),
        },
        property: {
          address: input.propertyAddress || "",
          fullAddress: input.propertyAddress || "",
        },
      };

      // Default expiry: validDays from today, anchored to AEST midnight so the date matches
      // what the customer sees in the payment terms (e.g. "10 days from issue date")
      const validDaysForExpiry = (config as QuoteConfigData & { validDays?: number }).validDays ?? 10;
      const expiresAt = addDaysAEST(parseAESTDate(todayAESTString()), validDaysForExpiry);

      // For real_estate quotes: agentName should be the agency name (clientName), and agentPropertyManager should be the contact person
      const finalAgentName = (quoteType === "real_estate") ? (input.clientName || input.agentName || null) : (input.agentName || null);
      const finalAgentPropertyManager = (quoteType === "real_estate") ? (input.agentName || null) : (input.agentPropertyManager || null);

      await db.insert(quotes).values({
        quoteNumber,
        slug,
        quoteType,
        configJson: JSON.stringify(config),
        expiresAt,
        agentName: finalAgentName,
        agentEmail: input.agentEmail || null,
        agentPhone: input.agentPhone || null,
        agentPropertyManager: finalAgentPropertyManager,
        isInsuranceAssessment: input.isInsuranceAssessment ? 1 : 0,
        linkedQuoteSlug: input.linkedQuoteSlug || null,
      });

      // Send quote link email to agent if email provided
      let emailSent = false;
      if (input.sendQuoteEmail && input.agentEmail) {
        emailSent = await sendQuoteLinkEmail({
          agentName: input.agentName || "Agent",
          agentEmail: input.agentEmail,
          agentPropertyManager: input.agentPropertyManager,
          quoteNumber,
          slug,
          clientName: input.clientName || "",
          propertyAddress: input.propertyAddress || "",
          expiresAt,
        });
        logNotification({ quoteNumber, statusTrigger: "quote_link", channel: "email", recipientEmail: input.agentEmail || undefined, recipientName: input.agentName || undefined, success: emailSent, errorMessage: emailSent ? undefined : "Quote link email send failed" });
        if (emailSent) {
          await db.update(quotes).set({ quoteLinkEmailSent: 1 }).where(eq(quotes.slug, slug));
        }
      }

      return { quoteNumber, slug, quoteType, emailSent };
    }),

  /** Duplicate an existing quote */
  duplicateQuote: publicProcedure
    .input(
      z.object({
        password: z.string(),
        sourceSlug: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const sourceRows = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.slug, input.sourceSlug), isNull(quotes.deletedAt)))
        .limit(1);

      if (sourceRows.length === 0) throw new Error("Source quote not found");

      const sourceRow = sourceRows[0]!;
      const sourceConfig = JSON.parse(sourceRow.configJson) as QuoteConfigData;
      const quoteType = (sourceRow.quoteType as QuoteType) || "agent";

      const quoteNumber = await getNextQuoteNumber();
      const slug = generateSlug(quoteNumber);

      const newConfig: QuoteConfigData = {
        ...sourceConfig,
        quoteNumber,
        quoteType,
        issueDate: formatAESTDate(new Date(), {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        client: {
          ...sourceConfig.client,
          name: "",
        },
        property: {
          address: "",
          fullAddress: "",
        },
      };

      // Set 10-day expiry on all new quotes (including duplicates), anchored to AEST midnight
      const dupValidDays = (newConfig as QuoteConfigData & { validDays?: number }).validDays ?? 10;
      const dupExpiresAt = addDaysAEST(parseAESTDate(todayAESTString()), dupValidDays);

      await db.insert(quotes).values({
        quoteNumber,
        slug,
        quoteType,
        configJson: JSON.stringify(newConfig),
        expiresAt: dupExpiresAt,
      });

      return { quoteNumber, slug, quoteType };
    }),

  /** Update a quote's config and optionally agent contact details */
  updateQuote: publicProcedure
    .input(
      z.object({
        password: z.string(),
        slug: z.string(),
        config: z.any(),
        quoteType: z.enum(["agent", "homeowner", "real_estate", "agency_single"]).optional(),
        agentName: z.string().optional(),
        agentEmail: z.string().optional(),
        agentPhone: z.string().optional(),
        agentPropertyManager: z.string().nullable().optional(),
         isInsuranceAssessment: z.boolean().optional(),
        linkedQuoteSlug: z.string().nullable().optional(),
        discountAmount: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData: Record<string, unknown> = { configJson: JSON.stringify(input.config) };
      if (input.quoteType !== undefined) updateData.quoteType = input.quoteType;
      if (input.agentName !== undefined) updateData.agentName = input.agentName || null;
      if (input.agentEmail !== undefined) updateData.agentEmail = input.agentEmail || null;
      if (input.agentPhone !== undefined) updateData.agentPhone = input.agentPhone || null;
      if (input.agentPropertyManager !== undefined) updateData.agentPropertyManager = input.agentPropertyManager || null;
      if (input.isInsuranceAssessment !== undefined) updateData.isInsuranceAssessment = input.isInsuranceAssessment ? 1 : 0;
      if (input.linkedQuoteSlug !== undefined) updateData.linkedQuoteSlug = input.linkedQuoteSlug || null;
      if (input.discountAmount !== undefined) updateData.discountAmount = input.discountAmount;;

      await db.update(quotes).set(updateData).where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /** Mark a quote as accepted (called from the public acceptance flow) */
  markAccepted: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        tierName: z.string(),
        colourName: z.string(),
        totalPrice: z.number(),
        agentName: z.string(),
        agentEmail: z.string(),
        agentPhone: z.string(),
        agentNotes: z.string().optional().default(""),
        rooms: z.array(z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().int(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // Fetch quote config for property address before updating
      const rows = await db.select().from(quotes).where(and(eq(quotes.slug, input.slug), isNull(quotes.deletedAt))).limit(1);
      const quoteRow = rows[0];
      const config = quoteRow ? JSON.parse(quoteRow.configJson) : {};

      await db
        .update(quotes)
        .set({
          jobStatus: "accepted",
          acceptedTier: input.tierName,
          acceptedColour: input.colourName,
          acceptedTotal: input.totalPrice,
          acceptedAgentName: input.agentName,
          acceptedAgentEmail: input.agentEmail,
          acceptedAgentPhone: input.agentPhone,
          acceptedAt: new Date(),
          acceptedNotes: input.agentNotes || null,
        })
        .where(eq(quotes.slug, input.slug));

      // SMS to Bell Carpets (fire-and-forget — never blocks or throws)
      sendAcceptanceSmsToBellCarpets({
        agentName: input.agentName,
        agentPhone: input.agentPhone,
        quoteNumber: quoteRow?.quoteNumber || input.slug,
        tierName: input.tierName,
        grandTotal: input.totalPrice,
        propertyAddress: config.property?.fullAddress || config.property?.address || "",
      }).catch((err) => console.error("[SMS] sendAcceptanceSmsToBellCarpets error:", err));

      return { success: true };
    }),

  /** Update a quote's job status */
  updateJobStatus: publicProcedure
    .input(
      z.object({
        password: z.string(),
        slug: z.string(),
        jobStatus: z.enum(["draft", "quote_sent", "accepted", "deposit_paid", "scheduled", "completed", "paid_in_full", "cancelled"]),
        scheduledDate: z.date().nullable().optional(),
        /** Actual deposit amount received — required when jobStatus = 'deposit_paid' */
        depositPaidAmount: z.number().int().positive().optional(),
        /** For admin manual acceptance of tiered quotes: the chosen tier name (e.g. "Better") */
        acceptedTierName: z.string().optional(),
        /** For admin manual acceptance: the chosen colour name */
        acceptedColourName: z.string().optional(),
        /** For admin manual acceptance: the total price of the accepted tier */
        acceptedTierTotal: z.number().int().positive().optional(),
        /** For admin manual acceptance: Leon's name (defaults to owner name) */
        acceptedByName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch the current quote row before updating (needed for contact details)
      const rows = await db.select().from(quotes).where(and(eq(quotes.slug, input.slug), isNull(quotes.deletedAt))).limit(1);
      const quoteRow = rows[0];

      const updateData: Record<string, unknown> = { jobStatus: input.jobStatus };
      if (input.scheduledDate !== undefined) {
        updateData.scheduledDate = input.scheduledDate;
      }
      if (input.depositPaidAmount !== undefined) {
        updateData.depositPaidAmount = input.depositPaidAmount;
      }
      // Admin manual acceptance: store tier, colour, total, and timestamp
      if (input.jobStatus === "accepted" && input.acceptedTierName) {
        updateData.acceptedTier = input.acceptedTierName;
        updateData.acceptedColour = input.acceptedColourName || "";
        updateData.acceptedTotal = input.acceptedTierTotal || 0;
        updateData.acceptedAt = new Date();
        updateData.acceptedAgentName = input.acceptedByName || "Admin";
      }

      await db
        .update(quotes)
        .set(updateData)
        .where(eq(quotes.slug, input.slug));

      // NOTE: No acceptance/deposit email is sent when admin manually advances to "accepted".
      // The deposit confirmation email fires ONLY when the customer accepts via the customer-facing
      // quote link (quoteRouter.ts accept mutation). This prevents confusing deposit emails when
      // Leon marks a quote accepted after a verbal agreement.

      // Send scheduling confirmation when status moves to "scheduled" and a date is set
      if (input.jobStatus === "scheduled" && quoteRow) {
        const scheduledDate = input.scheduledDate ?? quoteRow.scheduledDate;
        if (scheduledDate) {
          const config = JSON.parse(quoteRow.configJson) as QuoteConfigData;
          const propertyAddress =
            config.property?.fullAddress || config.property?.address || "";
          const quoteType = (quoteRow.quoteType as QuoteType) || "agent";

          // For agent quotes: use agentEmail/agentPhone stored at quote creation
          // For homeowner quotes: use acceptedAgentEmail/Phone stored at acceptance
          let recipientName = "";
          let recipientEmail = "";
          let recipientPhone = "";

          if (routeNotificationsToAgent(quoteType)) {
            recipientName = quoteRow.agentName || "";
            recipientEmail = quoteRow.agentEmail || "";
            recipientPhone = quoteRow.agentPhone || "";
          } else {
            recipientName = quoteRow.acceptedAgentName || config.client.name || "";
            recipientEmail = quoteRow.acceptedAgentEmail || quoteRow.agentEmail || (config.client as Record<string, string>)?.email || "";
            recipientPhone = quoteRow.acceptedAgentPhone || quoteRow.agentPhone || "";
          }

          // Guard: only send scheduled notification if not already sent (prevents duplicate on re-mark)
          if (recipientEmail && !quoteRow.scheduledNotificationSent) {
            const { notifyScheduled } = await import("./notificationService");
            try {
              await notifyScheduled({
                recipientName: recipientName || "Valued Client",
                recipientEmail,
                recipientPhone,
                quoteNumber: quoteRow.quoteNumber,
                propertyAddress,
                scheduledDate,
              });
              await db.update(quotes)
                .set({ scheduledNotificationSent: 1 })
                .where(eq(quotes.slug, input.slug));
              console.log(`[Admin] scheduledNotificationSent flag set for ${quoteRow.quoteNumber}`);
            } catch (err) {
              console.error("[Admin] notifyScheduled error:", err);
            }
          } else if (quoteRow.scheduledNotificationSent) {
            console.log(`[Admin] Skipping scheduled notification for ${quoteRow.quoteNumber} — already sent`);
          }
        }
      }

      // Send deposit paid notification when status moves to "deposit_paid"
      if (input.jobStatus === "deposit_paid" && quoteRow) {
        const config = JSON.parse(quoteRow.configJson) as QuoteConfigData;
        const quoteType = (quoteRow.quoteType as QuoteType) || "agent";
        const propertyAddress = config.property?.fullAddress || config.property?.address || "";

        let recipientName = "";
        let recipientEmail = "";
        let recipientPhone = "";

        if (routeNotificationsToAgent(quoteType)) {
          // agent, real_estate, agency_single: use the agent contact columns
          recipientName = quoteRow.agentName || "";
          recipientEmail = quoteRow.agentEmail || "";
          recipientPhone = quoteRow.agentPhone || "";
        } else {
          // homeowner: prefer acceptance details, fall back to agentEmail/config.client.email
          recipientName = quoteRow.acceptedAgentName || config.client.name || "";
          recipientEmail = quoteRow.acceptedAgentEmail || quoteRow.agentEmail || (config.client as Record<string, string>)?.email || "";
          recipientPhone = quoteRow.acceptedAgentPhone || quoteRow.agentPhone || "";
        }

        // Update invoice depositAmount — use actual amount entered by admin if provided, otherwise fall back to %
        let invoiceNumber: string | undefined;
        let depositAmount: number | undefined;
        let remainingBalance: number | undefined;
        try {
          const existingInv = await db.select().from(invoices).where(eq(invoices.quoteSlug, input.slug)).limit(1);
          if (existingInv.length > 0) {
            const inv = existingInv[0]!;
            // Use acceptedTotal from the quote as the authoritative total (invoice.totalAmount can be
            // stale if the quote was edited after acceptance). Fall back to inv.totalAmount if needed.
            const totalAmount = quoteRow.acceptedTotal || inv.totalAmount;
            // Prefer admin-entered actual amount; fall back to deposit %
            const actualDeposit = input.depositPaidAmount
              ? input.depositPaidAmount
              : Math.round(totalAmount * ((config.depositPercent || 50) / 100));
            await db.update(invoices)
              .set({ depositAmount: actualDeposit })
              .where(eq(invoices.id, inv.id));
            console.log(`[Admin] Updated invoice ${inv.invoiceNumber} depositAmount to ${actualDeposit} on deposit_paid`);
            invoiceNumber = inv.invoiceNumber;
            depositAmount = actualDeposit;
            remainingBalance = totalAmount - actualDeposit;
          }
        } catch (invErr) {
          console.error("[Admin] Failed to update invoice depositAmount:", invErr);
        }

        // Guard: only send deposit-paid notification if not already sent (prevents duplicate on re-mark)
        if (recipientEmail && !quoteRow.depositPaidNotificationSent) {
          const { notifyDepositPaid } = await import("./notificationService");
          try {
            await notifyDepositPaid({
              recipientName,
              recipientEmail,
              recipientPhone,
              quoteNumber: quoteRow.quoteNumber,
              invoiceNumber,
              propertyAddress,
              depositAmount,
              remainingBalance,
              quoteType: quoteType === "homeowner" ? "homeowner" : "agent",
            });
            await db.update(quotes)
              .set({ depositPaidNotificationSent: 1 })
              .where(eq(quotes.slug, input.slug));
            console.log(`[Admin] depositPaidNotificationSent flag set for ${quoteRow.quoteNumber}`);
          } catch (err) {
            console.error("[Admin] notifyDepositPaid error:", err);
          }
        } else if (quoteRow.depositPaidNotificationSent) {
          console.log(`[Admin] Skipping deposit-paid notification for ${quoteRow.quoteNumber} — already sent`);
        }

      }

      // Handle job completion: invoice + notification + Xero balance sync
      if (input.jobStatus === "completed" && quoteRow) {
        try {
          const config = JSON.parse(quoteRow.configJson) as QuoteConfigData;
          const quoteType = (quoteRow.quoteType as QuoteType) || "agent";
          const propertyAddress = config.property?.fullAddress || config.property?.address || "";

          // Get recipient details
          let recipientName = "";
          let recipientEmail = "";
          let recipientPhone = "";
          if (routeNotificationsToAgent(quoteType)) {
            // Agent/insurance: always use agentEmail/agentPhone (set at quote creation).
            // NEVER fall back to acceptedAgentEmail/Phone — those are homeowner contact details
            // filled in by the person who accepted the quote, not the agent.
            recipientName = quoteRow.agentName || config.client.name || "";
            recipientEmail = quoteRow.agentEmail || "";
            recipientPhone = quoteRow.agentPhone || "";
          } else {
            // Homeowner: prefer contact details filled in at acceptance, but fall back to
            // agentEmail (set at quote creation) and config.client.email if acceptance fields are empty.
            // This handles quotes where the homeowner accepted without entering their email,
            // or where the admin manually advanced the status.
            recipientName = quoteRow.acceptedAgentName || config.client?.name || "";
            recipientEmail = quoteRow.acceptedAgentEmail || quoteRow.agentEmail || (config.client as Record<string, string>)?.email || "";
            recipientPhone = quoteRow.acceptedAgentPhone || quoteRow.agentPhone || "";
          }

          // BUSINESS RULES:
          // ALL quote types now have an invoice created at acceptance.
          // At completion: use the existing invoice, update paymentStatus to balance_due.
          // Fallback: create invoice if somehow missing (e.g., old quotes before this fix).
          // agency_single uses single product layout like homeowner, but agent payment terms (no deposit)
          const isHomeowner = quoteType === "homeowner";
          const usesSingleProductLayout = quoteType === "homeowner" || quoteType === "agency_single";

          // Look for existing invoice (all quote types will have one from acceptance)
          const existingInv = await db.select().from(invoices).where(eq(invoices.quoteSlug, input.slug)).orderBy(desc(invoices.id)).limit(1);
          let invoiceNumber: string;
          let totalAmount: number;
          let depositAmount: number;
          let invoiceId: number;

          // Build line items (used only as fallback for old quotes without acceptance invoice)
          const buildLineItems = () => {
            const items: { description: string; qty: number; unitPrice: number; total: number }[] = [];
            if (usesSingleProductLayout && config.product) {
              items.push({ description: `${config.product.manufacturer} — ${config.product.productName} (Supply & Install)`, qty: 1, unitPrice: config.product.price, total: config.product.price });
            } else if (config.tiers) {
              const tier = config.tiers.find(t => t.name === quoteRow.acceptedTier) || config.tiers[0];
              if (tier) items.push({ description: `${tier.name} — ${tier.manufacturer} ${tier.productName} (Supply & Install)`, qty: 1, unitPrice: tier.price, total: tier.price });
            }
            for (const addon of config.addons || []) {
              items.push({ description: addon.title, qty: 1, unitPrice: addon.price, total: addon.price });
            }
            return items;
          };

          if (existingInv.length > 0) {
            // Invoice exists from acceptance — update to balance_due
            const inv = existingInv[0]!;
            invoiceNumber = inv.invoiceNumber;
            totalAmount = quoteRow.acceptedTotal || inv.totalAmount;
            // BUSINESS RULE: agent/insurance quotes have no deposit — full amount owed at completion.
            // Force depositAmount=0 for agent quotes regardless of what is stored on the invoice
            // (old invoices generated via invoiceRouter.generate may have had a nonzero deposit due to a bug).
            depositAmount = isHomeowner ? inv.depositAmount : 0;
            invoiceId = inv.id;
            await db.update(invoices)
              .set({ paymentStatus: "balance_due" })
              .where(eq(invoices.id, inv.id));
            console.log(`[Admin] Invoice ${invoiceNumber} (${quoteType}) updated to balance_due on completion`);
          } else {
            // Fallback: create invoice at completion for old quotes without acceptance invoice
            const lineItems = buildLineItems();
            const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
            const gst = Math.round(subtotal / 11);
            totalAmount = quoteRow.acceptedTotal || subtotal;
            // No deposit for fallback (agent/insurance); homeowner fallback: use depositPercent
            depositAmount = isHomeowner ? Math.round(totalAmount * ((config.depositPercent || 50) / 100)) : 0;

            // Derive invoice number from quote number (BC-007 → INV-007)
            const qNum = quoteRow.quoteNumber.replace(/^BC-/, '').replace(/^[A-Z]+-/, '');
            invoiceNumber = `INV-${qNum}`;

            const { generateInvoicePdf } = await import("./invoiceGenerator");
            const { storagePut } = await import("./storage");
            const acceptedTier = config.tiers?.find(t => t.name === quoteRow.acceptedTier) || config.tiers?.[0];
            const pdfBuffer = await generateInvoicePdf({
              quoteNumber: quoteRow.quoteNumber,
              invoiceNumber,
              issueDate: formatAESTDate(new Date(), { day: "2-digit", month: "short", year: "numeric" }),
              validDays: config.validDays || 10,
              depositPercent: config.depositPercent || 50,
              clientName: recipientName,
              clientType: config.client?.type || "",
              propertyAddress,
              tierName: usesSingleProductLayout ? (config.product?.productName || "Carpet") : (acceptedTier?.name || "Standard"),
              productName: usesSingleProductLayout ? (config.product?.productName || "") : (acceptedTier?.productName || ""),
              manufacturer: usesSingleProductLayout ? (config.product?.manufacturer || "") : (acceptedTier?.manufacturer || ""),
              fibre: usesSingleProductLayout ? (config.product?.fibre || "") : (acceptedTier?.fibre || ""),
              pileType: usesSingleProductLayout ? (config.product?.pileType || "") : (acceptedTier?.pileType || ""),
              colourName: quoteRow.acceptedColour || "",
              basePrice: usesSingleProductLayout ? (config.product?.price || 0) : (acceptedTier?.price || 0),
              addons: (config.addons || []).map(a => ({ title: a.title, price: a.price })),
              grandTotal: totalAmount,
              scopeOfWorks: config.scopeOfWorks || [],
              terms: config.terms || [],
              agentName: recipientName,
              agentEmail: recipientEmail,
              agentPhone: recipientPhone,
            });

            const fileKey = `invoices/${invoiceNumber}-${Date.now()}.pdf`;
            const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

            await db.insert(invoices).values({
              invoiceNumber,
              quoteSlug: input.slug,
              quoteNumber: quoteRow.quoteNumber,
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
              paymentStatus: isHomeowner ? "balance_due" : "unpaid",
              pdfUrl,
              pdfKey: fileKey,
            });
            console.log(`[Admin] Created ${quoteType} invoice ${invoiceNumber} for ${quoteRow.quoteNumber} on completion`);

            const [newInv] = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.quoteSlug, input.slug)).orderBy(desc(invoices.id)).limit(1);
            invoiceId = newInv?.id ?? 0;
          }

          // Sync to Saasu (fire-and-forget)
          if (invoiceId > 0) {
            try {
              const { isSaasuConfigured, syncInvoiceToSaasu } = await import("./saasuService");
              if (isSaasuConfigured()) {
                const saasuResult = await syncInvoiceToSaasu(invoiceId);
                if (saasuResult.success) {
                  console.log(`[Saasu] Synced completion invoice for ${invoiceNumber} to Saasu`);
                } else {
                  console.warn(`[Saasu] Completion sync failed for ${invoiceNumber}: ${saasuResult.error}`);
                }
              }
            } catch (saasuErr) {
              console.error("[Saasu] Completion sync error (non-critical):", saasuErr);
            }
          }

          // Guard: only send completed notification if not already sent (prevents duplicate on re-mark)
          if (recipientEmail && !quoteRow.completedNotificationSent) {
            const { notifyCompleted } = await import("./notificationService");
            try {
              // Resolve invoice PDF URL for attachment
              // Prefer the stored pdfUrl from the invoice record (already in S3)
              // If missing (old quotes), regenerate and upload to S3
              let invoicePdfUrl: string | undefined;
              try {
                const invRow = await db.select({ pdfUrl: invoices.pdfUrl, pdfKey: invoices.pdfKey })
                  .from(invoices)
                  .where(eq(invoices.quoteSlug, input.slug))
                  .orderBy(desc(invoices.id))
                  .limit(1);
                if (invRow[0]?.pdfUrl) {
                  invoicePdfUrl = invRow[0].pdfUrl;
                  console.log(`[Admin] Using existing invoice PDF for completion email: ${invoicePdfUrl}`);
                } else {
                  // Regenerate PDF for old quotes without stored pdfUrl
                  const { generateInvoicePdf } = await import("./invoiceGenerator");
                  const { storagePut } = await import("./storage");
                  const acceptedTier = config.tiers?.find(t => t.name === quoteRow.acceptedTier) || config.tiers?.[0];
                  const pdfBuffer = await generateInvoicePdf({
                    quoteNumber: quoteRow.quoteNumber,
                    invoiceNumber,
                    issueDate: formatAESTDate(new Date(), { day: "2-digit", month: "short", year: "numeric" }),
                    validDays: config.validDays || 10,
                    depositPercent: config.depositPercent || 50,
                    clientName: recipientName,
                    clientType: config.client?.type || "",
                    propertyAddress,
                    tierName: usesSingleProductLayout ? (config.product?.productName || "Carpet") : (acceptedTier?.name || "Standard"),
                    productName: usesSingleProductLayout ? (config.product?.productName || "") : (acceptedTier?.productName || ""),
                    manufacturer: usesSingleProductLayout ? (config.product?.manufacturer || "") : (acceptedTier?.manufacturer || ""),
                    fibre: usesSingleProductLayout ? (config.product?.fibre || "") : (acceptedTier?.fibre || ""),
                    pileType: usesSingleProductLayout ? (config.product?.pileType || "") : (acceptedTier?.pileType || ""),
                    colourName: quoteRow.acceptedColour || "",
                    basePrice: usesSingleProductLayout ? (config.product?.price || 0) : (acceptedTier?.price || 0),
                    addons: (config.addons || []).map(a => ({ title: a.title, price: a.price })),
                    grandTotal: totalAmount,
                    scopeOfWorks: config.scopeOfWorks || [],
                    terms: config.terms || [],
                    agentName: recipientName,
                    agentEmail: recipientEmail,
                    agentPhone: recipientPhone,
                  });
                  const fileKey = `invoices/${invoiceNumber}-completion-${Date.now()}.pdf`;
                  const { url: regeneratedUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");
                  invoicePdfUrl = regeneratedUrl;
                  // Update invoice record with the new PDF URL
                  await db.update(invoices)
                    .set({ pdfUrl: regeneratedUrl, pdfKey: fileKey })
                    .where(eq(invoices.quoteSlug, input.slug));
                  console.log(`[Admin] Regenerated invoice PDF for completion email: ${invoicePdfUrl}`);
                }
              } catch (pdfErr) {
                console.warn("[Admin] Could not resolve invoice PDF for completion email (non-critical):", pdfErr);
              }

              await notifyCompleted({
                recipientName,
                recipientEmail,
                recipientPhone,
                quoteNumber: quoteRow.quoteNumber,
                invoiceNumber,
                propertyAddress,
                // For agent/insurance: full amount owed (no deposit). For homeowner: total minus deposit paid.
                balanceAmount: totalAmount - depositAmount,
                quoteType,
                invoicePdfUrl,
              });
              await db.update(quotes)
                .set({ completedNotificationSent: 1 })
                .where(eq(quotes.slug, input.slug));
              console.log(`[Admin] completedNotificationSent flag set for ${quoteRow.quoteNumber}`);
            } catch (err) {
              console.error("[Admin] notifyCompleted error:", err);
            }
          } else if (quoteRow.completedNotificationSent) {
            console.log(`[Admin] Skipping completed notification for ${quoteRow.quoteNumber} — already sent`);
          }
        } catch (invErr) {
          console.error("[Admin] Completion handler error (non-critical):", invErr);
        }
      }

      // Send paid in full notification when status moves to "paid_in_full"
      if (input.jobStatus === "paid_in_full" && quoteRow) {
        try {
          const config = JSON.parse(quoteRow.configJson) as QuoteConfigData;
          const quoteType = (quoteRow.quoteType as QuoteType) || "agent";
          const propertyAddress = config.property?.fullAddress || config.property?.address || "";

          // Resolve recipient — same routing as all other status transitions
          let recipientName = "";
          let recipientEmail = "";
          let recipientPhone = "";
          if (routeNotificationsToAgent(quoteType)) {
            recipientName = quoteRow.agentName || config.client?.name || "";
            recipientEmail = quoteRow.agentEmail || "";
            recipientPhone = quoteRow.agentPhone || "";
          } else {
            recipientName = quoteRow.acceptedAgentName || config.client?.name || "";
            recipientEmail = quoteRow.acceptedAgentEmail || quoteRow.agentEmail || (config.client as Record<string, string>)?.email || "";
            recipientPhone = quoteRow.acceptedAgentPhone || quoteRow.agentPhone || "";
          }

          // Look up the invoice to get the invoice number
          const existingInv = await db.select().from(invoices).where(eq(invoices.quoteSlug, input.slug)).orderBy(desc(invoices.id)).limit(1);
          const inv = existingInv[0];
          const invoiceNumber = inv?.invoiceNumber || `INV-${quoteRow.quoteNumber.replace(/^BC-/, '')}`;

          // Update invoice paymentStatus to paid_in_full
          if (inv) {
            await db.update(invoices)
              .set({ paymentStatus: "paid_in_full" })
              .where(eq(invoices.id, inv.id));
            console.log(`[Admin] Invoice ${invoiceNumber} marked paid_in_full`);
          }

          // Guard: only send paid-in-full email if not already sent (prevents double-fire with invoiceRouter path)
          if (recipientEmail && inv && !inv.paidInFullNotificationSent) {
            const { notifyPaidInFull } = await import("./notificationService");
            try {
              await notifyPaidInFull({
                recipientName: recipientName || "Valued Client",
                recipientEmail,
                recipientPhone,
                quoteNumber: quoteRow.quoteNumber,
                propertyAddress,
                invoiceNumber,
              });
              // Set flag so invoiceRouter path cannot fire a duplicate
              await db.update(invoices)
                .set({ paidInFullNotificationSent: 1 })
                .where(eq(invoices.id, inv.id));
              console.log(`[Admin] paidInFullNotificationSent flag set for ${invoiceNumber}`);
            } catch (err) {
              console.error("[Admin] notifyPaidInFull error:", err);
            }
          } else if (inv?.paidInFullNotificationSent) {
            console.log(`[Admin] Skipping paid-in-full email for ${invoiceNumber} — already sent`);
          }
          // SMS Leon — paid in full
          const pifTotal = quoteRow.acceptedTotal ?? 0;
          const pifDeposit = quoteRow.depositPaidAmount ?? 0;
          const pifDiscount = quoteRow.discountAmount ?? 0;
          const pifBalance = Math.max(0, pifTotal - pifDeposit - pifDiscount);
          const pifConfig = config as QuoteConfigData;
          const pifAddress = pifConfig.property?.fullAddress || pifConfig.property?.address || "";

        } catch (pifErr) {
          console.error("[Admin] Paid in full handler error (non-critical):", pifErr);
        }
      }

      return { success: true };
    }),

  /** Set or update the scheduled installation date for a quote */
  setScheduledDate: publicProcedure
    .input(
      z.object({
        password: z.string(),
        slug: z.string(),
        scheduledDate: z.date().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(quotes)
        .set({ scheduledDate: input.scheduledDate })
        .where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /** Get calendar data — all scheduled jobs for a given month */
  getCalendarData: publicProcedure
    .input(
      z.object({
        password: z.string(),
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) return [];

      // Get all quotes with a scheduledDate in the given month
      const startOfMonth = new Date(input.year, input.month - 1, 1);
      const endOfMonth = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const rows = await db
        .select()
        .from(quotes)
        .where(
          sql`${quotes.scheduledDate} >= ${startOfMonth} AND ${quotes.scheduledDate} <= ${endOfMonth}`
        )
        .orderBy(quotes.scheduledDate);

      return rows.map((row) => {
        const config = JSON.parse(row.configJson) as QuoteConfigData;
        return {
          id: row.id,
          quoteNumber: row.quoteNumber,
          slug: row.slug,
          quoteType: (row.quoteType as QuoteType) || "agent",
          jobStatus: row.jobStatus,
          clientName: (config.client?.name ?? '').substring(0, 255),
          propertyAddress: (config.property?.address ?? '').substring(0, 512),
          agentName: row.agentName,
          acceptedTier: row.acceptedTier,
          acceptedTotal: row.acceptedTotal,
          scheduledDate: row.scheduledDate,
        };
      });
    }),

  /** Set or update the expiry date for a quote */
  setExpiryDate: publicProcedure
    .input(
      z.object({
        password: z.string(),
        slug: z.string(),
        expiresAt: z.date().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(quotes)
        .set({ expiresAt: input.expiresAt })
        .where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /** Delete a quote */
  deleteQuote: publicProcedure
    .input(z.object({ password: z.string(), slug: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(quotes).set({ deletedAt: new Date() }).where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /** Re-send (or send for the first time) the quote link email to the agent */
  sendQuoteLink: publicProcedure
    .input(
      z.object({
        password: z.string(),
        slug: z.string(),
        agentName: z.string(),
        agentEmail: z.string(),
        agentPhone: z.string().optional(),
        agentPropertyManager: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await db.select().from(quotes).where(and(eq(quotes.slug, input.slug), isNull(quotes.deletedAt))).limit(1);
      if (rows.length === 0) throw new Error("Quote not found");
      const row = rows[0]!;
      const config = JSON.parse(row.configJson);

      // Update agent contact details on the quote
      await db.update(quotes).set({
        agentName: input.agentName || null,
        agentEmail: input.agentEmail || null,
        agentPhone: input.agentPhone || null,
        agentPropertyManager: input.agentPropertyManager ?? null,
      }).where(eq(quotes.slug, input.slug));

      const expiresAt = row.expiresAt || (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d; })();

      const emailSent = await sendQuoteLinkEmail({
        agentName: input.agentName,
        agentEmail: input.agentEmail,
        agentPropertyManager: input.agentPropertyManager,
        quoteNumber: row.quoteNumber,
        slug: row.slug,
        clientName: config.client?.name || "",
        propertyAddress: config.property?.address || "",
        expiresAt,
      });

      logNotification({ quoteNumber: row.quoteNumber, statusTrigger: "quote_link", channel: "email", recipientEmail: input.agentEmail || undefined, recipientName: input.agentName || undefined, success: emailSent, errorMessage: emailSent ? undefined : "Quote link email send failed" });
      if (emailSent) {
        // Auto-advance from draft → quote_sent when email is sent
        const statusUpdate: Record<string, unknown> = { quoteLinkEmailSent: 1 };
        if (row.jobStatus === "draft") statusUpdate.jobStatus = "quote_sent";
        await db.update(quotes).set(statusUpdate).where(eq(quotes.slug, input.slug));
      }

      // NOTE: Initial quote-send SMS intentionally disabled.
      // The admin sends the quote link manually via their own phone to build rapport.
      // All other automated SMS (acceptance, reminders, scheduling) remain active.

      return { success: true, emailSent };
    }),

  /** LEGACY: Get the first quote's config (backward compat for old single-quote page) */
  getConfig: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_AGENT_CONFIG;

    const rows = await db
      .select()
      .from(quotes)
        .where(isNull(quotes.deletedAt))
      .orderBy(quotes.createdAt)
      .limit(1);

    if (rows.length > 0) {
      return JSON.parse(rows[0]!.configJson) as QuoteConfigData;
    }

    return DEFAULT_AGENT_CONFIG;
  }),

  /** List all soft-deleted (archived) quotes */
  listDeletedQuotes: publicProcedure
    .input(z.object({ password: z.string() }))
    .query(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          quoteNumber: quotes.quoteNumber,
          slug: quotes.slug,
          quoteType: quotes.quoteType,
          configJson: quotes.configJson,
          jobStatus: quotes.jobStatus,
          agentName: quotes.agentName,
          agentEmail: quotes.agentEmail,
          acceptedTotal: quotes.acceptedTotal,
          deletedAt: quotes.deletedAt,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(sql`${quotes.deletedAt} IS NOT NULL`)
        .orderBy(desc(quotes.deletedAt));

      return rows.map((row) => {
        let clientName = '';
        let propertyAddress = '';
        try {
          const config = JSON.parse(row.configJson) as { client?: { name?: string }; property?: { address?: string; fullAddress?: string } };
          clientName = config.client?.name || '';
          propertyAddress = config.property?.fullAddress || config.property?.address || '';
        } catch {}
        return {
          quoteNumber: row.quoteNumber,
          slug: row.slug,
          quoteType: row.quoteType,
          jobStatus: row.jobStatus,
          agentName: row.agentName,
          agentEmail: row.agentEmail,
          acceptedTotal: row.acceptedTotal,
          clientName,
          propertyAddress,
          deletedAt: row.deletedAt,
          createdAt: row.createdAt,
        };
      });
    }),

  /** Restore a soft-deleted quote */
  restoreQuote: publicProcedure
    .input(z.object({ password: z.string(), slug: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(quotes).set({ deletedAt: null }).where(eq(quotes.slug, input.slug));
      return { success: true };
    }),

  /**
   * Get all agencies (real_estate + agent quote types) with summary stats.
   * Returns: agencyName, contactPerson, email, phone, quoteCount, totalRevenue, lastActivityAt
   */
  getAgencies: publicProcedure
    .input(z.object({ password: z.string() }))
    .query(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Pull all non-deleted agent/real_estate/agency_single quotes
      const rows = await db
        .select()
        .from(quotes)
        .where(
          and(
            isNull(quotes.deletedAt),
            sql`${quotes.quoteType} IN ('agent', 'real_estate', 'agency_single')`
          )
        )
        .orderBy(desc(quotes.createdAt));

      // Group by agency name (agentName field)
      const agencyMap = new Map<string, {
        agencyName: string;
        contactPerson: string | null;
        email: string | null;
        phone: string | null;
        quoteCount: number;
        acceptedCount: number;
        totalRevenue: number; // cents
        lastActivityAt: Date | null;
        quoteTypes: Set<string>;
      }>();

      for (const row of rows) {
        const name = row.agentName || "Unknown Agency";
        if (!agencyMap.has(name)) {
          agencyMap.set(name, {
            agencyName: name,
            contactPerson: row.agentPropertyManager || null,
            email: row.agentEmail || null,
            phone: row.agentPhone || null,
            quoteCount: 0,
            acceptedCount: 0,
            totalRevenue: 0,
            lastActivityAt: null,
            quoteTypes: new Set(),
          });
        }
        const entry = agencyMap.get(name)!;
        entry.quoteCount++;
        entry.quoteTypes.add(row.quoteType || "agent");
        // Update contact details from most recent quote if missing
        if (!entry.contactPerson && row.agentPropertyManager) entry.contactPerson = row.agentPropertyManager;
        if (!entry.email && row.agentEmail) entry.email = row.agentEmail;
        if (!entry.phone && row.agentPhone) entry.phone = row.agentPhone;
        // Revenue: use acceptedTotal for accepted/completed quotes
        if (row.acceptedTotal && row.jobStatus && ["accepted", "deposit_paid", "scheduled", "completed", "paid_in_full", "invoice_paid"].includes(row.jobStatus)) {
          entry.acceptedCount++;
          entry.totalRevenue += row.acceptedTotal;
        }
        // Last activity
        const activity = row.updatedAt || row.createdAt;
        if (activity && (!entry.lastActivityAt || activity > entry.lastActivityAt)) {
          entry.lastActivityAt = activity;
        }
      }

      // Sort by total revenue desc, then by quote count
      const agencies = Array.from(agencyMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue || b.quoteCount - a.quoteCount)
        .map(a => ({
          ...a,
          quoteTypes: Array.from(a.quoteTypes),
          agencySlug: encodeURIComponent(a.agencyName.toLowerCase().replace(/\s+/g, "-")),
        }));

      return agencies;
    }),

  /**
   * Get full profile for a single agency: all quotes + all invoices + revenue breakdown.
   */
  getAgencyProfile: publicProcedure
    .input(z.object({ password: z.string(), agencyName: z.string() }))
    .query(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // All non-deleted quotes for this agency
      const agencyQuotes = await db
        .select()
        .from(quotes)
        .where(
          and(
            isNull(quotes.deletedAt),
            eq(quotes.agentName, input.agencyName),
            sql`${quotes.quoteType} IN ('agent', 'real_estate', 'agency_single')`
          )
        )
        .orderBy(desc(quotes.createdAt));

      // All invoices linked to those quotes
      const slugs = agencyQuotes.map(q => q.slug);
      const agencyInvoices = slugs.length > 0
        ? await db
            .select()
            .from(invoices)
            .where(sql`${invoices.quoteSlug} IN (${sql.join(slugs.map(s => sql`${s}`), sql`, `)})`)
            .orderBy(desc(invoices.createdAt))
        : [];

      // Revenue summary
      const totalQuoted = agencyQuotes
        .filter(q => q.acceptedTotal && q.jobStatus && ["accepted", "deposit_paid", "scheduled", "completed", "paid_in_full", "invoice_paid"].includes(q.jobStatus))
        .reduce((sum, q) => sum + (q.acceptedTotal || 0), 0);
      const totalInvoiced = agencyInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const totalPaid = agencyInvoices
        .filter(i => ["paid_in_full", "balance_due", "deposit_paid"].includes(i.paymentStatus))
        .reduce((sum, i) => {
          if (i.paymentStatus === "paid_in_full") return sum + i.totalAmount;
          if (i.paymentStatus === "balance_due") return sum + i.depositAmount;
          if (i.paymentStatus === "deposit_paid") return sum + i.depositAmount;
          return sum;
        }, 0);

      // Agency contact details from most recent quote
      const mostRecent = agencyQuotes[0];
      const contactPerson = mostRecent?.agentPropertyManager || null;
      const email = mostRecent?.agentEmail || null;
      const phone = mostRecent?.agentPhone || null;

      // Map quotes to summary objects
      const quoteSummaries = agencyQuotes.map(q => {
        const config = q.configJson ? (() => { try { return JSON.parse(q.configJson); } catch { return {}; } })() : {};
        const propertyAddress = config.property?.fullAddress || config.property?.address || "";
        return {
          slug: q.slug,
          quoteNumber: q.quoteNumber,
          quoteType: q.quoteType,
          jobStatus: q.jobStatus,
          propertyAddress,
          acceptedTotal: q.acceptedTotal,
          acceptedTier: q.acceptedTier,
          createdAt: q.createdAt,
          expiresAt: q.expiresAt,
          scheduledDate: q.scheduledDate,
        };
      });

      return {
        agencyName: input.agencyName,
        contactPerson,
        email,
        phone,
        quotes: quoteSummaries,
        invoices: agencyInvoices,
        revenue: {
          totalQuoted,
          totalInvoiced,
          totalPaid,
          outstanding: totalInvoiced - totalPaid,
        },
      };
    }),

  /**
   * Mark a quote as emailed (sets quoteLinkEmailSent = 1).
   * Called when the admin taps the Email Template button — they've copied the
   * template and are about to paste it into Gmail, so the quote is effectively emailed.
   */
  markEmailed: publicProcedure
    .input(z.object({ password: z.string(), slug: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(quotes)
        .set({ quoteLinkEmailSent: 1 })
        .where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /**
   * Request a Google review from a homeowner — sends email + SMS with $100 off offer.
   * Only for homeowner quotes that are completed.
   */
  requestReview: publicProcedure
    .input(z.object({ password: z.string(), slug: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await db.select().from(quotes).where(and(eq(quotes.slug, input.slug), isNull(quotes.deletedAt))).limit(1);
      if (rows.length === 0) throw new Error("Quote not found");
      const quote = rows[0]!;

      if (quote.quoteType !== "homeowner") throw new Error("Review requests are only for homeowner quotes");
      if (quote.jobStatus !== "completed" && quote.jobStatus !== "paid_in_full") throw new Error("Quote must be completed before requesting a review");

      const config = JSON.parse(quote.configJson) as QuoteConfigData;
      const recipientName = quote.acceptedAgentName || config.client?.name || "";
      const firstName = recipientName.split(" ")[0] || recipientName;
      const recipientEmail = quote.acceptedAgentEmail || quote.agentEmail || (config.client as Record<string, string>)?.email || "";
      const recipientPhone = quote.acceptedAgentPhone || quote.agentPhone || "";
      const propertyAddress = config.property?.fullAddress || config.property?.address || "";

      const { notifyReviewRequest } = await import("./notificationService");
      const result = await notifyReviewRequest({
        firstName,
        recipientEmail,
        recipientPhone,
        quoteNumber: quote.quoteNumber,
        propertyAddress,
      });

      await db.update(quotes).set({
        reviewStatus: "requested",
        reviewRequestedAt: new Date(),
      }).where(eq(quotes.slug, input.slug));

      return { success: true, emailSent: result.emailSent, smsSent: result.smsSent };
    }),

  /**
   * Mark that the homeowner has left a Google review — applies $100 credit.
   */
  markReviewReceived: publicProcedure
    .input(z.object({ password: z.string(), slug: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await db.select().from(quotes).where(and(eq(quotes.slug, input.slug), isNull(quotes.deletedAt))).limit(1);
      if (rows.length === 0) throw new Error("Quote not found");
      const quote = rows[0]!;

      if (quote.quoteType !== "homeowner") throw new Error("Review credits are only for homeowner quotes");

      // Apply $100 credit (10000 cents) to discountAmount
      const currentDiscount = quote.discountAmount ?? 0;
      const reviewCredit = 10000; // $100 in cents
      const newDiscount = currentDiscount + reviewCredit;

      await db.update(quotes).set({
        reviewStatus: "credit_applied",
        reviewReceivedAt: new Date(),
        discountAmount: newDiscount,
      }).where(eq(quotes.slug, input.slug));

      // Also update the invoice if one exists
      const invoiceRows = await db.select().from(invoices).where(eq(invoices.quoteSlug, input.slug)).limit(1);
      if (invoiceRows.length > 0) {
        const inv = invoiceRows[0]!;
        const newTotal = Math.max(0, inv.totalAmount - reviewCredit);
        await db.update(invoices).set({
          totalAmount: newTotal,
          notes: (inv.notes ? inv.notes + "\n" : "") + "$100 Google Review credit applied",
        }).where(eq(invoices.quoteSlug, input.slug));
      }

      return { success: true, newDiscountAmount: newDiscount };
    }),

  /**
   * Get detailed view analytics for a specific quote.
   * Returns unique visitor breakdown with IP, location, device, view count.
   */
  getQuoteViewAnalytics: publicProcedure
    .input(z.object({
      password: z.string(),
      slug: z.string(),
    }))
    .query(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) return { visitors: [], totalViews: 0, uniqueIPs: 0, sharingAlert: false };

      // Get all non-admin views for this quote
      const allViews = await db
        .select()
        .from(quoteViews)
        .where(
          and(
            eq(quoteViews.quoteSlug, input.slug),
            sql`(${quoteViews.isAdmin} = false OR ${quoteViews.isAdmin} IS NULL)`
          )
        )
        .orderBy(sql`${quoteViews.viewedAt} DESC`);

      // Group by IP + user-agent to identify unique visitors
      const visitorMap = new Map<string, {
        ipAddress: string;
        city: string | null;
        country: string | null;
        deviceType: string | null;
        userAgent: string | null;
        viewCount: number;
        firstSeen: Date;
        lastSeen: Date;
        viewTimestamps: Date[];
      }>();

      for (const view of allViews) {
        const key = `${view.ipAddress || "unknown"}::${view.userAgent || "unknown"}`;
        const existing = visitorMap.get(key);
        if (existing) {
          existing.viewCount++;
          existing.viewTimestamps.push(view.viewedAt);
          if (view.viewedAt < existing.firstSeen) existing.firstSeen = view.viewedAt;
          if (view.viewedAt > existing.lastSeen) existing.lastSeen = view.viewedAt;
          if (!existing.city && view.city) existing.city = view.city;
          if (!existing.country && view.country) existing.country = view.country;
        } else {
          visitorMap.set(key, {
            ipAddress: view.ipAddress || "unknown",
            city: view.city || null,
            country: view.country || null,
            deviceType: view.deviceType || (view.userAgent?.includes("Mobile") ? "mobile" : "desktop"),
            userAgent: view.userAgent || null,
            viewCount: 1,
            firstSeen: view.viewedAt,
            lastSeen: view.viewedAt,
            viewTimestamps: [view.viewedAt],
          });
        }
      }

      const visitors = Array.from(visitorMap.values()).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

      // Count unique IPs (excluding unknown)
      const uniqueIPs = new Set(
        allViews.map(v => v.ipAddress).filter(ip => ip && ip !== "unknown")
      ).size;

      // Sharing alert: more than 2 unique IPs
      const sharingAlert = uniqueIPs > 2;

      return {
        visitors,
        totalViews: allViews.length,
        uniqueIPs,
        sharingAlert,
      };
    }),

  /**
   * Reactivate a cancelled quote — reset status to draft and expiry to 10 days from now.
   */
  reactivateQuote: publicProcedure
    .input(z.object({ password: z.string(), slug: z.string() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await db.select().from(quotes).where(and(eq(quotes.slug, input.slug), isNull(quotes.deletedAt))).limit(1);
      if (!rows[0]) throw new Error("Quote not found");
      if (rows[0].jobStatus !== "cancelled") throw new Error("Only cancelled quotes can be reactivated");

      const newExpiry = addDaysAEST(parseAESTDate(todayAESTString()), 10);

      await db.update(quotes)
        .set({ jobStatus: "draft", expiresAt: newExpiry })
        .where(eq(quotes.slug, input.slug));

      return { success: true };
    }),

  /**
   * Manually retry Saasu sync for a specific invoice.
   * Use when auto-sync failed (e.g. blank client name at time of completion).
   */
  retrySaasuSync: publicProcedure
    .input(z.object({ password: z.string(), invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      verifyAdmin(input.password);
      const { isSaasuConfigured, syncInvoiceToSaasu } = await import("./saasuService");
      if (!isSaasuConfigured()) {
        throw new Error("Saasu credentials not configured");
      }
      // Clear any previous sync error so the function retries cleanly
      const db = await getDb();
      if (db) {
        await db.update(invoices)
          .set({ xeroInvoiceId: null, xeroSyncError: null })
          .where(eq(invoices.id, input.invoiceId));
      }
      const result = await syncInvoiceToSaasu(input.invoiceId);
      if (!result.success) {
        throw new Error(result.error || "Saasu sync failed");
      }
      return { success: true };
    }),
});
