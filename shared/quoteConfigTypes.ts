/**
 * Shared types for the editable quote configuration.
 * Used by both the admin panel (write) and public page (read).
 *
 * Four quote types:
 * - "agent"          → 3-tier Good/Better/Best layout (for real estate agents)
 * - "homeowner"      → Single product layout (for private residential clients)
 * - "real_estate"    → 3-tier layout with agent payment terms (no deposit, notifications to agent)
 * - "agency_single"  → Single product layout with agent payment terms (no deposit, notifications to agent)
 *
 * Pricing modes (legacy, only used for "agent" type):
 * - "tiered"  → default 3-tier layout
 * - "single"  → single price, no tier selection (uses `product` field)
 */

export type QuoteType = "agent" | "homeowner" | "real_estate" | "agency_single";

/**
 * Helper: Does this quote type use homeowner-style layout (single product, optional rooms)?
 * true for "homeowner" and "agency_single"
 */
export function usesHomeownerLayout(qt: QuoteType | string): boolean {
  return qt === "homeowner" || qt === "agency_single";
}

/**
 * Helper: Does this quote type use agent-style payment terms (no deposit, full payment on completion)?
 * true for "agent", "real_estate", and "agency_single"
 */
export function usesAgentPaymentTerms(qt: QuoteType | string): boolean {
  return qt === "agent" || qt === "real_estate" || qt === "agency_single";
}

/**
 * Helper: Should notifications be routed to the agent contact (not homeowner)?
 * true for "agent", "real_estate", and "agency_single"
 */
export function routeNotificationsToAgent(qt: QuoteType | string): boolean {
  return qt === "agent" || qt === "real_estate" || qt === "agency_single";
}

/** Controls how pricing is displayed on agent quotes */
export type PricingMode = "tiered" | "single";

export interface ColourOptionConfig {
  id: string;
  name: string;
  code?: string;
  swatchImage: string;
}

export interface TierConfig {
  id: string;
  name: string;
  label: string;
  productName: string;
  manufacturer: string;
  fibre: string;
  pileType: string;
  /** Pile weight in oz — shown on customer-facing page (e.g. "26oz", "34oz") */
  pileWeight?: string;
  /** Roll width (e.g. "4.0m") */
  width?: string;
  badges: string[];
  price: number;
  color: string;
  colorAccent: string;
  image: string;
  productUrl: string;
  colours: ColourOptionConfig[];
  /** Carpet colour name shown on quote (e.g. "Charcoal", "Silver Birch") */
  colourName?: string;
  /** Underlay product selected for this tier */
  underlay?: UnderlayOption;
}

/** Underlay options available on single-product quotes */
export type UnderlayOption = "Dunlop Springtred Protect" | "Dunlop Springtred Ultimate" | "Dunlop Springtred Extra" | "Dunlop Eureka" | "";

/**
 * Single product config — used for homeowner quotes and agency_single quotes.
 * Simpler than TierConfig: no tier branding, no hero image required.
 */
export interface HomeownerProductConfig {
  id: string;
  productName: string;
  manufacturer: string;
  fibre: string;
  pileType: string;
  badges: string[];
  price: number;
  productUrl: string;
  colours: ColourOptionConfig[];
  /** Carpet colour name shown on quote (e.g. "Charcoal", "Silver Birch") */
  colourName?: string;
  /** Underlay product selected for this quote */
  underlay?: UnderlayOption;
}

export interface AddonConfig {
  id: string;
  title: string;
  description: string;
  price: number;
}

export interface ScopeItemConfig {
  title: string;
  description: string;
}

export interface RoomItemConfig {
  id: string;
  name: string;
  price: number;
}

export interface QuoteConfigData {
  quoteNumber: string;
  issueDate: string;
  validDays: number;
  depositPercent: number;
  quoteType: QuoteType;

  /**
   * For legacy "agent" quotes only: "tiered" (default) shows 3 tiers, "single" shows one price.
   * "homeowner" and "agency_single" always use single product layout.
   * "real_estate" always uses tiered layout.
   */
  pricingMode?: PricingMode;

  client: {
    name: string;
    type: string;
  };

  property: {
    address: string;
    fullAddress: string;
  };

  scope: string;

  /**
   * Optional customer-facing description shown as a flowing, left-bordered block
   * on the quote page (one entry per line). When present and non-empty, it is the
   * source of truth for the scope shown to the customer and the titled
   * "Scope of Works" list is hidden. When absent (legacy quotes), the page
   * generates equivalent flowing lines from scope/scopeOfWorks/product/underlay.
   */
  description?: string[];

  scopeOfWorks: ScopeItemConfig[];
  addons: AddonConfig[];

  /** For agent/real_estate quotes — three tiers (Good/Better/Best) */
  tiers: TierConfig[];

  /** For homeowner and agency_single quotes — single product */
  product?: HomeownerProductConfig;

  /** Optional: room-by-room itemisation for homeowner/agency_single quotes (if empty, uses single product price) */
  rooms?: RoomItemConfig[];

  terms: string[];

  /** Optional customer-visible notes shown below scope of works (e.g. access instructions, colour confirmations) */
  customerNotes?: string;
}
