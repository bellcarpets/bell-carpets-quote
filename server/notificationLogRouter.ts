/**
 * notificationLogRouter.ts
 * tRPC routes for reading the notification_log table.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { notificationLog } from "../drizzle/schema";
import { desc, eq, like, and } from "drizzle-orm";

export const notificationLogRouter = router({
  /**
   * List all notification log entries, newest first.
   * Optionally filter by quoteNumber prefix (e.g. "BC-008").
   */
  list: publicProcedure
    .input(
      z.object({
        quoteNumber: z.string().optional(), // filter by exact quote number
        limit: z.number().min(1).max(500).default(200),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { entries: [], total: 0 };

      const conditions = input.quoteNumber
        ? [eq(notificationLog.quoteNumber, input.quoteNumber)]
        : [];

      const entries = await db
        .select()
        .from(notificationLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notificationLog.sentAt))
        .limit(input.limit)
        .offset(input.offset);

      return { entries };
    }),

  /**
   * Get all notification log entries for a specific quote number.
   * Used in the per-quote notification history section.
   */
  byQuote: publicProcedure
    .input(z.object({ quoteNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { entries: [] };

      const entries = await db
        .select()
        .from(notificationLog)
        .where(eq(notificationLog.quoteNumber, input.quoteNumber))
        .orderBy(desc(notificationLog.sentAt));

      return { entries };
    }),
});
