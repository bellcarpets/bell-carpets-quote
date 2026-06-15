import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { quoteRouter } from "./quoteRouter";
import { adminRouter } from "./adminRouter";
import { contactsRouter } from "./contactsRouter";
import { invoiceRouter } from "./invoiceRouter";
import { scopeLibraryRouter } from "./scopeLibraryRouter";
// Xero router removed — replaced by Saasu (no tRPC router needed, sync is automatic)
import { notificationLogRouter } from "./notificationLogRouter";
import { versionRouter } from "./versionRouter";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  quote: quoteRouter,
  admin: adminRouter,
  contacts: contactsRouter,
  invoice: invoiceRouter,
  scopeLibrary: scopeLibraryRouter,

  notificationLog: notificationLogRouter,
  version: versionRouter,
});

export type AppRouter = typeof appRouter;
