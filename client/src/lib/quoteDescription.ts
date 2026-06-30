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

  const pushUnique = (raw: string) => {
    const s = raw.replace(/\s+/g, " ").trim();
    if (!s) return;
    // Ensure a single trailing full stop.
    const sentence = /[.!?]$/.test(s) ? s : `${s}.`;
    const norm = sentence.toLowerCase().replace(/[^a-z0-9]/g, "");
    const dup = lines.some((l) => {
      const ln = l.toLowerCase().replace(/[^a-z0-9]/g, "");
      return ln === norm || ln.includes(norm) || norm.includes(ln);
    });
    if (!dup) lines.push(sentence);
  };

  const scopeText = config.scope?.trim() ?? "";
  // The admin-entered `scope` is usually already a complete "Supply & Installation
  // of ... to <area>" sentence. When it reads like one, use it verbatim as the
  // lead line. Only synthesise a sentence from the product specs when scope is
  // empty or is just a bare area fragment (e.g. "master bedroom").
  const scopeIsSentence = /supply|install|provide|replace/i.test(scopeText);

  if (scopeIsSentence) {
    pushUnique(scopeText);
  } else if (!tiered && config.product) {
    const p = config.product;
    const lead = [
      "Supply & Installation of new",
      p.manufacturer,
      p.productName,
      p.colourName && p.colourName.trim() !== "To be selected" ? `colour ${p.colourName}` : "",
      p.pileType ? p.pileType.toLowerCase() : "",
    ]
      .filter(Boolean)
      .join(" ");
    pushUnique(scopeText ? `${lead} to ${scopeText}` : lead);
  } else {
    pushUnique(
      scopeText
        ? `Supply & Installation of new carpet and underlay to ${scopeText}`
        : "Supply & Installation of new carpet and underlay throughout"
    );
  }

  // Underlay line (single product only; tiered uses the underlay note instead).
  // Only add it if the underlay isn't already mentioned in a prior line.
  if (!tiered) {
    const u = config.product?.underlay ? String(config.product.underlay).trim() : "";
    const underlayMentioned =
      /underlay/i.test(scopeText) ||
      (!!u && lines.some((l) => l.toLowerCase().includes(u.toLowerCase())));
    if (u && !underlayMentioned) {
      pushUnique(`Supply & Installation on new ${u} underlay`);
    }
  }

  // Append the structured scopeOfWorks items as natural sentences, skipping any
  // that duplicate what's already covered (supply/install/underlay leads).
  for (const item of config.scopeOfWorks ?? []) {
    const desc = item.description?.trim() ?? "";
    const title = item.title?.trim() ?? "";
    const sentence = desc || title;
    if (sentence) pushUnique(sentence);
  }

  return lines;
}
