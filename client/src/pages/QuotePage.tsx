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

import { LOGO_PNG } from "@/lib/logo";
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
};

/** Map underlay option to a compact scope item for display in the Scope of Works list */
const UNDERLAY_SCOPE_ITEMS: Record<NonNullable<Exclude<UnderlayOption, "">>, { title: string; description: string }> = {
  "Dunlop Springtred Protect": {
    title: "Underlay",
    description: "Supply and installation of new Dunlop Springtred Protect underlay (10mm, 80 kg/m\u00b3)",
  },
  "Dunlop Springtred Ultimate": {
    title: "Underlay",
    description: "Supply and installation of new Dunlop Springtred Ultimate underlay (10mm, 120 kg/m\u00b3)",
  },
  "Dunlop Eureka": {
    title: "Underlay",
    description: "Supply and installation of new Dunlop Eureka underlay (10mm, 80 kg/m\u00b3)",
  },
};

/** Builds the full scope list: areas line first, then underlay, then work items */
function buildScopeItems(
  items: { title: string; description: string }[],
  underlay?: UnderlayOption,
  areas?: string
): { title: string; description: string }[] {
  const result: { title: string; description: string }[] = [];
  // First item: carpet supply line with areas
  // The areas field already contains the full description like "Supply and Installation of new carpets to 3 bedrooms, hallway, stairs and robes."
  // If it starts with "Supply" it's already a full line, otherwise prepend
  if (areas && areas.trim()) {
    const areaText = areas.trim();
    const isFullLine = areaText.toLowerCase().startsWith("supply");
    result.push({
      title: "Carpet",
      description: isFullLine ? areaText : `Supply and installation of new carpet to ${areaText}`,
    });
  }
  // Second item: underlay with full product detail
  // Skip if items already contain an underlay line
  const hasUnderlayInItems = items.some(item => item.title.toLowerCase().includes("underlay"));
  if (underlay && !hasUnderlayInItems) {
    const underlayItem = UNDERLAY_SCOPE_ITEMS[underlay as keyof typeof UNDERLAY_SCOPE_ITEMS];
    if (underlayItem) {
      result.push(underlayItem);
    } else {
      result.push({
        title: "Underlay",
        description: `Supply and installation of new ${underlay} underlay`,
      });
    }
  }
  // Remaining work items with full descriptions
  result.push(...items);
  return result;
}

// Keep old function signature for backward compat
function withUnderlayItem(
  items: { title: string; description: string }[],
  underlay?: UnderlayOption
): { title: string; description: string }[] {
  return buildScopeItems(items, underlay);
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
      const byteCharacters = atob(result.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.quoteNumber}-Quote.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Quote] PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  // Get tiers from config (tiered quotes only, regardless of quote type)
  const tiers = useMemo(() => {
    if (!config || pricingMode === "single") return [];
    return (config.tiers || []).map((t) => ({
      ...t,
      priceFormatted: formatPrice(t.price),
      deposit: formatPrice(Math.round(t.price * ((config.depositPercent ?? 50) / 100) * 100) / 100),
      colours: t.colours as ColourOption[],
    }));
  }, [config, quoteType, pricingMode]);

  // Map DB config addons
  const addons = useMemo(() => {
    if (!config) return [];
    return (config.addons || []).map((a) => ({
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <motion.img
            src={LOGO_PNG}
            alt="Bell Carpets"
            className="h-10 mx-auto mb-2"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-zinc-300"
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-4 tracking-wide">Loading your quote...</p>
        </motion.div>
      </div>
    );
  }

  // ─── Error / not found state ────────────────────────────────────────
  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="text-center max-w-sm">
          <img src={LOGO_PNG} alt="Bell Carpets" className="h-8 mx-auto mb-2 opacity-40" />

          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-zinc-300" />
          <h2 className="text-xl font-semibold mb-2 text-zinc-900">
            Quote Not Found
          </h2>
          <p className="text-sm mb-6 text-zinc-500">
            This quote link may have expired or is invalid. Please contact Bell Carpets for assistance.
          </p>
          <a
            href="tel:0755711177"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="text-center max-w-sm">
          <img src={LOGO_PNG} alt="Bell Carpets" className="h-10 mx-auto mb-2 opacity-60" />

          <h2 className="text-2xl font-semibold mb-3 text-zinc-900">
            This quote has expired.
          </h2>
          <p className="text-sm mb-8 text-zinc-500 leading-relaxed">
            Please contact us for an updated quote.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <a
              href="tel:0466912786"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors w-full max-w-[220px] justify-center"
            >
              Call 0466 912 786
            </a>
            <a
              href="mailto:hello@bellcarpets.com.au"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 transition-colors w-full max-w-[220px] justify-center"
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
        propertyAddress={config.property?.address ?? ""}
        jobStatus={quoteData.jobStatus}
        scheduledDate={quoteData.scheduledDate}
        acceptedAt={quoteData.acceptedAt}
      />
    );
  }

  // ─── Expired state ──────────────────────────────────────────────────
  const isExpired = quoteData?.expiresAt ? new Date(quoteData.expiresAt) < new Date() : false;

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="text-center max-w-sm">
          <img src={LOGO_PNG} alt="Bell Carpets" className="h-8 mx-auto mb-2 opacity-40" />

          <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center bg-zinc-50 border border-zinc-200">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-zinc-900">
            Quote Expired
          </h2>
          <p className="text-sm mb-3 text-zinc-500">
            This quote expired on{" "}
            <span className="text-zinc-700 font-medium">
              {formatAESTDate(new Date(quoteData.expiresAt!), { day: "2-digit", month: "long", year: "numeric" })}
            </span>.
          </p>
          <p className="text-sm mb-6 text-zinc-500 leading-relaxed">
            Please contact Bell Carpets on{" "}
            <a href="tel:0466912786" className="text-zinc-800 font-medium hover:text-zinc-900 transition-colors">0466 912 786</a>
            {" "}or{" "}
            <a href="mailto:info@bellcarpets.com.au" className="text-zinc-800 font-medium hover:text-zinc-900 transition-colors">email us</a>
            {" "}for a fresh quote.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:0466912786"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
            >
              Call 0466 912 786
            </a>
            <a
              href="mailto:info@bellcarpets.com.au"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-transparent border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
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
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
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
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-md text-sm font-medium"
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
          src={LOGO_PNG}
          alt="Bell Carpets — Established 1987"
          className="h-12 sm:h-14 w-auto mx-auto"
        />
      </motion.div>
    </header>
  );

  // ─── Shared greeting ────────────────────────────────────────────────
  // For agent/real_estate/agency_single quotes: use agency name. For homeowner: use client name.
  const greetingName = (quoteType === "agent" || quoteType === "real_estate" || quoteType === "agency_single") ? quoteData?.agentName : config.client?.name;

  const Greeting = () => (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="mt-10 mb-10 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl sm:text-3xl font-semibold leading-snug mb-5 text-zinc-900">
        {greetingName ? (
          quoteType === "homeowner" || isSinglePriceAgent || isAgencySingle ? (
            <>Hi {greetingName},{" "}<span className="text-zinc-400">here is your flooring quote for</span></>
          ) : (
            <>Hi {greetingName},{" "}<span className="text-zinc-400">here are your flooring options for</span></>
          )
        ) : (
          <span className="text-zinc-400">Your flooring {quoteType === "homeowner" || isSinglePriceAgent || isAgencySingle ? "quote" : "options"} for</span>
        )}
      </h2>
      <div className="rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
        <div className="flex">
          <div className="w-[3px] flex-shrink-0 bg-gradient-to-b from-amber-500/80 via-amber-400/60 to-amber-400/30" />
          <div className="flex items-start gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-zinc-100">
              <MapPin className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-base font-medium text-zinc-900">
                {config.property?.address ?? ""}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-zinc-300" />
          <span className="text-xs text-zinc-400">
            Quote #{config.quoteNumber}
          </span>
        </div>
        <span className="text-xs text-zinc-200">|</span>
        <span className="text-xs text-zinc-400">
          Issued {config.issueDate}
        </span>
      </div>

      {/* Agency name — shown on agent, real_estate, and agency_single quotes */}
      {(quoteType === "agent" || quoteType === "real_estate" || quoteType === "agency_single") && quoteData?.agentName && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-zinc-400">Prepared for</span>
          <span className="text-xs text-zinc-600 font-medium">{quoteData.agentName}</span>
        </div>
      )}
    </motion.section>
  );

  // ─── HOMEOWNER / SINGLE-PRICE AGENT / AGENCY SINGLE / SINGLE-PRICE REAL ESTATE LAYOUT ─────────────────────────
  const isRealEstateSingle = quoteType === "real_estate" && pricingMode === "single";
  if (quoteType === "homeowner" || isRealEstateSingle || isSinglePriceAgent || isAgencySingle) {
    return (
      <div className="min-h-screen bg-white">
        <PreviewBackButton />
        <div className="max-w-2xl mx-auto px-5 sm:px-6">
          <Header />
          <Greeting />

          {/* Single product panel */}
          <div className="max-w-2xl mx-auto">
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
          <div className="max-w-2xl mx-auto">
            <ScopeOfWorks items={buildScopeItems(config.scopeOfWorks || [], config.product?.underlay, config.scope)} />
          </div>
          {config.customerNotes && config.customerNotes.trim() && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-1">
                <h3 className="text-amber-700 text-xs font-semibold uppercase tracking-widest mb-2">Notes</h3>
                <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap">{config.customerNotes.trim()}</p>
              </div>
            </div>
          )}
          <div className="max-w-2xl mx-auto">
            {quoteType === "agent" ? <WhyBellCarpets /> : null}
          </div>
          <div className="max-w-2xl mx-auto">
            <QuoteTerms terms={config.terms || []} validUntil={validUntil} />
          </div>
          <DownloadQuotePDF />
          <div className="max-w-2xl mx-auto">
            <Footer />
          </div>
        </div>
      </div>
    );
  }  // ─── AGENT LAYOUT (3-tier) ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <PreviewBackButton />
      <div className="max-w-lg lg:max-w-4xl mx-auto px-5 sm:px-6">
        <Header />
        <Greeting />
        <DownloadQuotePDF />

        {/* Tier selection */}
        <section id="tier-cards-section">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-zinc-200" />
            <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-zinc-400">
              Your Quote
            </h2>
            <div className="h-px flex-1 bg-zinc-200" />
          </motion.div>

          <div className={`space-y-4 lg:grid lg:gap-5 lg:space-y-0 lg:items-stretch ${tiers.length === 2 ? 'lg:grid-cols-2 max-w-3xl mx-auto' : 'lg:grid-cols-3'}`}>
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
            className="mt-8 max-w-2xl mx-auto"
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



        <div className="max-w-2xl mx-auto">
          <ScopeOfWorks items={buildScopeItems(config.scopeOfWorks || [], selectedTier?.underlay || tiers[0]?.underlay, config.scope)} />
        </div>
        {config.customerNotes && config.customerNotes.trim() && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-1">
              <h3 className="text-amber-700 text-xs font-semibold uppercase tracking-widest mb-2">Notes</h3>
              <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap">{config.customerNotes.trim()}</p>
            </div>
          </div>
        )}
        <div className="max-w-2xl mx-auto">
          <WhyBellCarpets />
        </div>
        <div className="max-w-2xl mx-auto">
          <QuoteTerms terms={config.terms || []} validUntil={validUntil} />
        </div>
        <div className="max-w-2xl mx-auto">
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
        propertyAddress={config.property?.address ?? ""}
        clientName={quoteData?.agentName ?? config.client?.name ?? ""}
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
