/**
 * Shared helper for the customer-facing quote "Description" block.
 *
 * The Description is an ordered list of plain-text scope lines rendered in the
 * flowing, left-bordered style on the customer quote page.
 *
 * Source of truth:
 *   - If `config.description` (string[]) exists and is non-empty -> use it verbatim
 *     (admin-edited).
 *   - Otherwise (legacy quotes) -> generate sensible lines from the existing
 *     structured data (scope / scopeOfWorks / product / underlay).
 *
 * This keeps old quotes rendering correctly while letting the admin freely edit
 * the new `description` field going forward.
 */

import type { QuoteConfigData, UnderlayOption } from "../../../shared/quoteConfigTypes";

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

/** Returns true when the admin has set an explicit customer-facing description. */
export function hasCustomDescription(config?: Pick<QuoteConfigData, "description"> | null): boolean {
  return !!config?.description && config.description.some((l) => l.trim().length > 0);
}

/** Human-readable underlay note (e.g. "All options include Dunlop Springtred Extra underlay."). */
export function getUnderlayNote(underlay?: UnderlayOption | string | null): string {
  if (!underlay || !String(underlay).trim()) return "";
  return `All options include ${String(underlay).trim()} underlay.`;
}

/**
 * Returns the flowing description lines for the customer page.
 *
 * @param config  The quote config.
 * @param opts.tiered  When true, omit product/colour specifics (those vary per
 *                     tier) and keep the description product-agnostic.
 */
export function getDescriptionLines(
  config: QuoteConfigData,
  opts?: { tiered?: boolean }
): string[] {
  // 1) Admin-edited description wins.
  if (hasCustomDescription(config)) {
    return config.description!.map((l) => l.trim()).filter((l) => l.length > 0);
  }
  // 2) Legacy fallback: generate from structured data.
  return generateDefaultDescription(config, opts);
}

/**
 * Generates a sensible default description from the structured quote data.
 * Used both for legacy quotes (render-time fallback) and as the admin
 * "Generate from quote" starting point.
 */
export function generateDefaultDescription(
  config: QuoteConfigData,
  opts?: { tiered?: boolean }
): string[] {
  const lines: string[] = [];
  const tiered = opts?.tiered ?? false;

  // Lead line: supply & install of the carpet (single product only).
  if (!tiered && config.product) {
    const p = config.product;
    const parts = [
      "Supply & Installation of new",
      p.manufacturer ? p.manufacturer : "",
      p.productName ? p.productName : "",
      p.colourName && p.colourName !== "To be selected" ? `colour ${p.colourName}` : "",
      p.pileType ? p.pileType.toLowerCase() : "",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const scopeArea = config.scope?.trim();
    lines.push(scopeArea ? `${parts} to ${scopeArea}.` : `${parts}.`);
  } else {
    // Tiered: keep it product-agnostic and use the scope text for the area.
    const scopeArea = config.scope?.trim();
    lines.push(
      scopeArea
        ? `Supply & Installation of new carpet and underlay to ${scopeArea}.`
        : "Supply & Installation of new carpet and underlay throughout."
    );
  }

  // Underlay line (single product only; tiered uses the underlay note instead).
  if (!tiered) {
    const u = config.product?.underlay;
    if (u && String(u).trim()) {
      lines.push(`Supply & Installation on new ${String(u).trim()} underlay.`);
    }
  }

  // Map the structured scopeOfWorks items into natural sentences, skipping the
  // underlay/installation duplicates already covered above.
  const skip = /underlay|installation|supply/i;
  for (const item of config.scopeOfWorks ?? []) {
    const title = item.title?.trim() ?? "";
    const desc = item.description?.trim() ?? "";
    if (!title && !desc) continue;
    if (skip.test(title) && (lines.length > 0)) {
      // already covered by lead/underlay lines — skip obvious duplicates
      if (/underlay|supply|installation/i.test(title)) continue;
    }
    // Prefer the description text; fall back to the title.
    const sentence = desc || title;
    if (sentence && !lines.some((l) => l.toLowerCase().includes(sentence.toLowerCase()))) {
      lines.push(sentence.endsWith(".") ? sentence : `${sentence}.`);
    }
  }

  return lines.filter((l) => l && l.trim().length > 0);
}
