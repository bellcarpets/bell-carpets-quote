import { eq, desc, like, or, and, sql, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, InsertUser,
  adminAuth, quotes, quoteTiers, quoteServices,
  agencies, contacts, libraryItems, calendarEvents,
  invoices, notifications, emailTemplates,
  type InsertQuote, type InsertQuoteTier, type InsertQuoteService,
  type InsertAgency, type InsertContact, type InsertLibraryItem,
  type InsertCalendarEvent, type InsertInvoice, type InsertNotification,
  type InsertEmailTemplate,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users (Manus OAuth) ──────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export async function getAdminAuth() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(adminAuth).limit(1);
  return result[0] ?? null;
}

export async function upsertAdminAuth(data: Partial<typeof adminAuth.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAdminAuth();
  if (existing) {
    await db.update(adminAuth).set(data).where(eq(adminAuth.id, existing.id));
  } else {
    await db.insert(adminAuth).values(data as typeof adminAuth.$inferInsert);
  }
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export async function getNextQuoteNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return "BC-001";
  const result = await db.select({ quoteNumber: quotes.quoteNumber })
    .from(quotes)
    .orderBy(desc(quotes.id))
    .limit(1);
  if (!result[0]) return "BC-001";
  const last = result[0].quoteNumber;
  const num = parseInt(last.replace("BC-", ""), 10);
  return `BC-${String(num + 1).padStart(3, "0")}`;
}

export async function createQuote(data: InsertQuote) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(quotes).values(data);
  return (result as any).insertId as number;
}

export async function updateQuote(id: number, data: Partial<InsertQuote>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(quotes).set(data).where(eq(quotes.id, id));
}

export async function getQuoteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getQuoteByNumber(quoteNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(quotes).where(eq(quotes.quoteNumber, quoteNumber)).limit(1);
  return result[0] ?? null;
}

export async function listQuotes(filters?: {
  status?: string;
  search?: string;
  agencyId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(quotes).$dynamic();
  const conditions = [];
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(quotes.status, filters.status as any));
  }
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(
      or(
        like(quotes.quoteNumber, s),
        like(quotes.clientName, s),
        like(quotes.propertyAddress, s),
        like(quotes.agentEmail, s)
      )
    );
  }
  if (filters?.agencyId) {
    conditions.push(eq(quotes.agencyId, filters.agencyId));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(quotes.issueDate, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(quotes.issueDate, filters.dateTo));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  return query.orderBy(desc(quotes.createdAt));
}

export async function getQuoteStatusCounts() {
  const db = await getDb();
  if (!db) return {};
  const result = await db
    .select({ status: quotes.status, count: sql<number>`count(*)` })
    .from(quotes)
    .groupBy(quotes.status);
  const counts: Record<string, number> = {};
  for (const row of result) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

export async function deleteQuote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(quoteServices).where(eq(quoteServices.quoteId, id));
  await db.delete(quoteTiers).where(eq(quoteTiers.quoteId, id));
  await db.delete(quotes).where(eq(quotes.id, id));
}

export async function incrementQuoteViews(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(quotes).set({ viewCount: sql`${quotes.viewCount} + 1` }).where(eq(quotes.id, id));
}

// ─── Quote Tiers ──────────────────────────────────────────────────────────────

export async function getQuoteTiers(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteTiers).where(eq(quoteTiers.quoteId, quoteId));
}

export async function upsertQuoteTier(data: InsertQuoteTier) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(quoteTiers)
    .where(and(eq(quoteTiers.quoteId, data.quoteId), eq(quoteTiers.tier, data.tier)))
    .limit(1);
  if (existing[0]) {
    await db.update(quoteTiers).set(data).where(eq(quoteTiers.id, existing[0].id));
  } else {
    await db.insert(quoteTiers).values(data);
  }
}

export async function deleteQuoteTiers(quoteId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(quoteTiers).where(eq(quoteTiers.quoteId, quoteId));
}

// ─── Quote Services ───────────────────────────────────────────────────────────

export async function getQuoteServices(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteServices).where(eq(quoteServices.quoteId, quoteId));
}

export async function replaceQuoteServices(quoteId: number, services: Omit<InsertQuoteService, "quoteId">[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(quoteServices).where(eq(quoteServices.quoteId, quoteId));
  if (services.length > 0) {
    await db.insert(quoteServices).values(services.map(s => ({ ...s, quoteId })));
  }
}

// ─── Agencies ─────────────────────────────────────────────────────────────────

export async function listAgencies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agencies).orderBy(agencies.name);
}

export async function createAgency(data: InsertAgency) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [r] = await db.insert(agencies).values(data);
  return (r as any).insertId as number;
}

export async function updateAgency(id: number, data: Partial<InsertAgency>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(agencies).set(data).where(eq(agencies.id, id));
}

export async function deleteAgency(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(agencies).where(eq(agencies.id, id));
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function listContacts(agencyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (agencyId) return db.select().from(contacts).where(eq(contacts.agencyId, agencyId)).orderBy(contacts.name);
  return db.select().from(contacts).orderBy(contacts.name);
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [r] = await db.insert(contacts).values(data);
  return (r as any).insertId as number;
}

export async function updateContact(id: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(contacts).set(data).where(eq(contacts.id, id));
}

export async function deleteContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(contacts).where(eq(contacts.id, id));
}

// ─── Library Items ────────────────────────────────────────────────────────────

export async function listLibraryItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(libraryItems).orderBy(libraryItems.sortOrder, libraryItems.title);
}

export async function createLibraryItem(data: InsertLibraryItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [r] = await db.insert(libraryItems).values(data);
  return (r as any).insertId as number;
}

export async function updateLibraryItem(id: number, data: Partial<InsertLibraryItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(libraryItems).set(data).where(eq(libraryItems.id, id));
}

export async function deleteLibraryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(libraryItems).where(eq(libraryItems.id, id));
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export async function listCalendarEvents(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  if (from && to) {
    return db.select().from(calendarEvents)
      .where(and(gte(calendarEvents.startDate, from), lte(calendarEvents.startDate, to)))
      .orderBy(calendarEvents.startDate);
  }
  return db.select().from(calendarEvents).orderBy(calendarEvents.startDate);
}

export async function createCalendarEvent(data: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [r] = await db.insert(calendarEvents).values(data);
  return (r as any).insertId as number;
}

export async function updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id));
}

export async function deleteCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function listInvoices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
}

export async function getInvoicesByQuote(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.quoteId, quoteId));
}

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [r] = await db.insert(invoices).values(data);
  return (r as any).insertId as number;
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function listNotifications(quoteId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (quoteId) return db.select().from(notifications).where(eq(notifications.quoteId, quoteId)).orderBy(desc(notifications.createdAt));
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export async function listEmailTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailTemplates).orderBy(emailTemplates.name);
}

export async function getEmailTemplate(name: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.name, name)).limit(1);
  return result[0] ?? null;
}

export async function upsertEmailTemplate(data: InsertEmailTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(emailTemplates).values(data).onDuplicateKeyUpdate({ set: { subject: data.subject, body: data.body } });
}

export async function updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(emailTemplates).set(data).where(eq(emailTemplates.id, id));
}
