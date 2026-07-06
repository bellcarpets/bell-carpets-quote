/**
 * Shared helper for the customer-facing quote "Description" block.
 *
 * The Description is an ordered list of plain-text scope lines rendered in the
 * flowing style on the customer quote page AND on the generated PDF, so both
 * surfaces stay in perfect sync. This module is framework-free (no React, no
 * browser APIs) so it can be imported by both the client and the server.
 *
 * Source of truth:
 *   - If `config.description` (string[]) exists and is non-empty -> use it verbatim
 *     (admin-edited).
 *   - Otherwise (legacy quotes) -> generate sensible lines from the existing
 *     structured data (scope / scopeOfWorks / product / underlay).
 */

import type { QuoteConfigData, UnderlayOption } from "./quoteConfigTypes";

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
 * Returns the flowing description lines for the customer page and PDF.
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
  // Underlay source differs by layout: single quotes store it on the product,
  // tiered quotes store it per-tier (all tiers share the same underlay, so the
  // first tier is authoritative: this matches the "All options include..." note).
  const rawUnderlay = tiered
    ? config.tiers?.find((t) => t.underlay && String(t.underlay).trim())?.underlay
    : config.product?.underlay;
  const underlayName = rawUnderlay ? String(rawUnderlay).trim() : "";

  const pushUnique = (raw: string) => {
    const s = raw.replace(/\s+/g, " ").trim();
    if (!s) return;
    // Ensure a single trailing full stop.
    const sentence = /[.!?]$/.test(s) ? s : `${s}.`;
    const norm = sentence.toLowerCase().replace(/[^a-z0-9]/g, "");
    const dup = lines.some((l) => {
      const ln = l.toLowerCase().replace(/[^a-z0-9]/g, "");
      // Exact match or substring containment
      if (ln === norm || ln.includes(norm) || norm.includes(ln)) return true;
      // Both lines start with "supply & installation" — treat as duplicates.
      // This catches the case where the product-specific line (e.g. "Supply &
      // Installation of new Victoria Carpets Lemar Twist carpet to bedrooms")
      // and a generic scope item ("Supply & Installation of new carpet to bedrooms")
      // would otherwise both appear because neither fully contains the other.
      const supplyPrefix = "supplyinstallation";
      if (ln.startsWith(supplyPrefix) && norm.startsWith(supplyPrefix)) return true;
      return false;
    });
    if (!dup) lines.push(sentence);
  };

  const withArea = (lead: string, area: string) => {
    const a = area.trim();
    return a ? `${lead} to ${a}` : lead;
  };

  // The "Areas" field (config.scope) is typed by the admin as the room/area
  // text for the carpet line (e.g. "master bedroom and bedroom 2").
  // If empty, the "to [areas]" clause is omitted entirely.
  const areaText = config.scope?.trim() ?? "";

  if (!tiered && config.product) {
    const p = config.product;
    const lead = [
      "Supply & Installation of new",
      p.productName,
      p.colourName && p.colourName.trim() !== "To be selected" ? `colour ${p.colourName}` : "",
      "carpet",
    ]
      .filter(Boolean)
      .join(" ");
    pushUnique(withArea(lead, areaText));
  } else {
    pushUnique(withArea("Supply & Installation of new carpet", areaText));
  }

  // Underlay line: separate from the carpet line and only shown when selected.
  if (underlayName) {
    pushUnique(`Supply & Installation on new ${underlayName} underlay`);
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
