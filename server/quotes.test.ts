import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  getAdminAuth: vi.fn().mockResolvedValue({
    id: 1,
    passwordHash: "$2b$12$placeholder",
    sessionToken: "valid-token",
    sessionExpiresAt: new Date(Date.now() + 86400000),
    twoFactorEnabled: false,
    twoFactorSecret: null,
  }),
  upsertAdminAuth: vi.fn().mockResolvedValue(undefined),
  getNextQuoteNumber: vi.fn().mockResolvedValue("BC-001"),
  createQuote: vi.fn().mockResolvedValue(1),
  updateQuote: vi.fn().mockResolvedValue(undefined),
  getQuoteById: vi.fn().mockResolvedValue({
    id: 1,
    quoteNumber: "BC-001",
    clientName: "Test Client",
    propertyAddress: "12 Test St",
    status: "draft",
    quoteType: "homeowner",
    temperature: "warm",
    issueDate: new Date(),
    validDays: 30,
    expiryDate: new Date(Date.now() + 30 * 86400000),
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  listQuotes: vi.fn().mockResolvedValue([]),
  getQuoteStatusCounts: vi.fn().mockResolvedValue([]),
  deleteQuote: vi.fn().mockResolvedValue(undefined),
  incrementQuoteViews: vi.fn().mockResolvedValue(undefined),
  getQuoteTiers: vi.fn().mockResolvedValue([]),
  upsertQuoteTier: vi.fn().mockResolvedValue(undefined),
  deleteQuoteTiers: vi.fn().mockResolvedValue(undefined),
  getQuoteServices: vi.fn().mockResolvedValue([]),
  replaceQuoteServices: vi.fn().mockResolvedValue(undefined),
  listAgencies: vi.fn().mockResolvedValue([]),
  createAgency: vi.fn().mockResolvedValue(1),
  updateAgency: vi.fn().mockResolvedValue(undefined),
  deleteAgency: vi.fn().mockResolvedValue(undefined),
  listContacts: vi.fn().mockResolvedValue([]),
  createContact: vi.fn().mockResolvedValue(1),
  updateContact: vi.fn().mockResolvedValue(undefined),
  deleteContact: vi.fn().mockResolvedValue(undefined),
  listLibraryItems: vi.fn().mockResolvedValue([]),
  createLibraryItem: vi.fn().mockResolvedValue(1),
  updateLibraryItem: vi.fn().mockResolvedValue(undefined),
  deleteLibraryItem: vi.fn().mockResolvedValue(undefined),
  listCalendarEvents: vi.fn().mockResolvedValue([]),
  createCalendarEvent: vi.fn().mockResolvedValue(1),
  updateCalendarEvent: vi.fn().mockResolvedValue(undefined),
  deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
  listInvoices: vi.fn().mockResolvedValue([]),
  getInvoicesByQuote: vi.fn().mockResolvedValue([]),
  createInvoice: vi.fn().mockResolvedValue(1),
  updateInvoice: vi.fn().mockResolvedValue(undefined),
  listNotifications: vi.fn().mockResolvedValue([]),
  createNotification: vi.fn().mockResolvedValue(1),
  listEmailTemplates: vi.fn().mockResolvedValue([]),
  getEmailTemplate: vi.fn().mockResolvedValue(null),
  upsertEmailTemplate: vi.fn().mockResolvedValue(undefined),
  updateEmailTemplate: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue("$2b$12$hashed"),
  },
}));

vi.mock("speakeasy", () => ({
  default: {
    generateSecret: vi.fn().mockReturnValue({ base32: "TESTSECRET", otpauth_url: "otpauth://totp/test" }),
    totp: { verify: vi.fn().mockReturnValue(true) },
  },
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(sessionToken = "valid-token"): TrpcContext {
  const cookies: Record<string, string> = { bc_admin_session: sessionToken };
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies,
    } as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("admin.check", () => {
  it("returns authenticated true with valid session", async () => {
    const caller = appRouter.createCaller(makeCtx("valid-token"));
    const result = await caller.admin.check();
    expect(result.authenticated).toBe(true);
  });

  it("returns authenticated false with invalid session", async () => {
    const { getAdminAuth } = await import("./db");
    vi.mocked(getAdminAuth).mockResolvedValueOnce({
      id: 1,
      passwordHash: "$2b$12$placeholder",
      sessionToken: "different-token",
      sessionExpiresAt: new Date(Date.now() + 86400000),
      twoFactorEnabled: false,
      twoFactorSecret: null,
    } as any);
    const caller = appRouter.createCaller(makeCtx("wrong-token"));
    const result = await caller.admin.check();
    expect(result.authenticated).toBe(false);
  });
});

describe("quotes.getPublic", () => {
  it("returns quote data for public view", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.quotes.getPublic({ id: 1 });
    expect(result).toMatchObject({ id: 1, quoteNumber: "BC-001" });
  });
});

describe("quotes.statusCounts", () => {
  it("returns status counts array", async () => {
    const caller = appRouter.createCaller(makeCtx("valid-token"));
    const result = await caller.quotes.statusCounts();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("agencies.list", () => {
  it("returns empty array when no agencies", async () => {
    const caller = appRouter.createCaller(makeCtx("valid-token"));
    const result = await caller.agencies.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("library.list", () => {
  it("returns empty array when no items", async () => {
    const caller = appRouter.createCaller(makeCtx("valid-token"));
    const result = await caller.library.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
