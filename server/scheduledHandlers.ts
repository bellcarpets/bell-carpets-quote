/**
 * scheduledHandlers.ts
 * Express handlers for all Heartbeat-triggered cron jobs.
 * Each handler is mounted at /api/scheduled/<name> in server/_core/index.ts.
 *
 * Auth: sdk.authenticateRequest verifies the cron JWT and sets user.isCron = true.
 * All handlers are idempotent — safe to retry on 5xx.
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { checkAndSendReminders } from "./reminderCron";
import { checkAndSendFollowUpReminders } from "./followUpCron";
import { checkAndSendExpiryReminders } from "./expiryReminderCron";
import { checkAndSendOverdueReminders } from "./overdueInvoiceCron";
import { sendWeeklyPipelineSms } from "./weeklyPipelineSms";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function verifyCron(req: Request, res: Response): Promise<boolean> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      res.status(403).json({ error: "cron-only endpoint" });
      return false;
    }
    return true;
  } catch {
    res.status(403).json({ error: "unauthorized" });
    return false;
  }
}

// ─── Handler: quote expiry reminders ─────────────────────────────────────────

export async function handleReminderCron(req: Request, res: Response) {
  if (!(await verifyCron(req, res))) return;
  try {
    await checkAndSendReminders();
    res.json({ ok: true, job: "reminder" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Scheduled/reminder] Error:", msg);
    res.status(500).json({ error: msg, job: "reminder", timestamp: new Date().toISOString() });
  }
}

// ─── Handler: follow-up notifications ────────────────────────────────────────

export async function handleFollowUpCron(req: Request, res: Response) {
  if (!(await verifyCron(req, res))) return;
  try {
    await checkAndSendFollowUpReminders();
    res.json({ ok: true, job: "followUp" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Scheduled/followUp] Error:", msg);
    res.status(500).json({ error: msg, job: "followUp", timestamp: new Date().toISOString() });
  }
}

// ─── Handler: 2-day expiry SMS to customer ───────────────────────────────────

export async function handleExpiryReminderCron(req: Request, res: Response) {
  if (!(await verifyCron(req, res))) return;
  try {
    await checkAndSendExpiryReminders();
    res.json({ ok: true, job: "expiryReminder" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Scheduled/expiryReminder] Error:", msg);
    res.status(500).json({ error: msg, job: "expiryReminder", timestamp: new Date().toISOString() });
  }
}

// ─── Handler: overdue invoice reminders ──────────────────────────────────────

export async function handleOverdueCron(req: Request, res: Response) {
  if (!(await verifyCron(req, res))) return;
  try {
    await checkAndSendOverdueReminders();
    res.json({ ok: true, job: "overdue" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Scheduled/overdue] Error:", msg);
    res.status(500).json({ error: msg, job: "overdue", timestamp: new Date().toISOString() });
  }
}

// ─── Handler: weekly pipeline SMS to Leon ────────────────────────────────────

export async function handleWeeklyPipelineSms(req: Request, res: Response) {
  if (!(await verifyCron(req, res))) return;
  try {
    await sendWeeklyPipelineSms();
    res.json({ ok: true, job: "weeklyPipeline" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Scheduled/weeklyPipeline] Error:", msg);
    res.status(500).json({ error: msg, job: "weeklyPipeline", timestamp: new Date().toISOString() });
  }
}
