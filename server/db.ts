import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

/**
 * Runs any pending schema changes that weren't applied via migration.
 * Uses INFORMATION_SCHEMA to check before altering — safe to run on every boot.
 */
export async function runStartupMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const mysql2 = await import('mysql2/promise');
    const conn = await mysql2.createConnection(process.env.DATABASE_URL);
    try {
      // Extract database name from the connection URL
      const dbName = new URL(process.env.DATABASE_URL).pathname.replace('/', '');

      // Check and add installationReminderSentAt if missing
      const [rows] = await conn.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'installationReminderSentAt'`,
        [dbName]
      ) as any[];
      if (rows[0].cnt === 0) {
        await conn.execute(`ALTER TABLE \`quotes\` ADD COLUMN \`installationReminderSentAt\` timestamp NULL`);
        console.log('[DB] Migration applied: added installationReminderSentAt column to quotes table');
      }

      // Create quote_views table if it doesn't exist
      const [viewTableRows] = await conn.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'quote_views'`,
        [dbName]
      ) as any[];
      if (viewTableRows[0].cnt === 0) {
        await conn.execute(`
          CREATE TABLE \`quote_views\` (
            \`id\` int AUTO_INCREMENT NOT NULL,
            \`quoteSlug\` varchar(64) NOT NULL,
            \`viewedAt\` timestamp NOT NULL DEFAULT (now()),
            \`userAgent\` varchar(512),
            \`ipAddress\` varchar(64),
            \`city\` varchar(128),
            \`country\` varchar(8),
            \`deviceType\` varchar(16),
            \`isAdmin\` boolean DEFAULT false,
            CONSTRAINT \`quote_views_id\` PRIMARY KEY(\`id\`)
          )
        `);
        console.log('[DB] Migration applied: created quote_views table');
      }
    } finally {
      await conn.end();
    }
  } catch (err) {
    console.error('[DB] Startup migration error (non-fatal):', err);
  }
}
