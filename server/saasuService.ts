/**
 * saasuService.ts
 * Saasu Accounting Integration
 *
 * Auth: wsAccessKey + FileId as query params on every request.
 *
 * Invoice format (confirmed with Leon):
 * - Type: Tax Invoice (TransactionType: "S")
 * - Summary: "Re: [property address]"
 * - Terms: COD
 * - IsTaxInclusive: TRUE — amounts are full inc-GST price
 * - ONE line item: "Supply & Installation of [product] to [areas]"
 * - Account: Income: Sales (ID 1664734)
 * - Tax Code: G1
 * - Amount: full quote price inc GST (stored as integer dollars in CRM)
 * - Invoice number: omitted — Saasu auto-numbers
 *
 * Contact rules:
 * - Agency quotes: CompanyName = agency/client name
 * - Homeowner quotes: GivenName + FamilyName
 */

import { getDb } from "./db";
import { invoices } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { toAESTDateString } from "../shared/aestUtils";
import { routeNotificationsToAgent } from "../shared/quoteConfigTypes";

// ─── Config ──────────────────────────────────────────────────────────────────
const SAASU_API_BASE = (process.env.SAASU_API_BASE_URL || "https://api.saasu.com").replace(/\/$/, "");
const SAASU_FILE_ID = process.env.SAASU_FILE_ID || "";
const SAASU_WS_KEY = process.env.SAASU_WS_ACCESS_KEY || "";

// Income: Sales account — verified via GET /Accounts (AccountType: Income, DefaultTaxCode: G1)
const SALES_ACCOUNT_ID = 1664734;
// Bell Spec Pty Ltd bank account — used for payment recording
const DEFAULT_PAYMENT_ACCOUNT_ID = 3701368;

// ─── Config Check ───────────────────────────────────────────────────────────

/** Returns true if Saasu credentials are configured in env */
export function isSaasuConfigured(): boolean {
  return Boolean(SAASU_FILE_ID && SAASU_WS_KEY);
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

function authParams(): string {
  return `wsAccessKey=${SAASU_WS_KEY}&FileId=${SAASU_FILE_ID}`;
}

function buildUrl(path: string, extraParams?: string): string {
  const separator = path.includes("?") ? "&" : "?";
  const base = `${SAASU_API_BASE}${path}${separator}${authParams()}`;
  return extraParams ? `${base}&${extraParams}` : base;
}

async function saasuRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  extraParams?: string
): Promise<T> {
  const url = buildUrl(path, extraParams);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const opts: RequestInit = { method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Saasu ${method} ${path} failed: ${res.status} ${text}`);
  }

  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

// ─── Contact Management ──────────────────────────────────────────────────────

interface SaasuContact {
  Id: number;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  EmailAddress?: string;
}

interface ContactSearchResponse {
  Contacts?: SaasuContact[];
  TotalResponse?: number;
}

/**
 * Find an existing Saasu contact by email or company name.
 * If not found, create one.
 *
 * Agency quotes: CompanyName = agency/client name.
 * Homeowner quotes: GivenName + FamilyName.
 */
export async function findOrCreateSaasuContact(params: {
  name: string;
  email?: string | null;
  phone?: string | null;
  isCompany?: boolean;
}): Promise<{ contactId: number; name: string }> {
  const { name, email, phone, isCompany } = params;

  // Try lookup by email first (most reliable)
  if (email) {
    try {
      const searchRes = await saasuRequest<ContactSearchResponse>(
        "GET",
        "/Contacts",
        undefined,
        `Email=${encodeURIComponent(email)}`
      );
      if (searchRes.Contacts && searchRes.Contacts.length > 0) {
        const c = searchRes.Contacts[0];
        return {
          contactId: c.Id,
          name: c.CompanyName || `${c.GivenName || ""} ${c.FamilyName || ""}`.trim(),
        };
      }
    } catch (e) {
      console.warn("[Saasu] Contact email search failed:", e);
    }
  }

  // Try lookup by company name for agencies
  if (isCompany && name) {
    try {
      const searchRes = await saasuRequest<ContactSearchResponse>(
        "GET",
        "/Contacts",
        undefined,
        `CompanyName=${encodeURIComponent(name)}`
      );
      if (searchRes.Contacts && searchRes.Contacts.length > 0) {
        const c = searchRes.Contacts[0];
        return {
          contactId: c.Id,
          name: c.CompanyName || `${c.GivenName || ""} ${c.FamilyName || ""}`.trim(),
        };
      }
    } catch (e) {
      console.warn("[Saasu] Contact company search failed:", e);
    }
  }

  // Guard: Saasu rejects contacts with no name fields — use fallback if blank
  const safeName = name?.trim() || "Unknown Client";

  // Create new contact
  const contactPayload: Record<string, any> = {};

  if (isCompany) {
    contactPayload.CompanyName = safeName;
    // Saasu requires GivenName+FamilyName even for company contacts
    contactPayload.GivenName = "Accounts";
    contactPayload.FamilyName = safeName;
  } else {
    const nameParts = safeName.split(/\s+/);
    contactPayload.GivenName = nameParts[0] || safeName;
    contactPayload.FamilyName = nameParts.slice(1).join(" ") || safeName;
  }

  if (email) contactPayload.EmailAddress = email;
  if (phone) contactPayload.MobilePhone = phone;

  const createRes = await saasuRequest<{ InsertedEntityId?: number; Id?: number }>(
    "POST",
    "/Contact",
    contactPayload
  );

  const contactId = (createRes as any).InsertedContactId || createRes.InsertedEntityId || createRes.Id;
  if (!contactId) {
    throw new Error(`[Saasu] Contact creation returned no ID. Response: ${JSON.stringify(createRes)}`);
  }

  console.log(`[Saasu] Created contact "${name}" → ID ${contactId}`);
  return { contactId, name };
}

// ─── Invoice Creation ────────────────────────────────────────────────────────

interface SaasuLineItem {
  Description: string;
  TotalAmount: number; // inc-GST dollars (IsTaxInclusive: true)
  TaxCode: string;
  AccountId: number;
  // Quantity and UnitPrice are optional — Saasu accepts TotalAmount only
}

interface SaasuInvoicePayload {
  TransactionType: "S";
  Layout: "S";             // Required: "S" = Service/Tax Invoice layout
  BillingContactId: number; // Saasu uses BillingContactId (not ContactId)
  TransactionDate: string; // ISO datetime e.g. "2026-05-14T00:00:00"
  DueDate: string;         // ISO datetime e.g. "2026-05-14T00:00:00"
  Summary: string;         // "Re: [property address]"
  PurchaseOrderNumber?: string; // BC-XXX quote reference for cross-referencing
  Terms: { Type: 3 };      // Type 3 = CashOnDelivery (COD)
  IsTaxInc: true;          // Saasu field name is IsTaxInc (not IsTaxInclusive)
  LineItems: SaasuLineItem[];
  // InvoiceNumber intentionally omitted — Saasu auto-numbers
}

interface SaasuInvoiceResponse {
  InsertedEntityId?: number;
  Id?: number;
  InvoiceNumber?: string;
}

/**
 * Create a Tax Invoice in Saasu.
 *
 * Single line item, amounts inc-GST, Terms: COD, Account: Income: Sales.
 */
export async function createSaasuInvoice(params: {
  contactId: number;
  summary: string;          // "Re: [property address]"
  purchaseOrderNumber: string; // BC-XXX quote reference
  date: string;             // YYYY-MM-DD
  dueDate: string;          // YYYY-MM-DD
  lineDescription: string;  // "Supply & Installation of [product] to [areas]"
  totalIncGst: number;      // full inc-GST amount in dollars
}): Promise<{ invoiceId: number }> {
  const lineItem: SaasuLineItem = {
    Description: params.lineDescription,
    TotalAmount: params.totalIncGst,
    TaxCode: "G1",
    AccountId: SALES_ACCOUNT_ID,
  };

  // Convert YYYY-MM-DD to ISO datetime string Saasu expects
  const toSaasuDate = (d: string) => d.includes("T") ? d : `${d}T00:00:00`;

  const payload: SaasuInvoicePayload = {
    TransactionType: "S",
    Layout: "S",
    BillingContactId: params.contactId, // Saasu uses BillingContactId
    TransactionDate: toSaasuDate(params.date),
    DueDate: toSaasuDate(params.dueDate),
    Summary: params.summary,
    PurchaseOrderNumber: params.purchaseOrderNumber, // BC-XXX for cross-referencing
    Terms: { Type: 3 }, // 3 = CashOnDelivery
    IsTaxInc: true,     // Saasu field name is IsTaxInc (not IsTaxInclusive)
    LineItems: [lineItem],
  };

  const res = await saasuRequest<SaasuInvoiceResponse>("POST", "/Invoice", payload);
  const invoiceId = res.InsertedEntityId || res.Id;
  if (!invoiceId) {
    throw new Error(`[Saasu] Invoice creation returned no ID. Response: ${JSON.stringify(res)}`);
  }

  console.log(`[Saasu] Created invoice → Saasu ID ${invoiceId} (${params.summary}, $${params.totalIncGst})`);
  return { invoiceId };
}

// ─── Payment Recording ───────────────────────────────────────────────────────

interface SaasuPaymentPayload {
  TransactionType: "SP";
  PaymentAccountId: number;
  Date: string;
  Summary?: string;
  PaymentItems: Array<{
    InvoiceTransactionId: number;
    AmountApplied: number; // inc-GST dollars (matching invoice)
  }>;
}

/**
 * Record a payment against a Saasu invoice.
 * Amount should be inc-GST dollars (matching IsTaxInclusive: true on the invoice).
 */
export async function recordSaasuPayment(params: {
  saasuInvoiceId: number;
  amount: number; // inc-GST dollars
  date: string;   // YYYY-MM-DD
  summary?: string;
}): Promise<{ paymentId: number }> {
  const payload: SaasuPaymentPayload = {
    TransactionType: "SP",
    PaymentAccountId: DEFAULT_PAYMENT_ACCOUNT_ID,
    Date: params.date,
    Summary: params.summary || "Payment received",
    PaymentItems: [
      {
        InvoiceTransactionId: params.saasuInvoiceId,
        AmountApplied: params.amount,
      },
    ],
  };

  const res = await saasuRequest<{ InsertedEntityId?: number; Id?: number }>(
    "POST",
    "/Payment",
    payload
  );

  const paymentId = res.InsertedEntityId || res.Id;
  if (!paymentId) {
    throw new Error(`[Saasu] Payment recording returned no ID. Response: ${JSON.stringify(res)}`);
  }

  console.log(`[Saasu] Recorded payment $${params.amount} (inc-GST) against invoice ${params.saasuInvoiceId} → Payment ID ${paymentId}`);
  return { paymentId };
}

// ─── Line Description Builder ─────────────────────────────────────────────────

/**
 * Build the single Saasu line item description from quote config.
 * Format: "Supply & Installation of [product name] to [scope/areas]"
 *
 * For homeowner quotes: use the scope field (e.g. "2 bedrooms, robes")
 * For agent/tiered quotes: use the accepted tier product name
 */
export function buildSaasuLineDescription(params: {
  productName?: string | null;
  manufacturer?: string | null;
  scope?: string | null;
  acceptedTier?: string | null;
  acceptedColour?: string | null;
}): string {
  const { productName, manufacturer, scope, acceptedTier } = params;

  // Build product string
  let product = "";
  if (manufacturer && productName) {
    product = `${manufacturer} ${productName}`;
  } else if (productName) {
    product = productName;
  } else if (acceptedTier) {
    product = acceptedTier;
  } else {
    product = "carpet";
  }

  // Build area string from scope
  const area = scope?.trim().replace(/\.$/, "") || "nominated areas";

  return `Supply & Installation of ${product} to ${area}`;
}

// ─── High-Level Integration ──────────────────────────────────────────────────

/**
 * Sync a CRM invoice to Saasu on job completion.
 *
 * Creates a single-line Tax Invoice (inc-GST, COD, Income: Sales).
 * Records deposit payment if already paid.
 */
export async function syncInvoiceToSaasu(invoiceId: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!SAASU_FILE_ID || !SAASU_WS_KEY) {
      return { success: false, error: "Saasu credentials not configured" };
    }

    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) return { success: false, error: "Invoice not found" };

    // Skip if already synced
    if (inv.xeroInvoiceId) {
      console.log(`[Saasu] Invoice ${inv.invoiceNumber} already synced (Saasu ID: ${inv.xeroInvoiceId}), skipping`);
      return { success: true };
    }

    // Determine agency vs homeowner
    const isAgency = routeNotificationsToAgent(inv.quoteType as any);

    // Resolve contact name and product details from configJson
    let contactName = inv.recipientName;
    let productName: string | null = null;
    let manufacturer: string | null = null;
    let scope: string | null = null;
    let acceptedTier: string | null = null;

    try {
      const { quotes } = await import("../drizzle/schema");
      const [quoteRow] = await db.select({
        configJson: quotes.configJson,
        acceptedTier: quotes.acceptedTier,
      })
        .from(quotes)
        .where(eq(quotes.slug, inv.quoteSlug));

      if (quoteRow) {
        // acceptedTier is on the quotes table
        acceptedTier = quoteRow.acceptedTier || null;

        if (quoteRow.configJson) {
          const config = JSON.parse(quoteRow.configJson);

          // Contact name: agency name for agent quotes, recipient name for homeowner
          // Fallback to property address if client name is blank (prevents Saasu 400 error)
          if (isAgency) {
            contactName = (config.client?.name || "").trim() || inv.recipientName || inv.propertyAddress || "Unknown Client";
          } else {
            contactName = (contactName || "").trim() || inv.propertyAddress || "Unknown Client";
          }

          // Product details
          scope = config.scope || null;
          if (config.product) {
            productName = config.product.productName || null;
            manufacturer = config.product.manufacturer || null;
          }
        }
      }
    } catch {
      // fallback to recipientName and generic description
    }

    // Find or create contact in Saasu
    console.log(`[Saasu DEBUG] contactName resolved to: "${contactName}" | isAgency: ${isAgency} | recipientName: "${inv.recipientName}" | propertyAddress: "${inv.propertyAddress}"`);
    const contact = await findOrCreateSaasuContact({
      name: contactName,
      email: inv.recipientEmail || undefined,
      phone: inv.recipientPhone || undefined,
      isCompany: isAgency,
    });

    // Dates in AEST — use today as invoice date (completion date)
    const todayAEST = toAESTDateString(new Date());

    // Build single line description
    const lineDescription = buildSaasuLineDescription({
      productName,
      manufacturer,
      scope,
      acceptedTier,
    });

    // Total inc-GST in dollars (CRM stores as integer dollars)
    const totalIncGst = inv.totalAmount;

    // Summary: "Re: [property address]"
    const summary = `Re: ${inv.propertyAddress}`;

    // Create invoice in Saasu
    // inv.quoteNumber is the BC-XXX reference (e.g. "BC-020") — use as PurchaseOrderNumber
    const purchaseOrderNumber = inv.quoteNumber || inv.invoiceNumber;
    const saasuInv = await createSaasuInvoice({
      contactId: contact.contactId,
      summary,
      purchaseOrderNumber,
      date: todayAEST,
      dueDate: todayAEST, // COD — due same day
      lineDescription,
      totalIncGst,
    });

    // Update local invoice with Saasu IDs
    await db
      .update(invoices)
      .set({
        xeroInvoiceId: String(saasuInv.invoiceId),
        xeroContactId: String(contact.contactId),
        xeroSyncedAt: new Date(),
        xeroSyncError: null,
      })
      .where(eq(invoices.id, invoiceId));

    // Record deposit as partial payment if already paid (inc-GST dollars)
    const depositAmount = inv.depositAmount ?? 0;
    if (depositAmount > 0) {
      try {
        await recordSaasuPayment({
          saasuInvoiceId: saasuInv.invoiceId,
          amount: depositAmount, // inc-GST dollars
          date: todayAEST,
          summary: `Deposit — ${inv.quoteNumber}`,
        });
        console.log(`[Saasu] Recorded deposit payment $${depositAmount} (inc-GST) for invoice ${inv.invoiceNumber}`);
      } catch (payErr: any) {
        // Non-critical: invoice is in Saasu, payment can be recorded manually
        console.warn(`[Saasu] Deposit payment recording failed (non-critical): ${payErr.message}`);
      }
    }

    console.log(`[Saasu] Successfully synced invoice ${inv.invoiceNumber} (Saasu ID: ${saasuInv.invoiceId})`);
    return { success: true };
  } catch (e: any) {
    const errorMsg = e.message || "Unknown error";
    console.error(`[Saasu] Invoice sync failed for invoice ${invoiceId}:`, errorMsg);
    try {
      const db3 = await getDb();
      if (db3) {
        await db3.update(invoices).set({ xeroSyncError: errorMsg }).where(eq(invoices.id, invoiceId));
      }
    } catch {}
    return { success: false, error: errorMsg };
  }
}
