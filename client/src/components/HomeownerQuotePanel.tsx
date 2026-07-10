/**
 * HomeownerQuotePanel — Single-product quote panel for homeowner quotes
 * Premium document-style design with generous spacing and clear hierarchy
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ExternalLink, ArrowRight, User, Mail, Phone, Loader2, AlertCircle, CreditCard, Calendar, Download, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { QuoteConfigData } from "../../../shared/quoteConfigTypes";
import { usesAgentPaymentTerms } from "../../../shared/quoteConfigTypes";

import { LOGO_WHITE_PNG } from "@/lib/logo";
import { CREAM, getDescriptionLines } from "@/lib/quoteDescription";

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

  // Customer-facing flowing description (admin-edited, else generated from data).
  const descriptionLines = getDescriptionLines(config, { tiered: false });
  // One subtle spec line beneath the description.
  const specLine = [product.manufacturer, product.fibre, product.pileType]
    .filter((s) => s && String(s).trim())
    .join("  \u00b7  ");
  const underlayName = product.underlay && String(product.underlay).trim() ? String(product.underlay).trim() : "";

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
        className="rounded-2xl p-10 text-center mt-8 bg-zinc-900 border border-white/10 shadow-sm"
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
        <div className="rounded-xl p-5 text-left space-y-2.5 bg-white/[0.02] border border-white/10">
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
    <div className="space-y-8">
      {/* ─── Scope of Works section ─── */}
      {descriptionLines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h2 className="font-serif-display text-2xl sm:text-[1.75rem] tracking-wide text-white/90">
              Scope of Works
            </h2>
            <div className="h-px w-12 mt-4 bg-white/20" />
          </div>
          <div className="flex">
            <div className="w-[2px] flex-shrink-0 rounded-full" style={{ backgroundColor: `${CREAM}40` }} />
            <div className="flex-1 pl-5 space-y-3">
              {descriptionLines.map((line, i) => (
                <p key={i} className="text-[15px] text-white/60 leading-relaxed">{line}</p>
              ))}

              {/* Spec line and underlay below description */}
              {(specLine || underlayName) && (
                <div className="pt-2 space-y-1.5">
                  {specLine && (
                    <p className="text-[13px] text-white/35 tracking-wide">
                      {specLine}
                    </p>
                  )}
                  {underlayName && (
                    <p className="text-[13px] text-white/35 tracking-wide">
                      Includes {underlayName} underlay
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Product card (no description inside — it's above now) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
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
          {/* If no description lines, show scope inline in the card (legacy fallback) */}
          {descriptionLines.length === 0 && (
            <div className="relative flex">
              <div className="w-[3px] flex-shrink-0 rounded-l-2xl" style={{ backgroundColor: CREAM, opacity: 0.5 }} />
              <div className="flex-1 px-6 py-6">
                <h3 className="text-2xl font-semibold text-white leading-tight mb-4">
                  Your Quote
                </h3>
                {specLine && (
                  <p className="text-xs text-white/40 tracking-wide">
                    {specLine}
                  </p>
                )}
                {underlayName && (
                  <p className="text-xs text-white/40 tracking-wide mt-1.5">
                    Includes {underlayName} underlay
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Colour selector */}
          {product.colours && product.colours.length > 0 && (
            <div className="px-6 py-6">
              <p className="text-xs tracking-widest uppercase mb-4 text-white/40">
                Select Colour
              </p>
              <div className="flex flex-wrap gap-4">
                {product.colours.map((colour) => {
                  const isSelected = selectedColourId === colour.id;
                  return (
                    <button
                      key={colour.id}
                      onClick={() => setSelectedColourId(colour.id)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div
                        className={`relative w-16 h-16 rounded-xl overflow-hidden transition-all duration-200 ${
                          isSelected ? "ring-2 ring-offset-2 ring-offset-zinc-900" : "ring-1 ring-white/10"
                        }`}
                        style={isSelected ? { boxShadow: `0 0 0 2px ${CREAM}` } : undefined}
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
                      <span className={`text-[10px] text-center max-w-[64px] leading-tight ${isSelected ? "text-white font-medium" : "text-white/50"}`}>
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
          <h2 className="font-serif-display text-xl sm:text-[1.375rem] tracking-wide text-white/90 mb-6">
            Additional Services
          </h2>
          <div className="space-y-3">
            {addons.map((addon) => {
              const isSelected = selectedAddonIds.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon.id)}
                  className={`w-full rounded-xl p-5 text-left transition-all duration-200 border ${
                    isSelected ? "bg-white/[0.03] border-white/20" : "bg-zinc-900 border-white/10 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/70"}`}>
                        {addon.title}
                      </p>
                      <p className="text-xs mt-1 text-white/40">
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

      {/* ─── Pricing & Accept section ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/10"
      >
        {/* Cream accent bar — matches product card */}
        <div className="flex">
          <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: CREAM, opacity: 0.5 }} />
          <div className="flex-1 p-6">

        {/* Price summary */}
        <div className="mb-6 space-y-2.5">
          {hasRooms ? (
            <>
              <p className="text-xs tracking-widest uppercase text-white/40 mb-3">Room Breakdown</p>
              {config.rooms?.map((room) => (
                <div key={room.id} className="flex justify-between text-sm">
                  <span className="text-white/50">{room.name}</span>
                  <span className="text-white">{formatPrice(room.price)}</span>
                </div>
              ))}
              <div className="h-px mt-3 bg-white/10" />
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
          {(hasRooms || selectedAddons.length > 0) && <div className="h-px mt-3 bg-white/10" />}
          {/* Total — dominant statement FIRST */}
          <div className="flex justify-between items-baseline pb-2 pt-1">
            <span className="text-sm text-white/60">Total (inc GST)</span>
            <span className="text-4xl font-bold text-white tracking-tight">{formatPrice(grandTotal)}</span>
          </div>
          <div className="h-px mb-2 bg-white/[0.06]" />
          <div className="flex justify-between text-xs text-white/40">
            <span>GST (10%)</span>
            <span>{formatPrice(Math.round(grandTotal / 11))}</span>
          </div>
          {!usesAgentPaymentTerms(config.quoteType) && (
            <>
              <div className="h-px mt-2 mb-2 bg-white/[0.06]" />
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
              <div className="rounded-xl border p-5 text-center space-y-3" style={{ borderColor: `${CREAM}33`, backgroundColor: `${CREAM}0D` }}>
                <p className="text-sm font-medium" style={{ color: CREAM }}>This quote has been prepared for insurance assessment purposes.</p>
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
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${CREAM}B3` }} />
                    <span className="text-xs" style={{ color: `${CREAM}B3` }}>
                      Valid until {validUntil}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-4 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.98] text-zinc-900 shadow-lg hover:opacity-90"
                  style={{ backgroundColor: CREAM }}
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
              className="px-6 pb-6"
            >
              <p className="text-sm mb-5 text-white/50">
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
          <div className="flex items-center justify-center gap-3 py-6 px-6">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-sm text-white/50">Submitting your acceptance...</span>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="rounded-xl p-4 mx-6 mb-6 flex items-start gap-3 bg-red-50 border border-red-100">
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
