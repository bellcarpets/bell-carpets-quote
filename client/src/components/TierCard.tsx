/**
 * TierCard — Flat select card with inline colour picker
 * Step 1: Select tier (card highlights)
 * Step 2: Pick colour (swatches appear inline)
 * Tap magnify icon on any swatch to open swatch lightbox
 * "View product specs" link opens specs lightbox
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield, Leaf, Award, ZoomIn, X, FileText, ExternalLink } from "lucide-react";
import type { Tier, ColourOption } from "@/lib/quoteData";

// ── Product Specs Data ──────────────────────────────────────────────────────

interface SpecItem {
  label: string;
  value: string;
}

const ENFORCER_SPECS: SpecItem[] = [
  { label: "Type", value: "Polypropylene Carpet" },
  { label: "Style", value: "Textured Loop Pile" },
  { label: "Yarn", value: "100% Polypropylene" },
  { label: "Pile Height", value: "5 (±1.0) mm" },
  { label: "Total Thickness", value: "7 (±1.0) mm" },
  { label: "Gauge", value: "25.2/10cm (5/32nd Gauge)" },
  { label: "Pattern Repeat", value: "2.5cm (w) × 2.5cm (l)" },
  { label: "Roll Width", value: "4.00m" },
  { label: "Secondary Backing", value: "Synthetic" },
  { label: "Installation", value: "Conventionally Laid" },
  { label: "Country of Origin", value: "Australia" },
  { label: "Warranty", value: "10 Year Standard Limited Residential Warranty" },
  { label: "Accreditation", value: "ISO 9001, ISO 14001, ISO 45001" },
];

const LEMAR_TWIST_SPECS: SpecItem[] = [
  { label: "Style", value: "Cut Pile Twist" },
  { label: "Pile Content", value: "100% SDN (Solution Dyed Nylon)" },
  { label: "Pile Weight", value: "884 gm/m² — 26 oz/yd²" },
  { label: "Pile Height", value: "7.5mm" },
  { label: "Carpet Thickness", value: "9mm" },
  { label: "Machine Gauge", value: "3.175mm — 1/8\"" },
  { label: "Width", value: "3.66 metres" },
  { label: "Primary Back", value: "Heat Stabilised Woven Polypropylene" },
  { label: "Secondary Back", value: "Synthetic Don Bac" },
  { label: "Grading", value: "Residential Extra Heavy Duty & Stairs / Contract Medium Duty & Stairs" },
  { label: "Environmental", value: "Certified under ACCS Environmental Classification Scheme" },
  { label: "VOC Emissions", value: "Meets ACCS Environmental Classification Criteria" },
  { label: "Warranty", value: "15 Year Limited Residential Wear Warranty" },
  { label: "Installation", value: "To be laid in accordance with AS/NZS 2455.1:2007" },
  { label: "Country of Manufacture", value: "Australia" },
];

function getSpecsForProduct(productName: string): SpecItem[] | null {
  const name = productName.toLowerCase();
  if (name.includes("enforcer")) return ENFORCER_SPECS;
  if (name.includes("lemar") || name.includes("antico")) return LEMAR_TWIST_SPECS;
  return null;
}

// ── Specs Lightbox ──────────────────────────────────────────────────────────

interface SpecsLightboxProps {
  productName: string;
  manufacturer: string;
  specs: SpecItem[];
  onClose: () => void;
}

function SpecsLightbox({ productName, manufacturer, specs, onClose }: SpecsLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      key="specs-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      <motion.div
        key="specs-panel"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl bg-zinc-900 border border-white/15 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
          <div>
            <p className="text-white font-semibold text-base leading-tight">{productName}</p>
            <p className="text-white/40 text-xs mt-0.5">{manufacturer} — Product Specifications</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Specs table */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="space-y-0">
            {specs.map((spec, i) => (
              <div
                key={spec.label}
                className={`flex gap-3 py-2.5 ${i < specs.length - 1 ? "border-b border-white/[0.06]" : ""}`}
              >
                <span className="text-white/40 text-xs font-medium w-28 sm:w-32 flex-shrink-0 pt-0.5">
                  {spec.label}
                </span>
                <span className="text-white/80 text-sm leading-snug">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex-shrink-0">
          <p className="text-white/25 text-[10px] text-center">Tap outside to close</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Swatch Lightbox ─────────────────────────────────────────────────────────

interface LightboxProps {
  colour: ColourOption;
  onClose: () => void;
}

function SwatchLightbox({ colour, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      key="lightbox-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.90)" }}
      onClick={onClose}
    >
      <motion.div
        key="lightbox-panel"
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15">
          <img
            src={colour.swatchImage}
            alt={`${colour.name} carpet swatch`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        <div className="text-center">
          <p className="text-white text-lg font-semibold leading-tight">{colour.name}</p>
          {colour.code && (
            <p className="text-white/50 text-sm mt-0.5">Code {colour.code}</p>
          )}
        </div>

        <p className="text-white/30 text-xs">Tap outside to close</p>
      </motion.div>
    </motion.div>
  );
}

// ── TierCard ────────────────────────────────────────────────────────────────

interface TierCardProps {
  tier: Tier;
  isSelected: boolean;
  selectedColourId: string | null;
  onSelect: (tierId: string) => void;
  onSelectColour: (tierId: string, colourId: string) => void;
  onAccept?: () => void;
  index: number;
}

export default function TierCard({
  tier,
  isSelected,
  selectedColourId,
  onSelect,
  onSelectColour,
  onAccept,
  index,
}: TierCardProps) {
  const selectedColour = tier.colours.find((c) => c.id === selectedColourId);
  const [lightboxColour, setLightboxColour] = useState<ColourOption | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);

  const specs = getSpecsForProduct(tier.productName);

  const openLightbox = useCallback((colour: ColourOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxColour(colour);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxColour(null);
  }, []);

  return (
    <>
      {/* Swatch Lightbox */}
      <AnimatePresence>
        {lightboxColour && (
          <SwatchLightbox colour={lightboxColour} onClose={closeLightbox} />
        )}
      </AnimatePresence>

      {/* Specs Lightbox */}
      <AnimatePresence>
        {showSpecs && specs && (
          <SpecsLightbox
            productName={tier.productName}
            manufacturer={tier.manufacturer}
            specs={specs}
            onClose={() => setShowSpecs(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 * index, ease: "easeOut" }}
        className="relative w-full"
      >
        <div
          className={`
            relative w-full rounded-2xl overflow-hidden
            transition-all duration-500 ease-out
            bg-zinc-900 border
            ${
              isSelected
                ? "border-white/40 shadow-[0_0_32px_-4px_rgba(255,255,255,0.12)] ring-1 ring-white/20"
                : "border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl"
            }
          `}
        >
          {/* ── Clickable header — selects this tier ── */}
          <button
            onClick={() => onSelect(tier.id)}
            className="relative w-full text-left group"
          >
            {/* Top row: label + selection indicator */}
            <div className="relative px-5 pt-5 pb-1 flex items-start justify-between gap-3">
              <div className="px-3 py-1 rounded-full text-xs font-semibold tracking-[0.15em] uppercase bg-white/[0.07] text-white/70 border border-white/15">
                {tier.label}
              </div>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isSelected
                    ? "bg-white text-black scale-110"
                    : "bg-white/[0.07] text-white/30 border border-white/10"
                }`}
              >
                {isSelected ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-[10px] font-bold">{index + 1}</span>
                )}
              </div>
            </div>

            {/* Product info + price */}
            <div className="relative px-5 pb-5 pt-3 bg-zinc-900">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs tracking-wide mb-0.5 truncate text-white/40">
                    {tier.manufacturer}
                  </p>
                  <p className="text-lg font-medium leading-tight text-white">
                    {tier.productName}
                  </p>
                  {selectedColour && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-4 h-4 rounded-full border border-white/20 overflow-hidden flex-shrink-0">
                        <img
                          src={selectedColour.swatchImage}
                          alt={selectedColour.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-white/50">
                        {selectedColour.name}
                      </span>
                      <Check className="w-3 h-3 text-white/60" />
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                      ${Math.round(tier.price).toLocaleString("en-AU")}
                    </span>
                  </div>
                  <span className="text-[11px] text-white/40 block -mt-0.5">
                    inc GST
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* ── Expandable section: product details + colour swatches ── */}
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden bg-zinc-900"
              >
                <div className="relative px-5 pb-6">
                  <div className="h-px w-full mb-4 bg-white/10" />

                  {/* Fibre & pile info */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-white/30">Fibre</span>
                      <p className="text-sm text-white/70">{tier.fibre}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-white/30">Style</span>
                      <p className="text-sm text-white/70">{tier.pileType}</p>
                    </div>

                    {tier.colourName && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Colour</span>
                        <p className="text-sm text-white/70">{tier.colourName}</p>
                      </div>
                    )}
                  </div>

                  {/* View product specs link */}
                  {specs && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpecs(true);
                      }}
                      className="inline-flex items-center gap-1.5 mb-2 text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-white/50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View product specs
                    </button>
                  )}

                  {/* View colours link to product page */}
                  {tier.productUrl && (
                    <a
                      href={tier.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 mb-4 text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-white/50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View colours
                    </a>
                  )}

                  {/* Badges */}
                  {tier.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tier.badges.map((badge) => (
                        <div
                          key={badge}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-wide uppercase bg-white/[0.06] text-white/60 border border-white/10"
                        >
                          {badge.toLowerCase().includes("warranty") ? (
                            <Shield className="w-3 h-3" />
                          ) : badge.toLowerCase().includes("red list") ? (
                            <Leaf className="w-3 h-3" />
                          ) : (
                            <Award className="w-3 h-3" />
                          )}
                          {badge}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 2 — Colour selection */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                      <p className="text-xs uppercase tracking-[0.15em] text-white/60 font-medium">Pick your colour</p>
                    </div>
                    <p className="text-[11px] text-white/30 ml-7">
                      Tap to select · tap{" "}
                      <ZoomIn className="inline w-3 h-3 mb-0.5" /> to enlarge
                    </p>
                  </div>

                  {/* Colour swatches */}
                  <div className="grid grid-cols-5 gap-2.5 sm:gap-3 mb-4">
                    {tier.colours.map((colour) => {
                      const isChosen = selectedColourId === colour.id;
                      return (
                        <div key={colour.id} className="flex flex-col items-center gap-1.5">
                          <div className="relative">
                            {/* Main swatch — selects colour */}
                            <button
                              onClick={() => onSelectColour(tier.id, colour.id)}
                              className="group/swatch block"
                              aria-label={`Select ${colour.name}`}
                            >
                              <div
                                className={`
                                  w-13 h-13 sm:w-15 sm:h-15 rounded-full overflow-hidden
                                  transition-all duration-300
                                  ${isChosen
                                    ? "scale-110 ring-2 ring-white/70 ring-offset-2 ring-offset-zinc-900"
                                    : "ring-1 ring-white/10 hover:scale-105 hover:ring-white/25"
                                  }
                                `}
                              >
                                <img
                                  src={colour.swatchImage}
                                  alt={colour.name}
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                {isChosen && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.25, ease: "backOut" }}
                                    className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50"
                                  >
                                    <Check className="w-5 h-5 text-white drop-shadow-md" strokeWidth={3} />
                                  </motion.div>
                                )}
                              </div>
                            </button>

                            {/* Magnify button — opens lightbox */}
                            <button
                              onClick={(e) => openLightbox(colour, e)}
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                              aria-label={`Enlarge ${colour.name} swatch`}
                            >
                              <ZoomIn className="w-2.5 h-2.5 text-white/60" />
                            </button>
                          </div>

                          <div className="text-center">
                            {colour.code && (
                              <p className={`text-[9px] leading-none ${isChosen ? "text-white/70" : "text-white/25"}`}>
                                {colour.code}
                              </p>
                            )}
                            <p
                              className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 transition-colors duration-200 ${
                                isChosen ? "font-medium text-white" : "text-white/45"
                              }`}
                            >
                              {colour.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Accept button — appears immediately after colour is selected */}
                  {selectedColour && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="mt-5"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAccept?.();
                        }}
                        className="w-full py-4 rounded-xl text-sm font-semibold tracking-[0.12em] uppercase bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.98] transition-all duration-200 shadow-lg"
                      >
                        Accept Quote
                      </button>
                      <p className="mt-2 text-center text-[10px] text-white/30">
                        {tier.name} — {selectedColour.name}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
