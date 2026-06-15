/**
 * Scope of Work Library Router
 * CRUD for saved reusable SOW items used in the quote editor quick-pick panel.
 */
import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { scopeLibrary } from "../drizzle/schema";
import { eq, asc } from "drizzle-orm";

// We use publicProcedure here but gate by admin password in the client.
// The admin password check is handled at the page level, not per-procedure.

export const scopeLibraryRouter = router({
  /** List all library items ordered by sortOrder */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(scopeLibrary).orderBy(asc(scopeLibrary.sortOrder), asc(scopeLibrary.id));
  }),

  /** Create a new library item */
  create: publicProcedure
    .input(z.object({
      text: z.string().min(1).max(512),
      description: z.string().max(1024).optional().default(""),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      // Default sortOrder to end of list
      const existing = await db.select().from(scopeLibrary).orderBy(asc(scopeLibrary.sortOrder));
      const maxOrder = existing.length > 0 ? Math.max(...existing.map((item) => item.sortOrder)) + 10 : 0;
      const [result] = await db.insert(scopeLibrary).values({
        text: input.text.trim(),
        description: (input.description ?? "").trim(),
        sortOrder: input.sortOrder ?? maxOrder,
      });
      return { id: (result as any).insertId };
    }),

  /** Update an existing library item */
  update: publicProcedure
    .input(z.object({
      id: z.number().int(),
      text: z.string().min(1).max(512).optional(),
      description: z.string().max(1024).optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const updates: Record<string, any> = {};
      if (input.text !== undefined) updates.text = input.text.trim();
      if (input.description !== undefined) updates.description = input.description.trim();
      if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
      if (Object.keys(updates).length === 0) return { ok: true };
      await db.update(scopeLibrary).set(updates).where(eq(scopeLibrary.id, input.id));
      return { ok: true };
    }),

  /** Delete a library item */
  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(scopeLibrary).where(eq(scopeLibrary.id, input.id));
      return { ok: true };
    }),

  /** Reorder items by providing an ordered array of ids */
  reorder: publicProcedure
    .input(z.object({ ids: z.array(z.number().int()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      for (let i = 0; i < input.ids.length; i++) {
        await db.update(scopeLibrary)
          .set({ sortOrder: i * 10 })
          .where(eq(scopeLibrary.id, input.ids[i]));
      }
      return { ok: true };
    }),
});
