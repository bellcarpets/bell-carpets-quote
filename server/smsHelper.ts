/**
 * smsHelper.ts
 * Shared Twilio SMS helper — all SMS notifications go through here.
 * Errors are always caught and logged; they never throw to callers.
 */

const BELL_CARPETS_PHONE = "+61466912786"; // Bell Carpets hello number (= Leon's mobile)
const LEON_PHONE = "+61466912786"; // Leon's personal mobile — owner notifications only
const APP_BASE_URL =
  process.env.APP_URL || "https://quote.bellcarpets.com.au";

/**
 * Normalise an Australian phone number to E.164 format (+61...).
 * Handles: 04XX XXX XXX, +614XX XXX XXX, 614XX XXX XXX
 * Returns null if the number looks invalid.
 */
export function normaliseAuPhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  // Already E.164 with country code
  if (digits.startsWith("61") && digits.length === 11) return `+${digits}`;
  // Local mobile 04XX...
  if (digits.startsWith("0") && digits.length === 10) return `+61${digits.slice(1)}`;
  // Already stripped of leading 0 (e.g. 4XX XXX XXX)
  if (!digits.startsWith("0") && !digits.startsWith("61") && digits.length === 9) return `+61${digits}`;
  // International format already
  if (raw.startsWith("+")) return raw.replace(/\s/g, "");
  return null;
}

/**
 * Send a single SMS via Twilio REST API.
 * Returns true on success, false on any failure (never throws).
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.warn("[SMS] Twilio credentials not configured — skipping SMS");
    return false;
  }

  const normalisedTo = normaliseAuPhone(to) ?? to;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalisedTo,
          From: from,
          Body: body,
        }).toString(),
      }
    );

    if (response.ok) {
      console.log(`[SMS] Sent to ${normalisedTo}`);
      return true;
    }

    const err = await response.text();
    console.error(`[SMS] Twilio error ${response.status} to ${normalisedTo}:`, err);
    return false;
  } catch (error) {
    console.error(`[SMS] Network error sending to ${normalisedTo}:`, error);
    return false;
  }
}

// ─── Pre-built message builders ──────────────────────────────────────

/**
 * SMS 1: Sent to agent when their quote link is dispatched.
 */
export async function sendQuoteLinkSms(data: {
  agentPhone: string;
  agentName: string;
  agentPropertyManager?: string | null;
  quoteNumber: string;
  slug: string;
  clientName?: string;
  propertyAddress?: string;
}): Promise<boolean> {
  const recipientName = data.agentPropertyManager || data.agentName;
  const address = data.propertyAddress || "";
  const quoteLink = `quote.bellcarpets.com.au/quote/${data.quoteNumber}`;
  const body =
    `Hi ${recipientName}, Leon from Bell Carpets.\n\n` +
    `Your carpet quote for ${address} is ready:\n\n` +
    `→ ${quoteLink}\n\n` +
    `If you'd prefer a quote on an alternative product from our range, just let me know.\n\n` +
    `Cheers,\nLeon`;
  return sendSms(data.agentPhone, body);
}

/**
 * SMS 2: Sent to Bell Carpets (Leon) when a quote is accepted.
 * Format: "BC-009 accepted by Cameron — $4,450 — 9 Jondaryan St, Ormeau"
 */
export async function sendAcceptanceSmsToBellCarpets(data: {
  agentName: string;
  agentPhone: string;
  quoteNumber: string;
  tierName: string;
  grandTotal: number;
  propertyAddress?: string;
}): Promise<boolean> {
  const fmt = (n: number) => "$" + n.toLocaleString("en-AU");
  const property = data.propertyAddress ? ` — ${data.propertyAddress}` : "";
  const body =
    `${data.quoteNumber} accepted by ${data.agentName} — ${fmt(data.grandTotal)}${property}`;
  return sendSms(BELL_CARPETS_PHONE, body);
}

/**
 * SMS 3: Sent to agent as an expiry reminder.
 */
export async function sendReminderSms(data: {
  agentPhone: string;
  agentName: string;
  agentPropertyManager?: string | null;
  quoteNumber: string;
  slug: string;
  daysLeft: number;
  propertyAddress?: string;
}): Promise<boolean> {
  const quoteUrl = `${APP_BASE_URL}/quote/${data.slug}`;
  const urgency =
    data.daysLeft <= 1 ? "TOMORROW" : `in ${data.daysLeft} days`;
  const property = data.propertyAddress ? ` for ${data.propertyAddress}` : "";
  const recipientName = data.agentPropertyManager || data.agentName;
  const body =
    `Hi ${recipientName}, reminder: your Bell Carpets quote ${data.quoteNumber}${property} expires ${urgency}. ` +
    `Accept here: ${quoteUrl} — Bell Carpets 07 5571 1177`;
  return sendSms(data.agentPhone, body);
}

// ─── Leon personal owner notifications ───────────────────────────────────────
// These go ONLY to Leon's mobile. Never to customers.

/**
 * Notify Leon when a deposit is received.
 * e.g. "Deposit received on BC-009 — $2,225 from Cameron"
 */
export async function sendDepositReceivedToLeon(data: {
  quoteNumber: string;
  clientName: string;
  depositAmount: number;
  propertyAddress?: string;
}): Promise<boolean> {
  const fmt = (n: number) => "$" + n.toLocaleString("en-AU");
  const property = data.propertyAddress ? ` — ${data.propertyAddress}` : "";
  const body = `💰 Deposit received on ${data.quoteNumber}${property} — ${fmt(data.depositAmount)} from ${data.clientName}`;
  return sendSms(LEON_PHONE, body);
}

/**
 * Notify Leon when a quote is marked paid in full.
 * e.g. "BC-009 paid in full — $2,225 balance received from Cameron"
 */
export async function sendPaidInFullToLeon(data: {
  quoteNumber: string;
  clientName: string;
  balanceAmount: number;
  propertyAddress?: string;
}): Promise<boolean> {
  const fmt = (n: number) => "$" + n.toLocaleString("en-AU");
  const property = data.propertyAddress ? ` — ${data.propertyAddress}` : "";
  const body = `✅ ${data.quoteNumber} paid in full${property} — ${fmt(data.balanceAmount)} balance received from ${data.clientName}`;
  return sendSms(LEON_PHONE, body);
}
