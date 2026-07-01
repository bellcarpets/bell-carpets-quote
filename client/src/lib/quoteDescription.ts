/**
 * Client-facing re-export of the shared quote description logic.
 *
 * The description-generation logic now lives in `shared/quoteDescription.ts`
 * so the customer quote page (client) and the PDF generator (server) share a
 * single source of truth and can never drift. This file keeps the client-only
 * presentational helpers (accent colour, currency formatting) and re-exports
 * the shared logic so existing imports (`@/lib/quoteDescription`) keep working.
 */

export {
  hasCustomDescription,
  getUnderlayNote,
  getDescriptionLines,
  generateDefaultDescription,
} from "../../../shared/quoteDescription";

/** Warm cream accent used across the customer-facing quote page (replaces amber/gold). */
export const CREAM = "#EDE8DF";

/** Format a whole-dollar, GST-inclusive amount as AUD (prices are stored in whole dollars). */
export function formatAUD(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU", { minimumFractionDigits: 0 });
}

/** GST component of a GST-inclusive total (10% GST => total / 11). */
export function gstOf(total: number): number {
  return Math.round(total / 11);
}
