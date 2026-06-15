import { z } from "zod";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getAdminAuth, upsertAdminAuth,
  getNextQuoteNumber, createQuote, updateQuote, getQuoteById, listQuotes, getQuoteStatusCounts, deleteQuote, incrementQuoteViews,
  getQuoteTiers, upsertQuoteTier, deleteQuoteTiers,
  getQuoteServices, replaceQuoteServices,
  listAgencies, createAgency, updateAgency, deleteAgency,
  listContacts, createContact, updateContact, deleteContact,
  listLibraryItems, createLibraryItem, updateLibraryItem, deleteLibraryItem,
  listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  listInvoices, getInvoicesByQuote, createInvoice, updateInvoice,
  listNotifications, createNotification,
  listEmailTemplates, getEmailTemplate, upsertEmailTemplate, updateEmailTemplate,
  upsertUser, getUserByOpenId,
} from "./db";
import { ENV } from "./_core/env";
import { sendEmail, isEmailConfigured } from "./email";

const ADMIN_SESSION_COOKIE = "bc_admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSessionToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function requireAdminSession(ctx: any) {
  const token = ctx.req.cookies?.[ADMIN_SESSION_COOKIE];
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  const auth = await getAdminAuth();
  if (!auth || auth.sessionToken !== token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid session" });
  if (auth.sessionExpiresAt && new Date() > auth.sessionExpiresAt) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired" });
  return auth;
}

// ─── Seed default data ────────────────────────────────────────────────────────

async function ensureDefaults() {
  const auth = await getAdminAuth();
  if (!auth) {
    const hash = await bcrypt.hash("bellcarpets2026", 12);
    await upsertAdminAuth({ passwordHash: hash });
  }
  // Seed default library items
  const items = await listLibraryItems();
  if (items.length === 0) {
    const defaults = [
      { title: "Diamond grind substrate", description: "Diamond grind concrete substrate to remove adhesive and level surface." },
      { title: "Skim coat substrate", description: "Apply skim coat to substrate to fill imperfections and create smooth surface." },
      { title: "Remove existing flooring", description: "Remove and dispose of existing flooring material." },
      { title: "Move furniture", description: "Move and replace furniture as required." },
      { title: "Install carpet underlay", description: "Supply and install carpet underlay as specified." },
      { title: "Clean and prepare substrate", description: "Thoroughly clean and prepare substrate prior to installation." },
      { title: "Install transition strips", description: "Supply and install transition strips at doorways and floor junctions." },
    ];
    for (let i = 0; i < defaults.length; i++) {
      await createLibraryItem({ ...defaults[i], sortOrder: i });
    }
  }
  // Seed default email templates
  const tmpl = await getEmailTemplate("quote_sent");
  if (!tmpl) {
    await upsertEmailTemplate({
      name: "quote_sent",
      subject: "Your Flooring Quote from Bell Carpets — {{quoteNumber}}",
      body: `Hi {{clientName}},\n\nThank you for the opportunity to quote on your flooring project.\n\nPlease find your personalised quote at the link below:\n\n{{quoteLink}}\n\nThis quote is valid for {{validDays}} days.\n\nIf you have any questions, please don't hesitate to get in touch.\n\nKind regards,\nBell Carpets\n📞 0412 345 678\n✉ info@bellcarpets.com.au`,
      variables: JSON.stringify(["quoteNumber", "clientName", "quoteLink", "validDays", "propertyAddress"]),
    });
  }
}

// Run on startup
ensureDefaults().catch(console.error);

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Admin Auth ─────────────────────────────────────────────────────────────

  admin: router({
    login: publicProcedure
      .input(z.object({ password: z.string(), totpCode: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const auth = await getAdminAuth();
        if (!auth) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Admin not configured" });
        const valid = await bcrypt.compare(input.password, auth.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        if (auth.twoFactorEnabled && auth.twoFactorSecret) {
          if (!input.totpCode) return { requires2FA: true };
          const verified = speakeasy.totp.verify({ secret: auth.twoFactorSecret, encoding: "base32", token: input.totpCode, window: 1 });
          if (!verified) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid 2FA code" });
        }
        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
        await upsertAdminAuth({ sessionToken: token, sessionExpiresAt: expiresAt });
        ctx.res.cookie(ADMIN_SESSION_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: SESSION_DURATION_MS / 1000,
        });
        return { success: true };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      await upsertAdminAuth({ sessionToken: null as any, sessionExpiresAt: null as any });
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "none", path: "/" });
      return { success: true };
    }),

    check: publicProcedure.query(async ({ ctx }) => {
      try {
        await requireAdminSession(ctx);
        return { authenticated: true };
      } catch {
        return { authenticated: false };
      }
    }),

    changePassword: publicProcedure
      .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const auth = await getAdminAuth();
        if (!auth) throw new TRPCError({ code: "NOT_FOUND" });
        const valid = await bcrypt.compare(input.currentPassword, auth.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password incorrect" });
        const hash = await bcrypt.hash(input.newPassword, 12);
        await upsertAdminAuth({ passwordHash: hash });
        return { success: true };
      }),

    setup2FA: publicProcedure.mutation(async ({ ctx }) => {
      await requireAdminSession(ctx);
      const secret = speakeasy.generateSecret({ name: "Bell Carpets Admin", length: 20 });
      await upsertAdminAuth({ twoFactorSecret: secret.base32 });
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
      return { secret: secret.base32, qrCode };
    }),

    verify2FA: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const auth = await getAdminAuth();
        if (!auth?.twoFactorSecret) throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not set up" });
        const verified = speakeasy.totp.verify({ secret: auth.twoFactorSecret, encoding: "base32", token: input.token, window: 1 });
        if (!verified) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code" });
        await upsertAdminAuth({ twoFactorEnabled: true });
        return { success: true };
      }),

    disable2FA: publicProcedure.mutation(async ({ ctx }) => {
      await requireAdminSession(ctx);
      await upsertAdminAuth({ twoFactorEnabled: false, twoFactorSecret: null as any });
      return { success: true };
    }),

    get2FAStatus: publicProcedure.query(async ({ ctx }) => {
      await requireAdminSession(ctx);
      const auth = await getAdminAuth();
      return { enabled: auth?.twoFactorEnabled ?? false };
    }),
  }),

  // ─── Quotes ──────────────────────────────────────────────────────────────────

  quotes: router({
    list: publicProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        agencyId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        return listQuotes({
          status: input?.status,
          search: input?.search,
          agencyId: input?.agencyId,
          dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
          dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
        });
      }),

    statusCounts: publicProcedure.query(async ({ ctx }) => {
      await requireAdminSession(ctx);
      return getQuoteStatusCounts();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const quote = await getQuoteById(input.id);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        const tiers = await getQuoteTiers(input.id);
        const services = await getQuoteServices(input.id);
        return { ...quote, tiers, services };
      }),

    // Public endpoint for customer-facing view
    getPublic: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const quote = await getQuoteById(input.id);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        await incrementQuoteViews(input.id);
        const tiers = await getQuoteTiers(input.id);
        const services = await getQuoteServices(input.id);
        // Strip internal notes for public view
        const { internalNotes, ...publicQuote } = quote;
        return { ...publicQuote, tiers, services };
      }),

    create: publicProcedure
      .input(z.object({
        quoteType: z.enum(["homeowner", "agency_3tier", "agency_single"]).optional(),
        clientName: z.string().optional(),
        agentEmail: z.string().optional(),
        agentPhone: z.string().optional(),
        agencyId: z.number().optional(),
        propertyAddress: z.string().optional(),
        temperature: z.enum(["hot", "warm", "cold"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const quoteNumber = await getNextQuoteNumber();
        const validDays = input.quoteType === "homeowner" ? 14 : 30;
        const paymentTermsDays = input.quoteType === "homeowner" ? 7 : 30;
        const expiryDate = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);
        const id = await createQuote({
          quoteNumber,
          quoteType: input.quoteType ?? "homeowner",
          clientName: input.clientName,
          agentEmail: input.agentEmail,
          agentPhone: input.agentPhone,
          agencyId: input.agencyId,
          propertyAddress: input.propertyAddress,
          temperature: input.temperature ?? "warm",
          validDays,
          paymentTermsDays,
          expiryDate,
        });
        await createNotification({ quoteId: id, type: "created", title: `Quote ${quoteNumber} created` });
        return { id, quoteNumber };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        quoteType: z.enum(["homeowner", "agency_3tier", "agency_single"]).optional(),
        status: z.enum(["draft", "quote_sent", "accepted", "deposit_paid", "scheduled", "completed", "invoice_paid", "expired", "archived"]).optional(),
        temperature: z.enum(["hot", "warm", "cold"]).optional(),
        clientName: z.string().optional(),
        agentEmail: z.string().optional(),
        agentPhone: z.string().optional(),
        agencyId: z.number().optional().nullable(),
        contactId: z.number().optional().nullable(),
        propertyAddress: z.string().optional(),
        issueDate: z.string().optional(),
        validDays: z.number().optional(),
        expiryDate: z.string().optional(),
        discount: z.string().optional(),
        credit: z.string().optional(),
        paymentTermsDays: z.number().optional(),
        scopeDescription: z.string().optional(),
        customerNotes: z.string().optional(),
        internalNotes: z.string().optional(),
        insuranceAssessment: z.string().optional(),
        underlayOption: z.enum(["protect", "ultimate", "extra", "eureka"]).optional().nullable(),
        selectedTier: z.enum(["good", "better", "best"]).optional().nullable(),
        tiers: z.array(z.object({
          tier: z.enum(["good", "better", "best"]),
          label: z.string().optional(),
          productName: z.string().optional(),
          manufacturer: z.string().optional(),
          fibre: z.string().optional(),
          pileType: z.string().optional(),
          price: z.string().optional(),
          heroImageUrl: z.string().optional(),
          productUrl: z.string().optional(),
          primaryColour: z.string().optional(),
          accentColour: z.string().optional(),
          carpetColours: z.string().optional(),
          badges: z.string().optional(),
        })).optional(),
        services: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          price: z.string().optional(),
          sortOrder: z.number().optional(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const { id, tiers, services, ...quoteData } = input;
        const updateData: any = { ...quoteData };
        if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate);
        if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
        await updateQuote(id, updateData);
        if (tiers) {
          for (const tier of tiers) {
            await upsertQuoteTier({ ...tier, quoteId: id });
          }
        }
        if (services !== undefined) {
          await replaceQuoteServices(id, services);
        }
        return { success: true };
      }),

    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "quote_sent", "accepted", "deposit_paid", "scheduled", "completed", "invoice_paid", "expired", "archived"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const quote = await getQuoteById(input.id);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        await updateQuote(input.id, { status: input.status });
        await createNotification({
          quoteId: input.id,
          type: "status_change",
          title: `Quote ${quote.quoteNumber} status changed to ${input.status.replace("_", " ")}`,
        });
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        await deleteQuote(input.id);
        return { success: true };
      }),

    duplicate: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const quote = await getQuoteById(input.id);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        const tiers = await getQuoteTiers(input.id);
        const services = await getQuoteServices(input.id);
        const newNumber = await getNextQuoteNumber();
        const { id: _id, quoteNumber: _qn, createdAt: _ca, updatedAt: _ua, viewCount: _vc, emailedAt: _ea, selectedTier: _st, ...rest } = quote;
        const newId = await createQuote({ ...rest, quoteNumber: newNumber, status: "draft", viewCount: 0, emailedAt: null as any, selectedTier: null as any });
        for (const tier of tiers) {
          const { id: _tid, quoteId: _qid, createdAt: _tca, updatedAt: _tua, ...tierRest } = tier;
          await upsertQuoteTier({ ...tierRest, quoteId: newId });
        }
        if (services.length > 0) {
          await replaceQuoteServices(newId, services.map(({ id: _sid, quoteId: _sqid, createdAt: _sca, ...s }) => s));
        }
        return { id: newId, quoteNumber: newNumber };
      }),

    markEmailed: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        await updateQuote(input.id, { emailedAt: new Date() });
        const quote = await getQuoteById(input.id);
        await createNotification({ quoteId: input.id, type: "email_sent", title: `Quote link emailed for ${quote?.quoteNumber}` });
        return { success: true };
      }),

    sendEmail: publicProcedure
      .input(z.object({
        id: z.number(),
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const quote = await getQuoteById(input.id);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

        const result = await sendEmail({
          to: input.to,
          subject: input.subject,
          text: input.body,
          html: input.body.replace(/\n/g, "<br>"),
        });

        if (result.success) {
          await updateQuote(input.id, { emailedAt: new Date() });
          await createNotification({ quoteId: input.id, type: "email_sent", title: `Quote emailed to ${input.to} for ${quote.quoteNumber}` });
        }

        return { success: result.success, error: result.error, smtpConfigured: isEmailConfigured() };
      }),

    checkEmailConfig: publicProcedure.query(async ({ ctx }) => {
      await requireAdminSession(ctx);
      return { configured: isEmailConfigured() };
    }),
  }),

  // ─── Agencies ────────────────────────────────────────────────────────────────

  agencies: router({
    list: publicProcedure.query(async ({ ctx }) => {
      await requireAdminSession(ctx);
      return listAgencies();
    }),
    create: publicProcedure
      .input(z.object({ name: z.string(), email: z.string().optional(), phone: z.string().optional(), address: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const id = await createAgency(input);
        return { id };
      }),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), email: z.string().optional(), phone: z.string().optional(), address: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const { id, ...data } = input;
        await updateAgency(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        await deleteAgency(input.id);
        return { success: true };
      }),
  }),

  // ─── Contacts ────────────────────────────────────────────────────────────────

  contacts: router({
    list: publicProcedure
      .input(z.object({ agencyId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        return listContacts(input?.agencyId);
      }),
    create: publicProcedure
      .input(z.object({ name: z.string(), email: z.string().optional(), phone: z.string().optional(), role: z.string().optional(), agencyId: z.number().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const id = await createContact(input);
        return { id };
      }),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), email: z.string().optional(), phone: z.string().optional(), role: z.string().optional(), agencyId: z.number().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const { id, ...data } = input;
        await updateContact(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        await deleteContact(input.id);
        return { success: true };
      }),
  }),

  // ─── Library ─────────────────────────────────────────────────────────────────

  library: router({
    list: publicProcedure.query(async ({ ctx }) => {
      await requireAdminSession(ctx);
      return listLibraryItems();
    }),
    create: publicProcedure
      .input(z.object({ title: z.string(), description: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const id = await createLibraryItem({ ...input, sortOrder: input.sortOrder ?? 0 });
        return { id };
      }),
    update: publicProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), description: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const { id, ...data } = input;
        await updateLibraryItem(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        await deleteLibraryItem(input.id);
        return { success: true };
      }),
  }),

  // ─── Calendar ────────────────────────────────────────────────────────────────

  calendar: router({
    list: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        return listCalendarEvents(
          input?.from ? new Date(input.from) : undefined,
          input?.to ? new Date(input.to) : undefined,
        );
      }),
    create: publicProcedure
      .input(z.object({ quoteId: z.number().optional(), title: z.string(), description: z.string().optional(), startDate: z.string(), endDate: z.string().optional(), allDay: z.boolean().optional(), colour: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const id = await createCalendarEvent({ ...input, startDate: new Date(input.startDate), endDate: input.endDate ? new Date(input.endDate) : undefined });
        return { id };
      }),
    update: publicProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), description: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(), allDay: z.boolean().optional(), colour: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const { id, startDate, endDate, ...rest } = input;
        await updateCalendarEvent(id, { ...rest, ...(startDate ? { startDate: new Date(startDate) } : {}), ...(endDate ? { endDate: new Date(endDate) } : {}) });
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        await deleteCalendarEvent(input.id);
        return { success: true };
      }),
  }),

  // ─── Invoices ────────────────────────────────────────────────────────────────

  invoices: router({
    list: publicProcedure.query(async ({ ctx }) => {
      await requireAdminSession(ctx);
      return listInvoices();
    }),
    byQuote: publicProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        return getInvoicesByQuote(input.quoteId);
      }),
    create: publicProcedure
      .input(z.object({ quoteId: z.number(), amount: z.string(), dueDate: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const quote = await getQuoteById(input.quoteId);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
        const existing = await listInvoices();
        const nextNum = `INV-${String(existing.length + 1).padStart(4, "0")}`;
        const id = await createInvoice({
          quoteId: input.quoteId,
          invoiceNumber: nextNum,
          amount: input.amount,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          notes: input.notes,
        });
        return { id, invoiceNumber: nextNum };
      }),
    update: publicProcedure
      .input(z.object({ id: z.number(), status: z.enum(["unpaid", "paid", "overdue", "cancelled"]).optional(), paidAt: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const { id, paidAt, ...rest } = input;
        await updateInvoice(id, { ...rest, ...(paidAt ? { paidAt: new Date(paidAt) } : {}) });
        return { success: true };
      }),
  }),

  // ─── Notifications ───────────────────────────────────────────────────────────

  notifications: router({
    list: publicProcedure
      .input(z.object({ quoteId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        return listNotifications(input?.quoteId);
      }),
  }),

  // ─── Email Templates ─────────────────────────────────────────────────────────

  emailTemplates: router({
    list: publicProcedure.query(async ({ ctx }) => {
      await requireAdminSession(ctx);
      return listEmailTemplates();
    }),
    update: publicProcedure
      .input(z.object({ id: z.number(), subject: z.string().optional(), body: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSession(ctx);
        const { id, ...data } = input;
        await updateEmailTemplate(id, data);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
