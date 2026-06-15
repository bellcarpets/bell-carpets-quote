/**
 * AEST Timezone Utilities
 * All dates/times in the Bell Carpets system use Queensland time (AEST, GMT+10)
 * This utility ensures consistent timezone handling across server, client, PDF, and notifications
 */

/**
 * Get current time in AEST (Queensland time, GMT+10)
 */
export function nowAEST(): Date {
  const now = new Date();
  // Use Australia/Brisbane timezone for consistent AEST handling
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "2026");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "01") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "01");
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "00");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "00");
  const second = parseInt(parts.find((p) => p.type === "second")?.value || "00");
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Format a date in AEST for display (e.g., "23 Apr 2026")
 */
export function formatAESTDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  };
  return d.toLocaleDateString("en-AU", options || defaultOptions);
}

/**
 * Format a date in AEST with time (e.g., "23 Apr 2026, 2:30 PM")
 */
export function formatAESTDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  };
  return d.toLocaleString("en-AU", options || defaultOptions);
}

/**
 * Convert a UTC timestamp to AEST date string (for display)
 */
export function utcToAESTDateString(utcDate: Date | string): string {
  const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return formatAESTDate(d);
}

/**
 * Parse a date string (YYYY-MM-DD) as AEST midnight
 * Used for quote expiry, scheduled dates, etc.
 */
export function parseAESTDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Create date at midnight AEST
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Adjust for timezone to represent AEST midnight
  const offset = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() + offset);
}

/**
 * Add days to an AEST date
 */
export function addDaysAEST(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get AEST date string for today (YYYY-MM-DD)
 */
export function todayAESTString(): string {
  const today = nowAEST();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get AEST date string for a given date (YYYY-MM-DD)
 */
export function toAESTDateString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

/**
 * Calculate expiry date in AEST (issueDate + validDays)
 */
export function calculateExpiryDateAEST(
  issueDate: string,
  validDays: number
): string {
  const issue = parseAESTDate(issueDate);
  const expiry = addDaysAEST(issue, validDays);
  return toAESTDateString(expiry);
}

/**
 * Check if a date is in the past (AEST)
 */
export function isDateInPastAEST(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = nowAEST();
  return d.getTime() < now.getTime();
}

/**
 * Check if a date is today (AEST)
 */
export function isDateTodayAEST(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = nowAEST();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * Days until a date (AEST)
 */
export function daysUntilAEST(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = nowAEST();
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
