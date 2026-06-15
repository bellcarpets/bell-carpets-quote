/**
 * notificationLog.ts
 * Writes a record to notification_log for every SMS/email send attempt.
 * Never throws — logging failures are swallowed so they cannot disrupt the
 * notification send path.
 */
import { getDb } from "./db";
import { notificationLog } from "../drizzle/schema";

export interface NotificationLogParams {
  /** Quote number, e.g. "BC-008" */
  quoteNumber: string;
  /** Event that triggered this notification: "accepted" | "deposit_paid" | "scheduled" | "completed" | "paid_in_full" | "reminder" | "overdue_reminder" | "quote_link" */
  statusTrigger: string;
  /** Channel: "email" or "sms" */
  channel: "email" | "sms";
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  success: boolean;
  errorMessage?: string;
}

export async function logNotification(params: NotificationLogParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(notificationLog).values({
      quoteNumber: params.quoteNumber,
      statusTrigger: params.statusTrigger,
      channel: params.channel,
      recipientEmail: params.recipientEmail ?? null,
      recipientPhone: params.recipientPhone ?? null,
      recipientName: params.recipientName ?? null,
      success: params.success ? 1 : 0,
      errorMessage: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[NotificationLog] Failed to write log entry:", err);
  }
}
