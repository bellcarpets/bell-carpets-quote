/**
 * Xero Integration Helper
 * Handles OAuth2 flow, token management, and API calls to Xero.
 *
 * INVOICE FLOW (single-invoice model):
 * 1. At acceptance: create ONE Xero invoice for the FULL amount.
 * 2. When deposit is paid: record a partial PAYMENT against that invoice.
 * 3. When balance is paid on completion: record the final PAYMENT — invoice fully paid.
 *
 * This is the standard tradie Xero workflow — one invoice, partial payments against it.
 */
import { getDb } from "./db";
import { xeroTokens, invoices } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { toAESTDateString } from "../shared/aestUtils";

// ─── Config ──────────────────────────────────────────────────────────────────
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID ?? "";
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET ?? "";
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI ?? "";

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";
const XERO_REVOKE_URL = "https://identity.xero.com/connect/revocation";

// New granular scopes required for Xero apps created after March 2, 2026.
// accounting.transactions and accounting.reports.read are deprecated for new apps.
// accounting.invoices: create/update invoices, credit notes, quotes, items
// accounting.payments.read: read payment status to detect when invoices are paid
// accounting.contacts: read/write contacts (for creating/matching clients in Xero)
// accounting.payments: create payments against invoices (required for partial payment recording)
const SCOPES = "openid profile email accounting.invoices accounting.payments.read accounting.payments accounting.contacts offline_access";

// ─── OAuth2 Helpers ──────────────────────────────────────────────────────────

/** Build the Xero authorization URL for the admin to click */
export function getXeroAuthUrl(state: string = "xero-connect"): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: XERO_CLIENT_ID,
    redirect_uri: XERO_REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `${XERO_AUTH_URL}?${params.toString()}`;
}

/** Exchange authorization code for tokens */
export async function exchangeCodeForTokens(code: string) {
  const basicAuth = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: XERO_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Xero token exchange failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number, // seconds (usually 1800)
    idToken: data.id_token as string | undefined,
  };
}

/** Get connected tenants (orgs) */
export async function getXeroTenants(accessToken: string) {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Xero connections failed: ${res.status} ${err}`);
  }

  const connections = (await res.json()) as Array<{
    id: string;
    tenantId: string;
    tenantType: string;
    tenantName: string;
  }>;

  return connections;
}

/** Save tokens to DB (upsert — always keep single row) */
export async function saveXeroTokens(params: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tenantId: string;
  tenantName?: string;
  connectionId?: string;
}) {
  const tokenExpiresAt = new Date(Date.now() + params.expiresIn * 1000);

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all existing rows and insert fresh
  await db.delete(xeroTokens);
  await db.insert(xeroTokens).values({
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    tokenExpiresAt,
    tenantId: params.tenantId,
    tenantName: params.tenantName ?? null,
    connectionId: params.connectionId ?? null,
  });
}

/** Get current stored tokens (or null if not connected) */
export async function getStoredXeroTokens() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(xeroTokens).orderBy(desc(xeroTokens.id)).limit(1);
  return rows[0] ?? null;
}

/** Refresh the access token using the stored refresh token */
export async function refreshXeroToken(): Promise<string | null> {
  const stored = await getStoredXeroTokens();
  if (!stored) return null;

  const basicAuth = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refreshToken,
    }),
  });

  if (!res.ok) {
    console.error("[Xero] Token refresh failed:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const tokenExpiresAt = new Date(Date.now() + (data.expires_in as number) * 1000);

  // Update stored tokens
  const db2 = await getDb();
  if (!db2) return null;
  await db2
    .update(xeroTokens)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt,
    })
    .where(eq(xeroTokens.id, stored.id));

  return data.access_token as string;
}

/** Get a valid access token (auto-refresh if expired) */
export async function getValidAccessToken(): Promise<{ accessToken: string; tenantId: string } | null> {
  const stored = await getStoredXeroTokens();
  if (!stored) return null;

  // Check if token expires within 2 minutes
  const now = new Date();
  const bufferMs = 2 * 60 * 1000;
  if (stored.tokenExpiresAt.getTime() - now.getTime() < bufferMs) {
    const newToken = await refreshXeroToken();
    if (!newToken) return null;
    return { accessToken: newToken, tenantId: stored.tenantId };
  }

  return { accessToken: stored.accessToken, tenantId: stored.tenantId };
}

/** Disconnect from Xero — revoke token and delete stored data */
export async function disconnectXero(): Promise<boolean> {
  const stored = await getStoredXeroTokens();
  if (!stored) return true;

  try {
    // Revoke the refresh token
    const basicAuth = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString("base64");
    await fetch(XERO_REVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({ token: stored.refreshToken }),
    });
  } catch (e) {
    console.error("[Xero] Revoke failed (continuing disconnect):", e);
  }

  const db = await getDb();
  if (!db) return true;
  // Delete all stored tokens
  await db.delete(xeroTokens);
  return true;
}

// ─── Xero API Calls ──────────────────────────────────────────────────────────

/** Make an authenticated Xero API call */
async function xeroApiCall(method: string, path: string, body?: unknown): Promise<any> {
  const auth = await getValidAccessToken();
  if (!auth) throw new Error("Not connected to Xero");

  const url = `${XERO_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    "Xero-tenant-id": auth.tenantId,
    Accept: "application/json",
  };

  const opts: RequestInit = { method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero API ${method} ${path} failed: ${res.status} ${errText}`);
  }

  return res.json();
}

/** Find or create a contact in Xero by name */
export async function findOrCreateXeroContact(name: string, email?: string | null, phone?: string | null): Promise<{ contactId: string; name: string }> {
  // Try to find existing contact by name
  try {
    const searchRes = await xeroApiCall("GET", `/Contacts?where=Name=="${encodeURIComponent(name)}"`);
    if (searchRes.Contacts && searchRes.Contacts.length > 0) {
      return {
        contactId: searchRes.Contacts[0].ContactID,
        name: searchRes.Contacts[0].Name,
      };
    }
  } catch (e) {
    console.warn("[Xero] Contact search failed, will create new:", e);
  }

  // Create new contact
  const contactData: any = { Name: name };
  if (email) contactData.EmailAddress = email;
  if (phone) {
    contactData.Phones = [{ PhoneType: "DEFAULT", PhoneNumber: phone }];
  }

  const createRes = await xeroApiCall("POST", "/Contacts", { Contacts: [contactData] });
  const created = createRes.Contacts[0];
  return { contactId: created.ContactID, name: created.Name };
}

/** Create an invoice in Xero */
export async function createXeroInvoice(params: {
  contactId: string;
  invoiceNumber: string;
  reference?: string;
  date: string; // YYYY-MM-DD (AEST)
  dueDate: string; // YYYY-MM-DD (AEST)
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number; // GST-inclusive amount
    accountCode?: string;
  }>;
}): Promise<{ invoiceId: string; invoiceNumber: string; status: string }> {
  const xeroLineItems = params.lineItems.map((li) => ({
    Description: li.description,
    Quantity: String(li.quantity),
    UnitAmount: String(li.unitAmount),
    AccountCode: li.accountCode || "200", // Default to Sales account
  }));

  const invoiceData = {
    Type: "ACCREC", // Accounts Receivable (sales invoice)
    Contact: { ContactID: params.contactId },
    DateString: params.date,
    DueDateString: params.dueDate,
    InvoiceNumber: params.invoiceNumber,
    Reference: params.reference || "",
    LineAmountTypes: "Inclusive", // Amounts include GST
    LineItems: xeroLineItems,
    Status: "AUTHORISED", // Ready for payment
  };

  const res = await xeroApiCall("POST", "/Invoices", { Invoices: [invoiceData] });
  const created = res.Invoices[0];

  return {
    invoiceId: created.InvoiceID,
    invoiceNumber: created.InvoiceNumber,
    status: created.Status,
  };
}

/**
 * Record a payment against an existing Xero invoice.
 * Used for both deposit (partial) and balance (final) payments.
 */
export async function recordXeroPayment(params: {
  xeroInvoiceId: string;
  amount: number;
  date: string; // YYYY-MM-DD (AEST)
  reference?: string;
  accountCode?: string;
}): Promise<{ paymentId: string; status: string }> {
  const paymentData = {
    Invoice: { InvoiceID: params.xeroInvoiceId },
    Account: { Code: params.accountCode || "090" }, // Default to bank account (090 = bank)
    Date: params.date,
    Amount: String(params.amount),
    Reference: params.reference || "",
  };

  const res = await xeroApiCall("POST", "/Payments", { Payments: [paymentData] });
  const created = res.Payments[0];

  return {
    paymentId: created.PaymentID,
    status: created.Status,
  };
}

/** Check payment status of a Xero invoice */
export async function getXeroInvoiceStatus(xeroInvoiceId: string): Promise<{
  status: string;
  amountDue: number;
  amountPaid: number;
  total: number;
} | null> {
  try {
    const res = await xeroApiCall("GET", `/Invoices/${xeroInvoiceId}`);
    if (res.Invoices && res.Invoices.length > 0) {
      const inv = res.Invoices[0];
      return {
        status: inv.Status,
        amountDue: parseFloat(inv.AmountDue),
        amountPaid: parseFloat(inv.AmountPaid),
        total: parseFloat(inv.Total),
      };
    }
    return null;
  } catch (e) {
    console.error("[Xero] Failed to get invoice status:", e);
    return null;
  }
}

/**
 * SINGLE-INVOICE FLOW — Step 1: Create full-amount Xero invoice at acceptance.
 *
 * Creates ONE Xero invoice for the FULL amount (e.g. $3,210).
 * Subsequent deposit and balance payments are recorded as partial payments against this invoice.
 * This is the standard tradie Xero workflow.
 */
export async function syncFullInvoiceToXero(invoiceId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) return { success: false, error: "Invoice not found" };
    if (inv.xeroInvoiceId) return { success: true }; // Already synced

    const auth = await getValidAccessToken();
    if (!auth) return { success: false, error: "Not connected to Xero" };

    // Find or create contact
    const contact = await findOrCreateXeroContact(
      inv.recipientName,
      inv.recipientEmail,
      inv.recipientPhone
    );

    // AEST-locked dates
    const invoiceDateAEST = toAESTDateString(new Date(inv.createdAt));
    const paymentTerms = inv.paymentTermsDays ?? 30;
    const dueDateObj = new Date(inv.createdAt);
    dueDateObj.setDate(dueDateObj.getDate() + paymentTerms);
    const dueDateAEST = toAESTDateString(dueDateObj);

    // Build rich Xero line items from stored lineItemsJson (includes product details, add-ons, rooms)
    // Fall back to a single consolidated line item if lineItemsJson is missing or unparseable
    let xeroLineItems: Array<{ description: string; quantity: number; unitAmount: number; accountCode?: string }> = [];

    try {
      if (inv.lineItemsJson) {
        const storedItems = JSON.parse(inv.lineItemsJson) as Array<{
          description?: string;
          qty?: number;
          unitPrice?: number;
          total?: number;
        }>;

        if (storedItems.length > 0) {
          // First line item: prefix with property address so it's clear in Xero
          const addressPrefix = inv.propertyAddress ? `${inv.propertyAddress} — ` : "";
          xeroLineItems = storedItems.map((item, idx) => ({
            description: idx === 0
              ? `${addressPrefix}${item.description ?? "Carpet supply & installation"}`
              : (item.description ?? "Add-on"),
            quantity: item.qty ?? 1,
            unitAmount: item.unitPrice ?? item.total ?? 0,
          }));
        }
      }
    } catch (parseErr) {
      console.warn(`[Xero] lineItemsJson parse failed for invoice ${inv.invoiceNumber}, using fallback:`, parseErr);
    }

    // Fallback: single consolidated line item
    if (xeroLineItems.length === 0) {
      const addressPrefix = inv.propertyAddress ? `${inv.propertyAddress} — ` : "";
      xeroLineItems = [{
        description: `${addressPrefix}Carpet supply & installation — ${inv.quoteNumber}`,
        quantity: 1,
        unitAmount: inv.totalAmount,
      }];
    }

    const xeroInv = await createXeroInvoice({
      contactId: contact.contactId,
      invoiceNumber: inv.invoiceNumber,
      reference: `${inv.quoteNumber} - ${inv.propertyAddress}`,
      date: invoiceDateAEST,
      dueDate: dueDateAEST,
      lineItems: xeroLineItems,
    });

    // Update our invoice with Xero IDs
    await db
      .update(invoices)
      .set({
        xeroInvoiceId: xeroInv.invoiceId,
        xeroContactId: contact.contactId,
        xeroSyncedAt: new Date(),
        xeroSyncError: null,
      })
      .where(eq(invoices.id, invoiceId));

    console.log(`[Xero] Created full invoice ${inv.invoiceNumber} (${inv.totalAmount}) → Xero ID ${xeroInv.invoiceId}`);
    return { success: true };
  } catch (e: any) {
    const errorMsg = e.message || "Unknown error";
    console.error(`[Xero] Full invoice sync failed for invoice ${invoiceId}:`, errorMsg);
    try {
      const db3 = await getDb();
      if (db3) {
        await db3.update(invoices).set({ xeroSyncError: errorMsg }).where(eq(invoices.id, invoiceId));
      }
    } catch {}
    return { success: false, error: errorMsg };
  }
}

/**
 * SINGLE-INVOICE FLOW — Step 2a: Record deposit payment against the full invoice.
 *
 * When the homeowner pays the deposit, record it as a partial payment against the
 * existing Xero invoice. The invoice will show e.g. $1,605 paid, $1,605 remaining.
 */
export async function recordDepositPaymentToXero(invoiceId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) return { success: false, error: "Invoice not found" };

    if (!inv.xeroInvoiceId) {
      // Invoice not yet synced to Xero — sync it first, then record deposit
      const syncResult = await syncFullInvoiceToXero(invoiceId);
      if (!syncResult.success) return syncResult;
      // Re-fetch to get the xeroInvoiceId
      const [refreshed] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!refreshed?.xeroInvoiceId) return { success: false, error: "Failed to get Xero invoice ID after sync" };
    }

    // Re-fetch to ensure we have xeroInvoiceId
    const [fresh] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!fresh?.xeroInvoiceId) return { success: false, error: "No Xero invoice ID" };

    const depositAmount = fresh.depositAmount ?? 0;
    if (depositAmount <= 0) {
      console.log(`[Xero] No deposit amount for invoice ${fresh.invoiceNumber}, skipping`);
      return { success: true };
    }

    const auth = await getValidAccessToken();
    if (!auth) return { success: false, error: "Not connected to Xero" };

    const todayAEST = toAESTDateString(new Date());
    const depositPercent = fresh.totalAmount > 0
      ? Math.round((depositAmount / fresh.totalAmount) * 100)
      : 50;

    await recordXeroPayment({
      xeroInvoiceId: fresh.xeroInvoiceId,
      amount: depositAmount,
      date: todayAEST,
      reference: `Deposit (${depositPercent}%) — ${fresh.quoteNumber}`,
    });

    console.log(`[Xero] Recorded deposit payment $${depositAmount} against invoice ${fresh.invoiceNumber}`);
    return { success: true };
  } catch (e: any) {
    const errorMsg = e.message || "Unknown error";
    console.error(`[Xero] Deposit payment recording failed for invoice ${invoiceId}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * SINGLE-INVOICE FLOW — Step 2b: Record balance payment against the full invoice.
 *
 * When the job is complete and the balance is paid, record it as the final payment.
 * The invoice will show fully paid.
 */
export async function recordBalancePaymentToXero(invoiceId: number): Promise<{ success: boolean; xeroInvoiceId?: string; error?: string }> {
  try {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) return { success: false, error: "Invoice not found" };

    if (!inv.xeroInvoiceId) {
      // Invoice not yet synced to Xero — sync full invoice first
      const syncResult = await syncFullInvoiceToXero(invoiceId);
      if (!syncResult.success) return syncResult;
    }

    // Re-fetch to ensure we have xeroInvoiceId
    const [fresh] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!fresh?.xeroInvoiceId) return { success: false, error: "No Xero invoice ID" };

    // Check current Xero status to determine remaining balance
    const xeroStatus = await getXeroInvoiceStatus(fresh.xeroInvoiceId);
    const balanceAmount = xeroStatus ? xeroStatus.amountDue : (fresh.totalAmount - (fresh.depositAmount ?? 0));

    if (balanceAmount <= 0) {
      console.log(`[Xero] No balance due for invoice ${fresh.invoiceNumber}, skipping`);
      return { success: true, xeroInvoiceId: fresh.xeroInvoiceId };
    }

    const auth = await getValidAccessToken();
    if (!auth) return { success: false, error: "Not connected to Xero" };

    const todayAEST = toAESTDateString(new Date());

    await recordXeroPayment({
      xeroInvoiceId: fresh.xeroInvoiceId,
      amount: balanceAmount,
      date: todayAEST,
      reference: `Balance payment — ${fresh.quoteNumber} (Installation Complete)`,
    });

    console.log(`[Xero] Recorded balance payment $${balanceAmount} against invoice ${fresh.invoiceNumber}`);
    return { success: true, xeroInvoiceId: fresh.xeroInvoiceId };
  } catch (e: any) {
    const errorMsg = e.message || "Unknown error";
    console.error(`[Xero] Balance payment recording failed for invoice ${invoiceId}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Legacy: Sync a CRM invoice to Xero — find/create contact, create invoice, update our DB.
 * Used by manual sync in xeroRouter.ts. Now delegates to syncFullInvoiceToXero.
 */
export async function syncInvoiceToXero(invoiceId: number): Promise<{ success: boolean; error?: string }> {
  return syncFullInvoiceToXero(invoiceId);
}

/**
 * Legacy: Sync a DEPOSIT invoice to Xero.
 * Now delegates to syncFullInvoiceToXero + recordDepositPaymentToXero for the new single-invoice flow.
 * @deprecated Use syncFullInvoiceToXero + recordDepositPaymentToXero instead.
 */
export async function syncDepositInvoiceToXero(invoiceId: number): Promise<{ success: boolean; error?: string }> {
  // Step 1: Create the full invoice in Xero
  const syncResult = await syncFullInvoiceToXero(invoiceId);
  if (!syncResult.success) return syncResult;

  // Step 2: Record the deposit as a partial payment (if deposit > 0)
  const db = await getDb();
  if (!db) return { success: true }; // Invoice synced, payment recording optional
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (inv && (inv.depositAmount ?? 0) > 0) {
    const payResult = await recordDepositPaymentToXero(invoiceId);
    if (!payResult.success) {
      console.warn(`[Xero] Invoice synced but deposit payment recording failed: ${payResult.error}`);
      // Non-critical: invoice is in Xero, payment can be recorded manually
    }
  }

  return { success: true };
}

/**
 * Legacy: Sync a BALANCE invoice to Xero.
 * Now delegates to recordBalancePaymentToXero for the new single-invoice flow.
 * @deprecated Use recordBalancePaymentToXero instead.
 */
export async function syncBalanceInvoiceToXero(invoiceId: number): Promise<{ success: boolean; xeroInvoiceId?: string; error?: string }> {
  return recordBalancePaymentToXero(invoiceId);
}

/** Check if Xero is connected */
export async function isXeroConnected(): Promise<boolean> {
  const stored = await getStoredXeroTokens();
  return stored !== null;
}

/** Get Xero connection info for display */
export async function getXeroConnectionInfo(): Promise<{
  connected: boolean;
  tenantName?: string;
  connectedAt?: Date;
} | null> {
  const stored = await getStoredXeroTokens();
  if (!stored) return { connected: false };
  return {
    connected: true,
    tenantName: stored.tenantName ?? undefined,
    connectedAt: stored.connectedAt,
  };
}
