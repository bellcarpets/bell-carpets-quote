/**
 * HomeownerQuotePanel — Single-product quote panel for homeowner quotes
 * Clean black & white premium design
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ExternalLink, ArrowRight, User, Mail, Phone, Loader2, AlertCircle, CreditCard, Calendar, Download, Layers, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { QuoteConfigData } from "../../../shared/quoteConfigTypes";
import { usesAgentPaymentTerms } from "../../../shared/quoteConfigTypes";

import { LOGO_WHITE_PNG } from "@/lib/logo";

interface Addon {
  id: string;
  title: string;
  description: string;
  price: number;
  priceFormatted: string;
}

interface HomeownerQuotePanelProps {
  config: QuoteConfigData;
  addons: Addon[];
  slug: string;
  validUntil: string;
  isInsuranceAssessment?: boolean;
  linkedQuoteSlug?: string | null;
  linkedQuoteNumber?: string | null;
}

const formatPrice = (n: number) =>
  "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });

export default function HomeownerQuotePanel({ config, addons, slug, validUntil, isInsuranceAssessment, linkedQuoteSlug, linkedQuoteNumber }: HomeownerQuotePanelProps) {
  const product = config.product;
  const [selectedColourId, setSelectedColourId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<"form" | "submitting" | "success" | "error">("form" as "form" | "submitting" | "success" | "error");
  const [agentName, setAgentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentNotes, setAgentNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const acceptMutation = trpc.quote.accept.useMutation();
  const markAcceptedMutation = trpc.admin.markAccepted.useMutation();
  const generateInvoiceMutation = trpc.invoice.generate.useMutation();
  const downloadPdfMutation = trpc.invoice.downloadQuotePdf.useMutation();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!product) return;
    setDownloading(true);
    try {
      const result = await downloadPdfMutation.mutateAsync({
        quoteSlug: slug,
        tierName: "Homeowner",
        productName: product.productName,
        manufacturer: product.manufacturer ?? "",
        fibre: product.fibre ?? "",
        pileType: product.pileType ?? "",
        colourName: selectedColour?.name ?? product.colourName ?? "Not specified",
        colourCode: selectedColour?.code,
        basePrice: product.price,
        addons: selectedAddons.map((a) => ({ title: a.title, price: a.price })),
        grandTotal,
        rooms: hasRooms ? config.rooms : undefined,
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

  if (!product) {
    return (
      <div className="rounded-xl p-6 text-center bg-white/[0.02] border border-white/10">
        <p className="text-sm text-white/40">
          Product details not configured. Please contact Bell Carpets.
        </p>
      </div>
    );
  }

  const selectedColour = (product.colours as Array<{ id: string; name: string; code?: string; swatchImage?: string; swatchColor?: string }>)?.find((c) => c.id === selectedColourId) ?? null;
  const selectedAddons = addons.filter((a) => selectedAddonIds.includes(a.id));
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  
  // Calculate grand total from rooms if they exist, otherwise from product
  const hasRooms = (config.rooms?.length ?? 0) > 0;
  const roomsTotal = hasRooms ? (config.rooms?.reduce((sum, r) => sum + r.price, 0) ?? 0) : 0;
  const baseTotal = hasRooms ? roomsTotal : product.price;
  const grandTotal = baseTotal + addonsTotal;
  
  const depositPercent = config.depositPercent ?? 50;
  const deposit = Math.round(grandTotal * (depositPercent / 100) * 100) / 100;
  const balance = grandTotal - deposit;

  const handleToggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!agentName.trim()) errors.name = "Please enter your name";
    if (!agentEmail.trim()) errors.email = "Please enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail)) errors.email = "Please enter a valid email";
    if (!agentPhone.trim()) errors.phone = "Please enter your phone number";
    else if (agentPhone.replace(/\D/g, "").length < 8) errors.phone = "Please enter a valid phone number";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setStep("submitting");
    setErrorMessage("");
    try {
      await acceptMutation.mutateAsync({
        quoteNumber: config.quoteNumber,
        propertyAddress: config.property.address,
        clientName: config.client.name,
        tierName: "Homeowner",
        productName: product.productName,
        manufacturer: product.manufacturer ?? "",
        colourName: selectedColour?.name ?? product.colourName ?? "Not specified",
        colourCode: selectedColour?.code,
        basePrice: product.price,
        addons: selectedAddons.map((a) => ({ id: a.id, title: a.title, price: a.price })),
        grandTotal,
        agentName: agentName.trim(),
        agentEmail: agentEmail.trim(),
        agentPhone: agentPhone.trim(),
        agentNotes: agentNotes.trim(),
        rooms: hasRooms ? config.rooms : undefined,
      });
      await markAcceptedMutation.mutateAsync({
        slug,
        agentName: agentName.trim(),
        agentEmail: agentEmail.trim(),
        agentPhone: agentPhone.trim(),
        agentNotes: agentNotes.trim(),
        tierName: "Homeowner",
        colourName: selectedColour?.name ?? product.colourName ?? "Not specified",
        totalPrice: grandTotal,
        rooms: hasRooms ? config.rooms : undefined,
      });

      // Invoice is now auto-generated when job status moves to "completed"

      setStep("success");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Something went wrong. Please try again or call us directly.";
      setErrorMessage(msg);
      setStep("error");
    }
  };

  // ─── Success state ───
  if (step === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl p-8 text-center mt-8 bg-zinc-900 border border-white/10 shadow-sm"
      >
        <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-8 mx-auto mb-6 opacity-40" />
        <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center bg-white">
          <Check className="w-7 h-7 text-zinc-900" />
        </div>
        <h3 className="text-2xl mb-2 text-white">
          Thank You
        </h3>
        <p className="text-sm mb-6 text-white/50">
          Thank you, {agentName}. Bell Carpets has been notified and will be in touch shortly to confirm your booking.
        </p>
        <div className="rounded-xl p-4 text-left space-y-2 bg-white/[0.02] border border-white/10">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Product</span>
            <span className="text-white">{product.productName}</span>
          </div>
          {selectedColour && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Colour</span>
              <span className="text-white">{selectedColour.name}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-1 border-t border-white/10">
            <span className="text-white/50">GST (10%)</span>
            <span className="text-white/60">{formatPrice(Math.round(grandTotal / 11))}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-1">
            <span className="text-white/70">Total (inc GST)</span>
            <span className="text-white">{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5 mt-2">
      {/* Section heading */}
      <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-white/35 mb-4 mt-2">
        Selected Products
      </h2>

      {/* ─── Product card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-sm"
      >
        {/* Hero image */}
        {(product as { heroImage?: string }).heroImage && (
          <div className="relative h-44 overflow-hidden">
            <img src={(product as { heroImage?: string }).heroImage} alt={product.productName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
          </div>
        )}

        <div className="p-0">
          {/* ── CARPET SECTION ── */}
          <div className="relative flex">
            {/* Gold accent bar */}
            <div className="w-[3px] flex-shrink-0 rounded-l-2xl bg-gradient-to-b from-amber-400/60 via-amber-300/40 to-amber-400/20" />

            <div className="flex-1 px-6 py-6">
              {/* Manufacturer */}
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/35 mb-1">
                {product.manufacturer}
              </p>
              {/* Product name */}
              <h3 className="text-2xl font-semibold text-white leading-tight mb-4">
                {product.productName}
              </h3>

              {/* Spec rows */}
              <div className="space-y-2.5">
                {product.fibre && (
                  <div className="flex items-baseline gap-3">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-white/35 w-14 flex-shrink-0">Fibre</span>
                    <span className="text-sm text-white/80">{product.fibre}</span>
                  </div>
                )}
                {product.colourName && (
                  <div className="flex items-baseline gap-3">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-white/35 w-14 flex-shrink-0">Colour</span>
                    <span className={`text-sm ${product.colourName === "To be selected" ? "text-white/40 italic" : "text-white/80"}`}>
                      {product.colourName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── UNDERLAY SECTION ── */}
          {config.product?.underlay && (() => {
            const underlaySpecs: Record<string, { name: string; specs: string }> = {
                "Dunlop Springtred Protect": { name: "Dunlop Springtred Protect", specs: "10mm · 80 kg/m³" },
              "Dunlop Springtred Ultimate": { name: "Dunlop Springtred Ultimate", specs: "10mm · 120 kg/m³" },
              "Dunlop Springtred Extra": { name: "Dunlop Springtred Extra", specs: "95 kg/m³" },
              "Dunlop Eureka": { name: "Dunlop Eureka", specs: "10mm · 80 kg/m³" },
            };
            const u = underlaySpecs[config.product!.underlay!];
            if (!u) return null;
            return (
              <>
                <div className="mx-6 h-px bg-white/[0.06]" />
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-3 h-3 text-white/25" />
                    <span className="text-[10px] tracking-[0.2em] uppercase text-white/35">Underlay</span>
                  </div>
                  <p className="text-sm font-medium text-white/80 leading-tight">{u.name}</p>
                  <p className="text-xs text-white/35 mt-1 tracking-wide">{u.specs}</p>
                </div>
              </>
            );
          })()}

          {/* Colour selector */}
          {product.colours && product.colours.length > 0 && (
            <div className="px-6 pb-5">
              <p className="text-xs tracking-widest uppercase mb-3 text-white/40">
                Select Colour
              </p>
              <div className="flex flex-wrap gap-3">
                {product.colours.map((colour) => {
                  const isSelected = selectedColourId === colour.id;
                  return (
                    <button
                      key={colour.id}
                      onClick={() => setSelectedColourId(colour.id)}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all duration-200 ${
                          isSelected ? "ring-2 ring-black ring-offset-2" : "ring-1 ring-white/10"
                        }`}
                      >
                        {colour.swatchImage ? (
                          <img src={colour.swatchImage} alt={colour.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full" style={{ background: (colour as { swatchColor?: string }).swatchColor || "#888" }} />
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] text-center max-w-[56px] leading-tight ${isSelected ? "text-white font-medium" : "text-white/50"}`}>
                        {colour.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product URL link */}
          {product.productUrl && (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full rounded-xl px-4 py-3 mx-6 mt-2 mb-5 transition-all duration-200 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06]" style={{width: 'calc(100% - 3rem)'}}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0 text-white/50" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70">
                  View full colour range
                </p>
                <p className="text-xs mt-0.5 text-white/40">
                  Browse larger, more accurate colour samples on the manufacturer's site
                </p>
              </div>
            </a>
          )}
        </div>
      </motion.div>

      {/* ─── Add-ons ─── */}
      {addons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-white/35 mb-4">
            Additional Services
          </h2>
          <div className="space-y-3">
            {addons.map((addon) => {
              const isSelected = selectedAddonIds.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon.id)}
                  className={`w-full rounded-xl p-4 text-left transition-all duration-200 border ${
                    isSelected ? "bg-white/[0.03] border-white/20" : "bg-zinc-900 border-white/10 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/70"}`}>
                        {addon.title}
                      </p>
                      <p className="text-xs mt-0.5 text-white/40">
                        {addon.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-white/50"}`}>
                        +{addon.priceFormatted}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          isSelected ? "bg-white" : "border-2 border-white/20"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-zinc-900" />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Accept section ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/10"
      >
        {/* Gold accent bar — matches product card */}
        <div className="flex">
          <div className="w-[3px] flex-shrink-0 bg-gradient-to-b from-amber-400/60 via-amber-300/40 to-amber-400/20" />
          <div className="flex-1 p-5">

        {/* Price summary */}
        <div className="mb-5 space-y-2">
          {hasRooms ? (
            <>
              <p className="text-xs tracking-widest uppercase text-white/40 mb-2">Room Breakdown</p>
              {config.rooms?.map((room) => (
                <div key={room.id} className="flex justify-between text-sm">
                  <span className="text-white/50">{room.name}</span>
                  <span className="text-white">{formatPrice(room.price)}</span>
                </div>
              ))}
              <div className="h-px mt-2 bg-white/10" />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-white/50">Subtotal (rooms)</span>
                <span className="text-white">{formatPrice(roomsTotal)}</span>
              </div>
            </>
          ) : null}
          {selectedAddons.map((a) => (
            <div key={a.id} className="flex justify-between text-sm">
              <span className="text-white/50">{a.title}</span>
              <span className="text-white">+{formatPrice(a.price)}</span>
            </div>
          ))}
          {(hasRooms || selectedAddons.length > 0) && <div className="h-px mt-2 bg-white/10" />}
          {/* Total — dominant statement FIRST */}
          <div className="flex justify-between items-baseline pb-1">
            <span className="text-sm text-white/60">Total (inc GST)</span>
            <span className="text-3xl font-bold text-white tracking-tight">{formatPrice(grandTotal)}</span>
          </div>
          <div className="h-px mb-1 bg-white/[0.06]" />
          <div className="flex justify-between text-xs text-white/40">
            <span>GST (10%)</span>
            <span>{formatPrice(Math.round(grandTotal / 11))}</span>
          </div>
          {!usesAgentPaymentTerms(config.quoteType) && (
            <>
              <div className="h-px mt-1 mb-1 bg-white/[0.06]" />
              <div className="flex justify-between text-xs">
                <span className="text-white/30">
                  <CreditCard className="w-3 h-3 inline mr-1.5 opacity-60" />
                  {depositPercent}% deposit to secure
                </span>
                <span className="text-white/40">{formatPrice(deposit)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/30">
                  <Calendar className="w-3 h-3 inline mr-1.5 opacity-60" />
                  Balance on completion
                </span>
                <span className="text-white/40">{formatPrice(balance)}</span>
              </div>
            </>
          )}
        </div>

        {/* Accept buttons OR Insurance Assessment message */}
        {!showConfirm && (step === "form" || step === "error") && (
          <div className="space-y-3">
            {isInsuranceAssessment ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-3">
                <p className="text-sm text-amber-300/90 font-medium">This quote has been prepared for insurance assessment purposes.</p>
                {linkedQuoteSlug && linkedQuoteNumber && (
                  <a
                    href={`/quote/${linkedQuoteSlug}`}
                    className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    To proceed with carpet replacement, please refer to Quote {linkedQuoteNumber}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <>
                {/* Validity badge — urgency at decision point */}
                {validUntil && (
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
                    <span className="text-xs text-amber-300/70">
                      Valid until {validUntil}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-zinc-900 shadow-lg shadow-amber-400/20"
                >
                  Accept This Quote
                </button>
                <p className="text-xs text-white/50 text-center mt-3">
                  Once accepted, we'll lock in your installation date.
                </p>
              </>
            )}
          </div>
        )}

          </div>
        </div>

        {/* Contact form */}
        <AnimatePresence>
          {showConfirm && (step === "form" || step === "error") && step !== "error" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-sm mb-4 text-white/50">
                Please enter your details to confirm acceptance:
              </p>
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <div className={`relative flex items-center rounded-xl border bg-zinc-900 px-3 py-3 ${formErrors.name ? "border-red-300" : "border-white/10 focus-within:border-white/20"}`}>
                    <User className="w-4 h-4 flex-shrink-0 text-white/30 mr-2" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  {formErrors.name && <p className="text-xs mt-1 text-red-500">{formErrors.name}</p>}
                </div>
                {/* Email */}
                <div>
                  <div className={`relative flex items-center rounded-xl border bg-zinc-900 px-3 py-3 ${formErrors.email ? "border-red-300" : "border-white/10 focus-within:border-white/20"}`}>
                    <Mail className="w-4 h-4 flex-shrink-0 text-white/30 mr-2" />
                    <input
                      type="email"
                      placeholder="Your email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  {formErrors.email && <p className="text-xs mt-1 text-red-500">{formErrors.email}</p>}
                </div>
                {/* Phone */}
                <div>
                  <div className={`relative flex items-center rounded-xl border bg-zinc-900 px-3 py-3 ${formErrors.phone ? "border-red-300" : "border-white/10 focus-within:border-white/20"}`}>
                    <Phone className="w-4 h-4 flex-shrink-0 text-white/30 mr-2" />
                    <input
                      type="tel"
                      placeholder="Your phone"
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  {formErrors.phone && <p className="text-xs mt-1 text-red-500">{formErrors.phone}</p>}
                </div>
                {/* Notes */}
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Notes <span className="text-white/25">(optional)</span></p>
                  <textarea
                    placeholder="Add any notes about access, preferred install dates, or special instructions"
                    value={agentNotes}
                    onChange={(e) => setAgentNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 focus:border-white/20 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none resize-none transition-colors"
                    style={{ fontSize: "16px" }}
                    disabled={step !== "form"}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-full py-5 rounded-xl font-bold text-base tracking-wide uppercase transition-all duration-200 hover:bg-emerald-400 active:scale-[0.97] flex items-center justify-center gap-2.5 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/30"
                >
                  <Check className="w-5 h-5" />
                  Accept Quote
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submitting */}
        {step === "submitting" && (
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-sm text-white/50">Submitting your acceptance...</span>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="rounded-xl p-4 flex items-start gap-3 bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-600">Submission failed</p>
              <p className="text-xs mt-1 text-white/40">{errorMessage}</p>
              <button onClick={() => setStep("form")} className="text-xs mt-2 underline text-white/50 hover:text-white">
                Try again
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
