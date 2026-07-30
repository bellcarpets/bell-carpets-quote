import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Quote acceptances — logs every time an agent accepts a quote.
 * Stores the full selection details + agent contact info for notifications.
 */
export const quoteAcceptances = mysqlTable("quote_acceptances", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 32 }).notNull(),
  propertyAddress: varchar("propertyAddress", { length: 512 }).notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  tierName: varchar("tierName", { length: 64 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }).notNull(),
  colourName: varchar("colourName", { length: 128 }).notNull(),
  colourCode: varchar("colourCode", { length: 16 }),
  basePrice: int("basePrice").notNull(),
  addonsJson: text("addonsJson"), // JSON string of selected add-ons
  addonsTotal: int("addonsTotal").notNull().default(0),
  grandTotal: int("grandTotal").notNull(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  agentEmail: varchar("agentEmail", { length: 320 }).notNull(),
  agentPhone: varchar("agentPhone", { length: 32 }).notNull(),
  emailSent: int("emailSent").default(0).notNull(), // 0 = no, 1 = yes
  smsSent: int("smsSent").default(0).notNull(),
  notificationSent: int("notificationSent").default(0).notNull(),
  agentNotes: text("agentNotes"),  // Optional notes/instructions from agent at acceptance
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteAcceptance = typeof quoteAcceptances.$inferSelect;
export type InsertQuoteAcceptance = typeof quoteAcceptances.$inferInsert;

/**
 * Quote configuration — single-row table storing the entire editable quote as JSON.
 * The owner edits this from /admin; the public page reads it via tRPC.
 */
export const quoteConfig = mysqlTable("quote_config", {
  id: int("id").autoincrement().primaryKey(),
  configJson: text("configJson").notNull(), // Full quote config as JSON
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuoteConfig = typeof quoteConfig.$inferSelect;

/**
 * Quotes — each row is a separate quote with its own config, slug, and status.
 * Replaces the single-row quoteConfig approach for multi-quote support.
 */
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  /** Sequential quote number like BC-001, BC-002 */
  quoteNumber: varchar("quoteNumber", { length: 16 }).notNull().unique(),
  /** URL-friendly slug for public access — e.g. "bc-001" or a nanoid */
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  /** Quote type: agent = 3-tier Good/Better/Best, homeowner = single product */
  quoteType: mysqlEnum("quoteType", ["agent", "homeowner", "real_estate", "agency_single"]).default("agent").notNull(),
  /** Full quote config as JSON (same QuoteConfigData shape) */
  configJson: text("configJson").notNull(),
  /** Job status pipeline */
  jobStatus: mysqlEnum("jobStatus", ["draft", "quote_sent", "accepted", "deposit_paid", "scheduled", "completed", "paid_in_full", "cancelled"]).default("draft").notNull(),
  /** Accepted tier/colour/price (populated when agent accepts) */
  acceptedTier: varchar("acceptedTier", { length: 64 }),
  acceptedColour: varchar("acceptedColour", { length: 128 }),
  acceptedTotal: int("acceptedTotal"),
  acceptedAgentName: varchar("acceptedAgentName", { length: 255 }),
  acceptedAgentEmail: varchar("acceptedAgentEmail", { length: 320 }),
  acceptedAgentPhone: varchar("acceptedAgentPhone", { length: 32 }),
  acceptedAt: timestamp("acceptedAt"),
  acceptedNotes: text("acceptedNotes"),  // Agent's notes/instructions at acceptance
  /** Quote expiry date — after this date the public page blocks acceptance */
  expiresAt: timestamp("expiresAt"),
  /** Agent contact details — stored at quote creation for sending the quote link and reminders */
  agentName: varchar("agentName", { length: 255 }),
  agentEmail: varchar("agentEmail", { length: 320 }),
  agentPhone: varchar("agentPhone", { length: 32 }),
  /** Whether the quote link email was sent to the agent on creation */
  quoteLinkEmailSent: int("quoteLinkEmailSent").default(0).notNull(),
  /** Timestamp when expiry reminder email was sent (null = not yet sent) */
  reminderSentAt: timestamp("reminderSentAt"),
  /** Timestamp when expiry reminder SMS was sent (null = not yet sent) */
  reminderSmsSentAt: timestamp("reminderSmsSentAt"),
  /** Scheduled installation date — set when job status moves to "scheduled" */
  scheduledDate: timestamp("scheduledDate"),
  /** Completion date — set when job status moves to "completed" */
  completedAt: timestamp("completedAt"),
  /** Property manager name at the agency (specific person, e.g. "Eliana") */
  agentPropertyManager: varchar("agentPropertyManager", { length: 255 }),
  /** Whether this is an insurance assessment only quote (no accept button) */
  isInsuranceAssessment: int("isInsuranceAssessment").default(0).notNull(),
  /** Slug of a linked quote (e.g. the full replacement quote) */
  linkedQuoteSlug: varchar("linkedQuoteSlug", { length: 64 }),
  /** Internal admin notes — private, not shown on public page or invoices */
  internalNotes: text("internalNotes"),
  /** Actual deposit amount received — entered by admin when marking deposit_paid */
  depositPaidAmount: int("depositPaidAmount"),
  /** Discount or credit applied to the quote — reduces balance owing */
  discountAmount: int("discountAmount").default(0),
  /** Whether the acceptance confirmation email has been sent to the client (prevents duplicates) */
  acceptanceEmailSent: int("acceptanceEmailSent").default(0).notNull(),
  /** Whether the deposit-paid notification email has been sent (prevents duplicates on re-mark) */
  depositPaidNotificationSent: int("depositPaidNotificationSent").default(0).notNull(),
  /** Whether the scheduled notification email has been sent (prevents duplicates on re-mark) */
  scheduledNotificationSent: int("scheduledNotificationSent").default(0).notNull(),
  /** Whether the completed notification email has been sent (prevents duplicates on re-mark) */
  completedNotificationSent: int("completedNotificationSent").default(0).notNull(),
  /** Payment terms in days — used for overdue detection and shown on invoices */
  paymentTermsDays: int("paymentTermsDays").default(30),
  /** Timestamp when follow-up reminder was sent to admin (null = not yet sent) */
  followUpSentAt: timestamp("followUpSentAt"),
  /** Timestamp when 2-day-before-expiry reminder SMS was sent to customer (null = not yet sent) */
  expiryReminderSmsSentAt: timestamp("expiryReminderSmsSentAt"),
  /** Google review request tracking — homeowner quotes only */
  reviewStatus: mysqlEnum("reviewStatus", ["none", "requested", "received", "credit_applied"]).default("none").notNull(),
  reviewRequestedAt: timestamp("reviewRequestedAt"),
  reviewReceivedAt: timestamp("reviewReceivedAt"),
  /** Test/sandbox quote — excluded from all notification jobs (follow-up, reminders, overdue alerts) */
  isTest: int("isTest").default(0).notNull(),
  /** Soft-delete: null = active, timestamp = deleted at that time */
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

/**
 * Contacts — saved agent/client contacts for quick auto-fill in new quotes.
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  agency: varchar("agency", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Invoices — generated on job completion with full line items and payment tracking.
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  /** Sequential invoice number like INV-001 */
  invoiceNumber: varchar("invoiceNumber", { length: 16 }).notNull().unique(),
  /** Link to the quote */
  quoteSlug: varchar("quoteSlug", { length: 64 }).notNull(),
  quoteNumber: varchar("quoteNumber", { length: 16 }).notNull(),
  /** Quote type for determining recipient */
  quoteType: mysqlEnum("quoteType", ["agent", "homeowner", "real_estate", "agency_single"]).default("agent").notNull(),
  /** Recipient details */
  recipientName: varchar("recipientName", { length: 255 }).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 32 }),
  propertyAddress: varchar("propertyAddress", { length: 512 }).notNull(),
  /** Line items as JSON: [{description, qty, unitPrice, total}] */
  lineItemsJson: text("lineItemsJson").notNull(),
  /** Financials (cents) */
  subtotal: int("subtotal").notNull(),
  gst: int("gst").notNull(),
  totalAmount: int("totalAmount").notNull(),
  depositAmount: int("depositAmount").default(0).notNull(),
  /** Payment status */
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "deposit_paid", "balance_due", "paid_in_full"]).default("unpaid").notNull(),
  /** S3 URL of the generated PDF */
  pdfUrl: varchar("pdfUrl", { length: 1024 }),
  pdfKey: varchar("pdfKey", { length: 512 }),
  /** Email tracking */
  emailSent: int("emailSent").default(0).notNull(),
  emailSentAt: timestamp("emailSentAt"),
  /** Notes */
  notes: text("notes"),
  /** Payment terms in days — copied from quote at invoice generation */
  paymentTermsDays: int("paymentTermsDays").default(30),
  /** Whether the paid-in-full confirmation email has been sent (prevents duplicates across admin and invoice paths) */
  paidInFullNotificationSent: int("paidInFullNotificationSent").default(0).notNull(),
  /** Overdue reminder tracking */
  overdueReminderSentAt: timestamp("overdueReminderSentAt"),
  overdueReminderSmsSentAt: timestamp("overdueReminderSmsSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  /** Xero sync tracking */
  xeroInvoiceId: varchar("xeroInvoiceId", { length: 64 }),
  xeroContactId: varchar("xeroContactId", { length: 64 }),
  xeroSyncedAt: timestamp("xeroSyncedAt"),
  xeroSyncError: text("xeroSyncError"),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Xero OAuth tokens — stores the access/refresh tokens for the Xero connection.
 * Single-row table (only one Xero org connected at a time).
 */
export const xeroTokens = mysqlTable("xero_tokens", {
  id: int("id").autoincrement().primaryKey(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  tokenExpiresAt: timestamp("tokenExpiresAt").notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  tenantName: varchar("tenantName", { length: 255 }),
  connectionId: varchar("connectionId", { length: 64 }),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type XeroToken = typeof xeroTokens.$inferSelect;
export type InsertXeroToken = typeof xeroTokens.$inferInsert;

/**
 * Scope of Work Library — saved reusable SOW items for quick-pick in quote editor.
 */
export const scopeLibrary = mysqlTable("scopeLibrary", {
  id: int("id").autoincrement().primaryKey(),
  /** Title of the scope item */
  text: varchar("text", { length: 512 }).notNull(),
  /** Optional description / detail line */
  description: varchar("description", { length: 1024 }).default("").notNull(),
  /** Sort order for display */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ScopeLibraryItem = typeof scopeLibrary.$inferSelect;
export type InsertScopeLibraryItem = typeof scopeLibrary.$inferInsert;

/**
 * Quote Views — tracks every time a client views a public quote page.
 * Used for view count, last-viewed timestamps, and "Viewed" badges in admin.
 */
export const quoteViews = mysqlTable("quote_views", {
  id: int("id").autoincrement().primaryKey(),
  /** Slug of the quote that was viewed */
  quoteSlug: varchar("quoteSlug", { length: 64 }).notNull(),
  /** Timestamp of the view */
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
  /** User agent string (optional, for analytics) */
  userAgent: varchar("userAgent", { length: 512 }),
  /** IP address (optional, for analytics) */
  ipAddress: varchar("ipAddress", { length: 64 }),
  /** Approximate city from IP geo-lookup */
  city: varchar("city", { length: 128 }),
  /** Country code from IP geo-lookup */
  country: varchar("country", { length: 8 }),
  /** Device type derived from user-agent: mobile | desktop | tablet | bot */
  deviceType: varchar("deviceType", { length: 16 }),
  /** Whether this view was from an admin preview (excluded from counts) */
  isAdmin: boolean("isAdmin").default(false),
});

export type QuoteView = typeof quoteViews.$inferSelect;
export type InsertQuoteView = typeof quoteViews.$inferInsert;

/**
 * Notification Log — records every SMS and email attempt made by the system.
 */
export const notificationLog = mysqlTable("notification_log", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 16 }).notNull(),
  statusTrigger: varchar("statusTrigger", { length: 64 }).notNull(),
  channel: mysqlEnum("channel", ["email", "sms"]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 32 }),
  recipientName: varchar("recipientName", { length: 255 }),
  success: int("success").default(0).notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type NotificationLog = typeof notificationLog.$inferSelect;
export type InsertNotificationLog = typeof notificationLog.$inferInsert;
