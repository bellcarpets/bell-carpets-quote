export type QuoteStatus =
  | "draft" | "quote_sent" | "accepted" | "deposit_paid"
  | "scheduled" | "completed" | "invoice_paid" | "expired" | "archived";

export type QuoteTemperature = "hot" | "warm" | "cold";
export type QuoteType = "homeowner" | "agency_3tier" | "agency_single";
export type UnderlayOption = "protect" | "ultimate" | "extra" | "eureka";
export type TierLevel = "good" | "better" | "best";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  quote_sent: "Quote Sent",
  accepted: "Accepted",
  deposit_paid: "Deposit Paid",
  scheduled: "Scheduled",
  completed: "Completed",
  invoice_paid: "Invoice Paid",
  expired: "Expired",
  archived: "Archived",
};

export const STATUS_ORDER: QuoteStatus[] = [
  "draft", "quote_sent", "accepted", "deposit_paid",
  "scheduled", "completed", "invoice_paid", "expired", "archived",
];

export const NEXT_STATUS: Partial<Record<QuoteStatus, QuoteStatus>> = {
  draft: "quote_sent",
  quote_sent: "accepted",
  accepted: "deposit_paid",
  deposit_paid: "scheduled",
  scheduled: "completed",
  completed: "invoice_paid",
};

export const NEXT_STATUS_LABEL: Partial<Record<QuoteStatus, string>> = {
  draft: "Mark as Quote Sent",
  quote_sent: "Mark as Accepted",
  accepted: "Mark as Deposit Paid",
  deposit_paid: "Mark as Scheduled",
  scheduled: "Mark as Completed",
  completed: "Mark as Invoice Paid",
};

export const QUOTE_TYPE_LABELS: Record<QuoteType, string> = {
  homeowner: "Homeowner",
  agency_3tier: "Real Estate Agency 3-Tier",
  agency_single: "Agency Single Product",
};

export const UNDERLAY_LABELS: Record<UnderlayOption, string> = {
  protect: "Dunlop Springtred Protect",
  ultimate: "Dunlop Springtred Ultimate",
  extra: "Dunlop Springtred Extra",
  eureka: "Dunlop Springtred Eureka",
};

export const TIER_LABELS: Record<TierLevel, string> = {
  good: "GOOD",
  better: "BETTER",
  best: "BEST",
};

export function getDaysLeft(expiryDate: Date | string | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export function getPriceRange(tiers: Array<{ price?: string | null }>): string {
  const prices = tiers
    .map(t => t.price ? parseFloat(t.price) : null)
    .filter((p): p is number => p !== null && !isNaN(p));
  if (prices.length === 0) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatCurrency(min);
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}
