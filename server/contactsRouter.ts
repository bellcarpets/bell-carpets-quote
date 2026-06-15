/**
 * Contacts Router — CRUD for reusable agent/client contacts
 * All routes are password-protected (admin only)
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { contacts } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "bellcarpets2026";

const passwordInput = z.object({ password: z.string() });

function verifyPassword(password: string) {
  if (password !== ADMIN_PASSWORD) {
    throw new Error("Invalid password");
  }
}

export const contactsRouter = router({
  /** List all contacts (password-protected) */
  list: publicProcedure
    .input(passwordInput)
    .query(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(contacts).orderBy(desc(contacts.updatedAt));
      return rows;
    }),

  /** Create a new contact */
  create: publicProcedure
    .input(
      z.object({
        password: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        agency: z.string().optional(),
      }).refine(
        (d) => (d.name?.trim() || d.agency?.trim()),
        { message: "Please enter a contact name or company — at least one is required" }
      )
    )
    .mutation(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) return { success: false };
      await db.insert(contacts).values({
        name: input.name || null,
        email: input.email || null,
        phone: input.phone || null,
        agency: input.agency || null,
      });
      return { success: true };
    }),

  /** Update an existing contact */
  update: publicProcedure
    .input(
      z.object({
        password: z.string(),
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        agency: z.string().optional(),
      }).refine(
        (d) => (d.name?.trim() || d.agency?.trim()),
        { message: "Please enter a contact name or company — at least one is required" }
      )
    )
    .mutation(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(contacts)
        .set({
          name: input.name || null,
          email: input.email || null,
          phone: input.phone || null,
          agency: input.agency || null,
        })
        .where(eq(contacts.id, input.id));
      return { success: true };
    }),

  /** Delete a contact */
  delete: publicProcedure
    .input(
      z.object({
        password: z.string(),
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      verifyPassword(input.password);
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(contacts).where(eq(contacts.id, input.id));
      return { success: true };
    }),
});
