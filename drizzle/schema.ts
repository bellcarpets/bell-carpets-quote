import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users (Manus OAuth — required by template) ─────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export const adminAuth = mysqlTable("admin_auth", {
  id: int("id").autoincrement().primaryKey(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  twoFactorSecret: varchar("twoFactorSecret", { length: 64 }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  sessionToken: varchar("sessionToken", { length: 255 }),
  sessionExpiresAt: timestamp("sessionExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Agencies ─────────────────────────────────────────────────────────────────

export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 100 }), // e.g. "Agent", "Property Manager", "Homeowner"
  agencyId: int("agencyId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Quotes ───────────────────────────────────────────────────────────────────

export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 20 }).notNull().unique(), // BC-001
  status: mysqlEnum("status", [
    "draft",
    "quote_sent",
    "accepted",
    "deposit_paid",
    "scheduled",
    "completed",
    "invoice_paid",
    "expired",
    "archived",
  ])
    .default("draft")
    .notNull(),
  quoteType: mysqlEnum("quoteType", [
    "homeowner",
    "agency_3tier",
    "agency_single",
  ])
    .default("homeowner")
    .notNull(),
  temperature: mysqlEnum("temperature", ["hot", "warm", "cold"]).default("warm").notNull(),

  // Client / Agent
  clientName: varchar("clientName", { length: 255 }),
  agentEmail: varchar("agentEmail", { length: 320 }),
  agentPhone: varchar("agentPhone", { length: 50 }),
  agencyId: int("agencyId"),
  contactId: int("contactId"),

  // Property
  propertyAddress: text("propertyAddress"),

  // Dates
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  validDays: int("validDays").default(30).notNull(),
  expiryDate: timestamp("expiryDate"),

  // Pricing
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  credit: decimal("credit", { precision: 10, scale: 2 }).default("0"),
  paymentTermsDays: int("paymentTermsDays").default(30).notNull(),

  // Content
  scopeDescription: text("scopeDescription"),
  customerNotes: text("customerNotes"),
  internalNotes: text("internalNotes"),
  insuranceAssessment: text("insuranceAssessment"),

  // Underlay selection
  underlayOption: mysqlEnum("underlayOption", [
    "protect",
    "ultimate",
    "extra",
    "eureka",
  ]),

  // Tracking
  viewCount: int("viewCount").default(0).notNull(),
  emailedAt: timestamp("emailedAt"),
  selectedTier: mysqlEnum("selectedTier", ["good", "better", "best"]),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Quote Tiers (GOOD / BETTER / BEST) ──────────────────────────────────────

export const quoteTiers = mysqlTable("quote_tiers", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  tier: mysqlEnum("tier", ["good", "better", "best"]).notNull(),
  label: varchar("label", { length: 50 }), // e.g. "GOOD", "BETTER", "BEST"
  productName: varchar("productName", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  fibre: varchar("fibre", { length: 100 }),
  pileType: varchar("pileType", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  heroImageUrl: text("heroImageUrl"),
  productUrl: text("productUrl"),
  primaryColour: varchar("primaryColour", { length: 100 }),
  accentColour: varchar("accentColour", { length: 100 }),
  carpetColours: text("carpetColours"), // comma-separated
  badges: text("badges"), // JSON array of badge strings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Quote Services (Additional Services) ────────────────────────────────────

export const quoteServices = mysqlTable("quote_services", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Library Items (Scope-of-Work Snippets) ───────────────────────────────────

export const libraryItems = mysqlTable("library_items", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  allDay: boolean("allDay").default(false).notNull(),
  colour: varchar("colour", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["unpaid", "paid", "overdue", "cancelled"])
    .default("unpaid")
    .notNull(),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  saasu_id: varchar("saasu_id", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId"),
  type: varchar("type", { length: 100 }).notNull(), // "email_sent", "status_change", "viewed", etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Email Templates ──────────────────────────────────────────────────────────

export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  variables: text("variables"), // JSON array of available variables
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminAuth = typeof adminAuth.$inferSelect;
export type Agency = typeof agencies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteTier = typeof quoteTiers.$inferSelect;
export type QuoteService = typeof quoteServices.$inferSelect;
export type LibraryItem = typeof libraryItems.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export type InsertQuote = typeof quotes.$inferInsert;
export type InsertQuoteTier = typeof quoteTiers.$inferInsert;
export type InsertQuoteService = typeof quoteServices.$inferInsert;
export type InsertAgency = typeof agencies.$inferInsert;
export type InsertContact = typeof contacts.$inferInsert;
export type InsertLibraryItem = typeof libraryItems.$inferInsert;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
export type InsertInvoice = typeof invoices.$inferInsert;
export type InsertNotification = typeof notifications.$inferInsert;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
