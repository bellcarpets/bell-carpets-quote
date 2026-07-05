/**
 * QuotePage — Public quote page loaded by /quote/:slug
 * Handles both "agent" (3-tier) and "homeowner" (single product) layouts
 * Clean black & white premium design
 */

import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, FileText, Loader2, AlertCircle, Download, X, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Tier, ColourOption } from "@/lib/quoteData";
import { QUOTE_DATA } from "@/lib/quoteData";
import TierCard from "@/components/TierCard";
import AddonSelector from "@/components/AddonSelector";
import HomeownerQuotePanel from "@/components/HomeownerQuotePanel";
import ScopeOfWorks from "@/components/ScopeOfWorks";
import QuoteTerms from "@/components/QuoteTerms";

import WhyBellCarpets from "@/components/WhyBellCarpets";
import Footer from "@/components/Footer";
import AcceptModal from "@/components/AcceptModal";
import JobStatusTracker from "@/components/JobStatusTracker";

import { LOGO_WHITE_PNG } from "@/lib/logo";
import { CREAM, getDescriptionLines, getUnderlayNote } from "@/lib/quoteDescription";
import { formatAESTDate } from "../../../shared/aestUtils";
import { Shield, Volume2, Thermometer, Droplets, Layers, Wind } from "lucide-react";
import type { UnderlayOption } from "../../../shared/quoteConfigTypes";

/** Underlay specs data — keyed by UnderlayOption value */
const UNDERLAY_SPECS: Record<NonNullable<Exclude<UnderlayOption, "">>, {
  name: string;
  tagline: string;
  specs: { icon: React.ElementType; label: string }[];
  highlight: { icon: React.ElementType; title: string; body: string };
  benefits: { icon: React.ElementType; label: string }[];
}> = {
  "Dunlop Springtred Protect": {
    name: "Dunlop Springtred Protect",
    tagline: "Ideal for busy homes & pet owners",
    specs: [
      { icon: Layers, label: "10mm Thickness" },
      { icon: Shield, label: "80 kg/m³ Density" },
      { icon: Volume2, label: "26dB Acoustic Performance" },
      { icon: Thermometer, label: "R 0.25 Thermal Insulation" },
    ],
    highlight: {
      icon: Droplets,
      title: "Spill & Stain Protection Barrier",
      body: "Built-in moisture barrier protects from spills above and moisture below",
    },
    benefits: [
      { icon: Shield, label: "Mould & mildew resistant" },
      { icon: Volume2, label: "Reduces noise transfer by up to 62%" },
    ],
  },
  "Dunlop Springtred Ultimate": {
    name: "Dunlop Springtred Ultimate",
    tagline: "The healthier choice for your home",
    specs: [
      { icon: Layers, label: "10mm Thickness" },
      { icon: Shield, label: "120 kg/m³ Density" },
      { icon: Volume2, label: "26dB Acoustic Performance" },
      { icon: Thermometer, label: "R 0.26 Thermal Insulation" },
    ],
    highlight: {
      icon: Wind,
      title: "Dunlop Fresh Living — Antimicrobial Protection",
      body: "Reduces dust mites, bacteria, mould & mildew for healthier indoor air quality",
    },
    benefits: [
      { icon: Shield, label: "Asthma & allergy friendly" },
      { icon: Volume2, label: "Reduces noise transfer by up to 62%" },
      { icon: Layers, label: "Premium 120 kg/m³ density for maximum comfort & longevity" },
    ],
  },
  "Dunlop Springtred Extra": {
    name: "Dunlop Springtred Extra",
    tagline: "Everyday comfort & protection",
    specs: [
      { icon: Shield, label: "95 kg/m³ Density" },
      { icon: Volume2, label: "24dB Acoustic Performance" },
      { icon: Thermometer, label: "R 0.22 Thermal Insulation" },
    ],
    highlight: {
      icon: Shield,
      title: "Reliable Everyday Performance",
      body: "Quality re-bonded foam underlay with built-in moisture barrier for everyday living",
    },
    benefits: [
      { icon: Shield, label: "Moisture barrier protection" },
      { icon: Volume2, label: "Reduces noise transfer" },
    ],
  },
  "Dunlop Eureka": {
    name: "Dunlop Eureka",
    tagline: "Luxury classified. Solid underfoot.",
    specs: [
      { icon: Layers, label: "10mm Thickness" },
      { icon: Shield, label: "80 kg/m³ Density" },
      { icon: Volume2, label: "26dB Acoustic Performance" },
      { icon: Thermometer, label: "R 0.21 Thermal Insulation" },
    ],
    highlight: {
      icon: Shield,
      title: "Luxury Classified — AS 4288-2003",
      body: "Independently rated Luxury (Class L) under the Australian Standard for carpet underlay",
    },
    benefits: [
      { icon: Layers, label: "Re-bonded polyurethane foam for lasting support" },
      { icon: Volume2, label: "Reduces noise transfer by up to 62%" },
      { icon: Shield, label: "10mm comfort underfoot" },
    ],
  },
  "Dunlop Government Red": {
    name: "Dunlop Government Red",
    tagline: "General residential. Built to spec.",
    specs: [
      { icon: Layers, label: "8mm Thickness" },
      { icon: Shield, label: "70 kg/m³ Density" },
      { icon: Volume2, label: "28dB Acoustic Performance" },
      { icon: Thermometer, label: "R 0.20 Thermal Insulation" },
    ],
    highlight: {
      icon: Shield,
      title: "General Residential — AS 4288-2003",
      body: "Classified General Residential (GR) under the Australian Standard for carpet underlay",
    },
    benefits: [
      { icon: Layers, label: "Re-bonded polyurethane foam" },
      { icon: Volume2, label: "28dB acoustic rating" },
      { icon: Shield, label: "Polypropylene mesh topside" },
    ],
  },
};

/** Map underlay option to a compact scope item for display in the Scope of Works list */
const UNDERLAY_SCOPE_ITEMS: Record<NonNullable<Exclude<UnderlayOption, "">>, { title: string; description: string }> = {
  "Dunlop Springtred Protect": {
    title: "Premium Underlay",
    description: "Dunlop Springtred Protect, 10mm, 80 kg/m\u00b3",
  },
  "Dunlop Springtred Ultimate": {
    title: "Premium Underlay",
    description: "Dunlop Springtred Ultimate, 10mm, 120 kg/m\u00b3",
  },
  "Dunlop Springtred Extra": {
    title: "Premium Underlay",
    description: "Dunlop Springtred Extra, 95 kg/m\u00b3",
  },
  "Dunlop Eureka": {
    title: "Premium Underlay",
    description: "Dunlop Eureka, 10mm, 80 kg/m\u00b3",
  },
  "Dunlop Government Red": {
    title: "Underlay",
    description: "Dunlop Government Red, 8mm, 70 kg/m\u00b3",
  },
};

/** Returns scope items with underlay prepended as the first item if an underlay is selected */
function withUnderlayItem(
  items: { title: string; description: string }[],
  underlay?: UnderlayOption
): { title: string; description: string }[] {
  if (!underlay) return items;
  const underlayItem = UNDERLAY_SCOPE_ITEMS[underlay as keyof typeof UNDERLAY_SCOPE_ITEMS];
  if (!underlayItem) return items;
  return [underlayItem, ...items];
}

const formatPrice = (n: number) =>
  "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });

interface QuotePageProps {
  slug: string;
}

export default function QuotePage({ slug }: QuotePageProps) {
  // Detect when opened from CRM preview — shows a floating back button
  const isPreviewMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("preview") === "1";
  }, []);

  const { data: quoteData, isLoading, error } = trpc.admin.getQuote.useQuery(
    { slug },
    { refetchOnWindowFocus: false }
  );

  const config = quoteData?.config;
  const quoteType = quoteData?.quoteType ?? "agent";

  // ─── Track public quote page view (fire-and-forget) ─────────────────
  // Detect admin via localStorage (persists across new tabs opened from admin panel)
  // Also treat ?preview=1 as admin (belt-and-suspenders for PDF generation previews)
  const isAdminViewing = useMemo(() => {
    // Check ?preview=1 URL param first (PDF generation previews)
    if (isPreviewMode) return true;
    // Check localStorage admin session (covers all admin-opened quote URLs)
    try {
      const raw = localStorage.getItem('bell_admin_session');
      if (!raw) return false;
      const { expiresAt } = JSON.parse(raw) as { expiresAt: number };
      return Date.now() < expiresAt;
    } catch { return false; }
  }, [isPreviewMode]);
  const trackViewMutation = trpc.quote.trackView.useMutation();
  const [viewTracked, setViewTracked] = useState(false);
  useEffect(() => {
    if (slug && !viewTracked && !isLoading) {
      setViewTracked(true);
      trackViewMutation.mutate({
        slug,
        userAgent: navigator.userAgent,
        isAdmin: isAdminViewing,
      });
    }
  }, [slug, viewTracked, isLoading]);
  const pricingMode = config?.pricingMode ?? "tiered";
  const isSinglePriceAgent = quoteType === "agent" && pricingMode === "single";
  const isAgencySingle = quoteType === "agency_single";
  const isInsuranceAssessment = quoteData?.isInsuranceAssessment ?? false;
  const linkedQuoteSlug = quoteData?.linkedQuoteSlug ?? null;
  const linkedQuoteNumber = quoteData?.linkedQuoteNumber ?? null;

  // Agent quote state
  const [expandedTierId, setExpandedTierId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const addonRef = useRef<HTMLDivElement>(null);
  const downloadPdfMutation = trpc.invoice.downloadQuotePdf.useMutation();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!config) return;
    setDownloading(true);
    try {
      // For single-price quotes (homeowner or single-price agent), use config.product directly.
      // For agent tiered quotes, pass ALL tiers so the PDF shows a comparison layout.
      const isSingle = pricingMode === "single";
      const isAgentTiered = (quoteType === "agent" || quoteType === "real_estate") && !isSingle && tiers.length > 1;
      const product = config.product;
      const tier = selectedTier || tiers[0];
      const colour = isSingle
        ? null // single-price quotes use product.colourName, not a colour picker selection
        : selectedColourObj || (tier?.colours?.[0] ?? null);

      // Build allTiers payload for agent tiered quotes
      const allTiersPayload = isAgentTiered
        ? tiers.map((t) => ({
            name: t.name,
            productName: t.productName ?? "",
            manufacturer: t.manufacturer ?? "",
            fibre: t.fibre ?? "",
            pileType: t.pileType ?? "",
            price: t.price,
            depositPercent: config.depositPercent ?? 50,
          }))
        : undefined;

      // For homeowner, real_estate, and agency_single quotes with room itemisation, pass rooms to PDF
      const hasRooms = (quoteType === "homeowner" || quoteType === "real_estate" || quoteType === "agency_single") &&
        (config.rooms?.length ?? 0) > 0;
      const roomsPayload = hasRooms ? config.rooms : undefined;
      const roomsTotal = hasRooms
        ? (config.rooms?.reduce((sum, r) => sum + r.price, 0) ?? 0)
        : 0;
      const basePrice = isSingle ? (product?.price ?? 0) : (tier?.price ?? 0);
      const effectiveBasePrice = hasRooms ? roomsTotal : basePrice;
      const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0);

      const result = await downloadPdfMutation.mutateAsync({
        quoteSlug: slug,
        tierName: isSingle ? (product?.productName ?? "Carpet") : (tier?.name ?? ""),
        productName: isSingle ? (product?.productName ?? "") : (tier?.productName ?? ""),
        manufacturer: isSingle ? (product?.manufacturer ?? "") : (tier?.manufacturer ?? ""),
        fibre: isSingle ? (product?.fibre ?? "") : (tier?.fibre ?? ""),
        pileType: isSingle ? (product?.pileType ?? "") : (tier?.pileType ?? ""),
        colourName: isSingle ? (product?.colourName ?? "") : (colour?.name ?? ""),
        colourCode: isSingle ? "" : (colour?.code ?? ""),
        basePrice: effectiveBasePrice,
        addons: selectedAddons.map((a) => ({ title: a.title, price: a.price })),
        grandTotal: effectiveBasePrice + addonsTotal,
        rooms: roomsPayload,
        allTiers: allTiersPayload,
      });
      // Open the PDF via the direct server endpoint — no blob URLs needed.
      // The server streams the file with Content-Type: application/pdf so
      // every browser (including mobile Safari) opens it natively.
      window.open(`/api/quote/${slug}/pdf`, "_blank");
    } catch (err) {
      console.error("[Quote] PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  // Get tiers from config (tiered quotes only, regardless of quote type)
  const tiers = useMemo(() => {
    if (!config || pricingMode === "single") return [];
    return config.tiers.map((t) => ({
      ...t,
      priceFormatted: formatPrice(t.price),
      deposit: formatPrice(Math.round(t.price * ((config.depositPercent ?? 50) / 100) * 100) / 100),
      colours: t.colours as ColourOption[],
    }));
  }, [config, quoteType, pricingMode]);

  // Map DB config addons
  const addons = useMemo(() => {
    if (!config) return [];
    return config.addons.map((a) => ({
      ...a,
      priceFormatted: formatPrice(a.price),
    }));
  }, [config]);

  // Quote validity date — use authoritative expiresAt from DB, fall back to issueDate + validDays
  const validUntil = useMemo(() => {
    if (!config) return "";
    // Prefer the DB expiresAt — format in AEST so the date matches what's stored
    if (quoteData?.expiresAt) {
      return formatAESTDate(new Date(quoteData.expiresAt), { day: "2-digit", month: "short", year: "numeric" });
    }
    // Legacy fallback: parse issueDate string + validDays
    try {
      const parts = config.issueDate.split(" ");
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const day = parseInt(parts[0]!);
      const month = months[parts[1]!] ?? 0;
      const year = parseInt(parts[2]!);
      const date = new Date(year, month, day);
      date.setDate(date.getDate() + (config.validDays ?? 10));
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return "";
    }
  }, [config, quoteData?.expiresAt]);



  const handleExpandTier = (tierId: string) => {
    setExpandedTierId((prev) => (prev === tierId ? null : tierId));
  };

  const handleSelectColour = (tierId: string, colourId: string) => {
    setSelections((prev) => ({ ...prev, [tierId]: colourId }));
  };

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const selectedAddons = addons.filter((a) => selectedAddonIds.includes(a.id));
  const selectedTierId = expandedTierId;
  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const selectedColourId = selectedTierId ? selections[selectedTierId] || null : null;
  const selectedColourObj = selectedTier && selectedColourId ? selectedTier.colours.find((c) => c.id === selectedColourId) : null;
  const showStickyBar = !!(selectedTier && selectedColourObj && (quoteType === "real_estate" || quoteType === "agent"));

  // ─── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <motion.img
            src={LOGO_WHITE_PNG}
            alt="Bell Carpets"
            className="h-10 mx-auto mb-2"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="text-[9px] tracking-[0.3em] text-white/40 uppercase font-light mb-5">{QUOTE_DATA.business.tagline}</p>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <p className="text-xs text-white/30 mt-4 tracking-wide">Loading your quote...</p>
        </motion.div>
      </div>
    );
  }

  // ─── Error / not found state ────────────────────────────────────────
  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-900">
        <div className="text-center max-w-sm">
          <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-8 mx-auto mb-2 opacity-30" />
          <p className="text-[9px] tracking-[0.3em] text-white/40 uppercase font-light mb-6">{QUOTE_DATA.business.tagline}</p>
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-white/20" />
          <h2 className="text-xl font-semibold mb-2 text-white">
            Quote Not Found
          </h2>
          <p className="text-sm mb-6 text-white/50">
            This quote link may have expired or is invalid. Please contact Bell Carpets for assistance.
          </p>
          <a
            href="tel:0755711177"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
          >
            Call 07 5571 1177
          </a>
        </div>
      </div>
    );
  }

  // ─── Cancelled state ────────────────────────────────────────────────
  if (quoteData?.jobStatus === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-900">
        <div className="text-center max-w-sm">
          <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-10 mx-auto mb-2 opacity-60" />
          <p className="text-[9px] tracking-[0.3em] text-white/40 uppercase font-light mb-10">{QUOTE_DATA.business.tagline}</p>
          <h2 className="text-2xl font-semibold mb-3 text-white">
            This quote has expired.
          </h2>
          <p className="text-sm mb-8 text-white/50 leading-relaxed">
            Please contact us for an updated quote.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <a
              href="tel:0466912786"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 transition-colors w-full max-w-[220px] justify-center"
            >
              Call 0466 912 786
            </a>
            <a
              href="mailto:hello@bellcarpets.com.au"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors w-full max-w-[220px] justify-center"
            >
              hello@bellcarpets.com.au
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Accepted state (professional thank you page) ───────────────────
  const ACCEPTED_STATUSES = ["accepted", "deposit_paid", "scheduled", "completed", "paid_in_full"];
  if (quoteData?.jobStatus && ACCEPTED_STATUSES.includes(quoteData.jobStatus)) {
    return (
      <JobStatusTracker
        quoteNumber={config.quoteNumber}
        propertyAddress={config.property.address}
        jobStatus={quoteData.jobStatus}
        scheduledDate={quoteData.scheduledDate}
        acceptedAt={quoteData.acceptedAt}
      />
    );
  }

  // ─── Description-block presence ─────────────────────────────────────
  // The flowing description block replaces the old titled "Scope of Works"
  // whenever it renders — for BOTH admin-edited descriptions AND legacy quotes
  // that fall back to a generated description. Compute once and reuse on both
  // the single-product and tiered layouts so the scope never shows twice.
  const singleDescLines = config ? getDescriptionLines(config, { tiered: false }) : [];
  const tieredDescLines = config ? getDescriptionLines(config, { tiered: true }) : [];

  // ─── Expired state ──────────────────────────────────────────────────
  const isExpired = quoteData?.expiresAt ? new Date(quoteData.expiresAt) < new Date() : false;

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-900">
        <div className="text-center max-w-sm">
          <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-8 mx-auto mb-2 opacity-30" />
          <p className="text-[9px] tracking-[0.3em] text-white/40 uppercase font-light mb-6">{QUOTE_DATA.business.tagline}</p>
          <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center bg-white/5 border border-white/10">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-white">
            Quote Expired
          </h2>
          <p className="text-sm mb-3 text-white/50">
            This quote expired on{" "}
            <span className="text-white/70 font-medium">
              {formatAESTDate(new Date(quoteData.expiresAt!), { day: "2-digit", month: "long", year: "numeric" })}
            </span>.
          </p>
          <p className="text-sm mb-6 text-white/50 leading-relaxed">
            Please contact Bell Carpets on{" "}
            <a href="tel:0466912786" className="text-white/80 font-medium hover:text-white transition-colors">0466 912 786</a>
            {" "}or{" "}
            <a href="mailto:info@bellcarpets.com.au" className="text-white/80 font-medium hover:text-white transition-colors">email us</a>
            {" "}for a fresh quote.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:0466912786"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
            >
              Call 0466 912 786
            </a>
            <a
              href="mailto:info@bellcarpets.com.au"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-transparent border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Download quote PDF button (admin preview only — hidden from customers) ───
  // Only shown when the page is opened via the admin panel's "Preview" button (?preview=1)
  // This prevents the button appearing even when an admin opens the raw quote URL
  const DownloadQuotePDF = () => {
    if (!isPreviewMode) return null;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-center"
      >
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 hover:border-white/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? "Generating PDF..." : "Download Quote as PDF"}
        </button>
      </motion.div>
    );
  };

  // ─── Preview back button (only shown when opened from CRM with ?preview=1) ─
  const PreviewBackButton = () => {
    if (!isPreviewMode) return null;
    return (
      <button
        onClick={() => window.close()}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/90 border border-white/15 text-white/80 hover:text-white hover:bg-zinc-700/90 hover:border-white/30 transition-all shadow-lg backdrop-blur-sm text-sm font-medium"
        aria-label="Close preview and return to editor"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Close Preview</span>
      </button>
    );
  };

  // ─── Shared header ──────────────────────────────────────────────────
  const Header = () => (
    <header className="pt-10 pb-2 text-center">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <img
          src={LOGO_WHITE_PNG}
          alt="Bell Carpets — Established 1987"
          className="h-12 sm:h-14 w-auto mx-auto"
        />
        <p className="text-[10px] tracking-[0.3em] mt-3 text-white/50 uppercase font-light">
          {QUOTE_DATA.business.tagline}
        </p>
      </motion.div>
    </header>
  );

  // ─── Shared greeting ────────────────────────────────────────────────
  // Determine the name shown in the "Hi {name}" greeting and "Prepared for {name}".
  //
  // For agency-style quotes (agent / real_estate / agency_single) the quote is
  // addressed to the AGENCY/CLIENT, not the individual contact person. Prefer the
  // agency name held in `config.client.name`. For real_estate quotes the agency
  // name is stored on `agentName` at create time (contact person goes to
  // agentPropertyManager), so fall back to `agentName` when client.name is empty.
  // For homeowner quotes use the client name directly.
  const isAgencyStyle =
    quoteType === "agent" || quoteType === "real_estate" || quoteType === "agency_single";
  const agencyDisplayName =
    (config.client?.name && config.client.name.trim()) ||
    quoteData?.agentName ||
    "";
  const greetingName = isAgencyStyle ? agencyDisplayName : config.client?.name;

  const Greeting = () => (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="mt-10 mb-10 max-w-lg mx-auto lg:mx-0"
    >
      <h2 className="text-2xl sm:text-3xl font-semibold leading-snug mb-5 text-white">
        {quoteType === "homeowner" ? (
          <>Hi {greetingName},{" "}<span className="text-white/40">here is your flooring quote for</span></>
        ) : (isSinglePriceAgent || isAgencySingle) ? (
          <>Hi {greetingName},{" "}<span className="text-white/40">here is your flooring quote for</span></>
        ) : (
          <>Hi {greetingName},{" "}<span className="text-white/40">here are your flooring options for</span></>
        )}
      </h2>
      <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
        <div className="flex">
          <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: CREAM, opacity: 0.5 }} />
          <div className="flex items-start gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.04]">
              <MapPin className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <p className="text-base font-medium text-white">
                {config.property.address}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-white/20" />
          <span className="text-xs text-white/30">
            Quote #{config.quoteNumber}
          </span>
        </div>
        <span className="text-xs text-white/10">|</span>
        <span className="text-xs text-white/30">
          Issued {config.issueDate}
        </span>
      </div>

      {/* Agency name — shown on agent, real_estate, and agency_single quotes */}
      {isAgencyStyle && agencyDisplayName && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-white/25">Prepared for</span>
          <span className="text-xs text-white/60 font-medium">{agencyDisplayName}</span>
        </div>
      )}
    </motion.section>
  );

  // ─── HOMEOWNER / SINGLE-PRICE AGENT / AGENCY SINGLE / SINGLE-PRICE REAL ESTATE LAYOUT ─────────────────────────
  const isRealEstateSingle = quoteType === "real_estate" && pricingMode === "single";
  if (quoteType === "homeowner" || isRealEstateSingle || isSinglePriceAgent || isAgencySingle) {
    return (
      <div className="min-h-screen bg-zinc-900">
        <PreviewBackButton />
        <div className="max-w-lg mx-auto px-5 sm:px-6">
          <Header />
          <Greeting />

          {/* Single product panel */}
          <div className="max-w-lg mx-auto">
             <HomeownerQuotePanel
              config={config}
              addons={addons}
              slug={slug}
              validUntil={validUntil}
              isInsuranceAssessment={isInsuranceAssessment}
              linkedQuoteSlug={linkedQuoteSlug}
              linkedQuoteNumber={linkedQuoteNumber}
            />
          </div>
          {/* Old titled Scope of Works is hidden whenever the flowing description
              block renders (admin-edited OR generated fallback), so the scope is
              never shown twice. Only shows if there is no description at all. */}
          {singleDescLines.length === 0 && (
            <div className="max-w-lg mx-auto">
              <ScopeOfWorks items={config.scopeOfWorks} />
            </div>
          )}
          {config.customerNotes && config.customerNotes.trim() && (
            <div className="max-w-lg mx-auto">
              <div className="rounded-xl p-5 mt-1" style={{ backgroundColor: `${CREAM}14`, border: `1px solid ${CREAM}33` }}>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: `${CREAM}CC` }}>Notes</h3>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{config.customerNotes.trim()}</p>
              </div>
            </div>
          )}
          <div className="max-w-lg mx-auto">
            {quoteType === "agent" ? <WhyBellCarpets /> : null}
          </div>
          <div className="max-w-lg mx-auto">
            <QuoteTerms terms={config.terms} validUntil={validUntil} />
          </div>
          <DownloadQuotePDF />
          <div className="max-w-lg mx-auto">
            <Footer />
          </div>
        </div>
      </div>
    );
  }  // ─── AGENT LAYOUT (3-tier) ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-900">
      <PreviewBackButton />
      <div className="max-w-lg lg:max-w-4xl mx-auto px-5 sm:px-6">
        <Header />
        <Greeting />
        <DownloadQuotePDF />

        {/* Tier selection */}
        <section id="tier-cards-section">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-white/10" />
            <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-white/50">
              Your Quote
            </h2>
            <div className="h-px flex-1 bg-white/10" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-8 max-w-lg mx-auto"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-white/40 mb-3">How to accept your quote</p>
              <ol className="space-y-2">
                {[
                  "Select your preferred carpet below",
                  "Choose your colour from the swatches",
                  "Tap Accept Quote to confirm",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-semibold text-white/40 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/60 leading-snug">{text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>

          {/* Flowing description block — scope of work shown before the tier cards.
              Admin-edited description wins; legacy quotes fall back to generated lines. */}
          {(() => {
            const descLines = tieredDescLines;
            const underlayNote = getUnderlayNote(tiers[0]?.underlay);
            if (descLines.length === 0 && !underlayNote) return null;
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="mb-8 max-w-lg mx-auto"
              >
                <div className="flex">
                  <div className="w-[3px] flex-shrink-0 rounded-full" style={{ backgroundColor: CREAM, opacity: 0.5 }} />
                  <div className="flex-1 pl-4 space-y-2">
                    {descLines.map((line, i) => (
                      <p key={i} className="text-sm text-white/70 leading-relaxed">{line}</p>
                    ))}
                    {underlayNote && (
                      <p className="text-sm text-white/50 leading-relaxed pt-1">{underlayNote}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          <div className={`space-y-4 lg:grid lg:gap-5 lg:space-y-0 lg:items-start ${tiers.length === 2 ? 'lg:grid-cols-2 max-w-3xl mx-auto' : 'lg:grid-cols-3'}`}>
            {tiers.map((tier, i) => (
              <TierCard
                key={tier.id}
                tier={tier}
                isSelected={expandedTierId === tier.id}
                selectedColourId={selections[tier.id] || null}
                onSelect={handleExpandTier}
                onSelectColour={handleSelectColour}
                onAccept={() => setAcceptModalOpen(true)}
                index={i}
              />
            ))}
          </div>
        </section>

        {/* Add-ons — shown whenever the quote has addons defined */}
        {addons.length > 0 && (
          <motion.div
            ref={addonRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-8 max-w-lg mx-auto"
          >
            <AddonSelector
              addons={addons}
              selectedAddonIds={selectedAddonIds}
              onToggleAddon={handleToggleAddon}
              baseTierPrice={selectedTier?.price ?? tiers[0]?.price ?? 0}
              tierName={selectedTier?.name ?? tiers[0]?.name ?? ""}
            />
          </motion.div>
        )}



        {tieredDescLines.length === 0 && (
          <div className="max-w-lg mx-auto">
            <ScopeOfWorks items={withUnderlayItem(config.scopeOfWorks, selectedTier?.underlay || tiers[0]?.underlay)} />
          </div>
        )}
        {config.customerNotes && config.customerNotes.trim() && (
          <div className="max-w-lg mx-auto">
            <div className="rounded-xl p-5 mt-1" style={{ backgroundColor: `${CREAM}14`, border: `1px solid ${CREAM}33` }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: `${CREAM}CC` }}>Notes</h3>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{config.customerNotes.trim()}</p>
            </div>
          </div>
        )}
        <div className="max-w-lg mx-auto">
          <WhyBellCarpets />
        </div>
        <div className="max-w-lg mx-auto">
          <QuoteTerms terms={config.terms} validUntil={validUntil} />
        </div>
        <div className="max-w-lg mx-auto">
          <Footer />
        </div>
      </div>

      {/* Accept Modal */}
      <AcceptModal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        tierName={selectedTier?.name ?? ""}
        productName={selectedTier?.productName ?? ""}
        manufacturer={selectedTier?.manufacturer ?? ""}
        colourName={selectedColourObj?.name ?? ""}
        colourCode={selectedColourObj?.code}
        basePrice={selectedTier?.price ?? 0}
        grandTotal={(selectedTier?.price ?? 0) + selectedAddons.reduce((s, a) => s + a.price, 0)}
        quoteNumber={config.quoteNumber}
        propertyAddress={config.property.address}
        clientName={agencyDisplayName || config.client?.name || ""}
        slug={slug}
        selectedAddons={selectedAddons}
        quoteType={quoteType}
        depositPercent={config.depositPercent ?? 50}
        initialName={quoteData?.agentPropertyManager || quoteData?.agentName || ""}
        initialEmail={quoteData?.agentEmail || ""}
        initialPhone={quoteData?.agentPhone || ""}
      />
    </div>
  );
}
