/**
 * ConfirmationPanel — Multi-step: contact form → review → submit → success
 * Clean black & white premium design
 */

import { motion, AnimatePresence } from "framer-motion";
import type { QuoteType } from "@shared/quoteConfigTypes";
import { usesAgentPaymentTerms } from "@shared/quoteConfigTypes";
import {
  Check,
  ArrowRight,
  Calendar,
  CreditCard,
  User,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import type { Tier, ColourOption } from "@/lib/quoteData";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

import { LOGO_WHITE_PNG } from "@/lib/logo";

interface Addon {
  id: string;
  title: string;
  description: string;
  price: number;
  priceFormatted: string;
}

interface ConfirmationPanelProps {
  selectedTier: Tier | null;
  selectedColour: ColourOption | null;
  selectedAddons: Addon[];
  depositPercent: number;
  propertyAddress: string;
  quoteNumber: string;
  clientName: string;
  slug?: string;
  quoteType?: QuoteType;
  isInsuranceAssessment?: boolean;
  linkedQuoteSlug?: string | null;
  linkedQuoteNumber?: string | null;
  /** For tiered quotes: all available tiers so the panel can prompt tier selection */
  allTiers?: Tier[];
  /** Callback to select a tier (scrolls up to tier cards) */
  onSelectTier?: (tierId: string) => void;
}

export default function ConfirmationPanel({
  selectedTier,
  selectedColour,
  selectedAddons,
  depositPercent,
  propertyAddress,
  quoteNumber,
  clientName,
  slug,
  quoteType = "agent",
  isInsuranceAssessment,
  linkedQuoteSlug,
  linkedQuoteNumber,
  allTiers,
  onSelectTier,
}: ConfirmationPanelProps) {
  const isAgent = usesAgentPaymentTerms(quoteType);
  const [step, setStep] = useState<"form" | "submitting" | "success" | "error">("form");
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
    if (!slug || !selectedTier || !selectedColour) return;
    setDownloading(true);
    try {
      const result = await downloadPdfMutation.mutateAsync({
        quoteSlug: slug,
        tierName: selectedTier.name,
        productName: selectedTier.productName,
        manufacturer: selectedTier.manufacturer,
        fibre: selectedTier.fibre || "",
        pileType: selectedTier.pileType || "",
        colourName: selectedColour.name,
        colourCode: selectedColour.code,
        basePrice: selectedTier.price,
        addons: selectedAddons.map((a) => ({ title: a.title, price: a.price })),
        grandTotal,
      });
      // Download the PDF
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

  // For tiered quotes: if no tier is selected yet, show a tier-picker prompt
  const isTieredQuote = allTiers && allTiers.length > 1;
  if (isTieredQuote && (!selectedTier || !selectedColour)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-10 rounded-2xl overflow-hidden border border-emerald-900/60 bg-gradient-to-b from-emerald-950/60 to-zinc-900 shadow-[0_0_32px_-4px_rgba(6,78,59,0.5)] relative"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-900/60 ring-1 ring-emerald-700/40">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Ready to Accept?</h3>
              <p className="text-sm text-white/50">Choose your carpet tier to continue</p>
            </div>
          </div>
        </div>
        {/* Tier picker */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Select a tier</p>
          {allTiers!.map((tier) => (
            <button
              key={tier.id}
              onClick={() => onSelectTier?.(tier.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/[0.04] transition-all duration-200 group"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-white group-hover:text-white">{tier.name}</p>
                <p className="text-xs text-white/40">{tier.manufacturer} — {tier.productName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">${Math.round(tier.price).toLocaleString("en-AU")}</p>
                <p className="text-xs text-white/40">inc GST</p>
              </div>
            </button>
          ))}
          <p className="text-center text-xs text-white/25 pt-2">Tap a tier above to view colours, then scroll down to accept</p>
        </div>
      </motion.div>
    );
  }

  if (!selectedTier || !selectedColour) return null;

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const grandTotal = selectedTier.price + addonsTotal; // stored inc-GST
  const depositFraction = depositPercent / 100;
  const deposit = Math.round(grandTotal * depositFraction * 100) / 100;
  const balance = grandTotal - deposit;
  const formatPrice = (n: number) =>
    "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!agentName.trim()) errors.name = "Please enter your name";
    if (!agentEmail.trim()) {
      errors.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail)) {
      errors.email = "Please enter a valid email address";
    }
    if (!agentPhone.trim()) {
      errors.phone = "Please enter your phone number";
    } else if (agentPhone.replace(/\D/g, "").length < 8) {
      errors.phone = "Please enter a valid phone number";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setStep("submitting");
    setErrorMessage("");

    try {
      await acceptMutation.mutateAsync({
        quoteNumber,
        propertyAddress,
        clientName,
        tierName: selectedTier.name,
        productName: selectedTier.productName,
        manufacturer: selectedTier.manufacturer,
        colourName: selectedColour.name,
        colourCode: selectedColour.code,
        basePrice: selectedTier.price,
        addons: selectedAddons.map((a) => ({
          id: a.id,
          title: a.title,
          price: a.price,
        })),
        grandTotal,
        agentName: agentName.trim(),
        agentEmail: agentEmail.trim(),
        agentPhone: agentPhone.trim(),
        agentNotes: agentNotes.trim(),
      });

      if (slug) {
        await markAcceptedMutation.mutateAsync({
          slug,
          tierName: selectedTier.name,
          colourName: selectedColour.name,
          totalPrice: grandTotal,
          agentName: agentName.trim(),
          agentEmail: agentEmail.trim(),
          agentPhone: agentPhone.trim(),
          agentNotes: agentNotes.trim(),
        });

        // Invoice is now auto-generated when job status moves to "completed"
      }

      setStep("success");
    } catch (error: any) {
      console.error("[Quote] Submission error:", error);
      // Parse Zod validation errors into friendly messages
      let friendlyMessage = "Something went wrong. Please try again or call us directly.";
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Map known field paths to friendly messages
            const fieldMessages: Record<string, string> = {
              propertyAddress: "Please enter the property address.",
              clientName: "Please enter the client name.",
              agentName: "Please enter your name.",
              agentEmail: "Please enter a valid email address.",
              agentPhone: "Please enter a valid phone number.",
              tierName: "Please select a carpet tier.",
              colourName: "Please select a colour.",
            };
            const firstIssue = parsed[0];
            const field = firstIssue?.path?.[0];
            friendlyMessage = (field && fieldMessages[field]) || firstIssue?.message || friendlyMessage;
          } else {
            friendlyMessage = error.message;
          }
        } catch {
          // Not JSON — use as-is if it's a short, readable string
          if (error.message.length < 200 && !error.message.startsWith("[")) {
            friendlyMessage = error.message;
          }
        }
      }
      setErrorMessage(friendlyMessage);
      setStep("error");
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={
          selectedTier.id +
          selectedColour.id +
          selectedAddons.map((a) => a.id).join("-") +
          "-" +
          step
        }
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-10"
      >
        {step === "success" ? (
          /* ── Professional branded thank you ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 text-center py-10 px-6 shadow-sm"
          >
            <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-8 mx-auto mb-8 opacity-40" />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "backOut" }}
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-white"
            >
              <Check className="w-8 h-8 text-zinc-900" strokeWidth={2.5} />
            </motion.div>

            <h3 className="text-2xl font-semibold mb-2 text-white">
              Thank You
            </h3>
            <p className="text-sm mb-6 max-w-xs mx-auto text-white/50">
              Thank you, {agentName}! The Bell Carpets team has been notified and
              will be in touch shortly to arrange your booking.
            </p>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-white/[0.04] text-white/70">
                <Check className="w-3.5 h-3.5" />
                {selectedTier.name} — {formatPrice(grandTotal)} inc GST
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border border-white/10 overflow-hidden flex-shrink-0">
                  <img
                    src={selectedColour.swatchImage}
                    alt={selectedColour.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm text-white/60">
                  {selectedColour.code ? `${selectedColour.code} ` : ""}
                  {selectedColour.name}
                </span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {selectedAddons.map((a) => (
                    <p key={a.id} className="text-xs text-white/40">
                      + {a.title} ({a.priceFormatted})
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl px-4 py-3 mx-auto max-w-xs bg-white/[0.02]">
              <p className="text-xs mb-1 text-white/40">
                Confirmation will be sent to
              </p>
              <p className="text-sm text-white">
                {agentEmail}
              </p>
            </div>
          </motion.div>
        ) : (
          /* ── Form / Review / Submitting / Error state ── */
          <div className="rounded-2xl overflow-hidden border border-emerald-900/60 bg-gradient-to-b from-emerald-950/60 to-zinc-900 shadow-[0_0_32px_-4px_rgba(6,78,59,0.5)]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-emerald-900/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-900/60 ring-1 ring-emerald-700/40">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">
                    Confirm Your Selection
                  </h3>
                  <p className="text-sm text-white/50">
                    Review, enter your details, and accept
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-5 py-5 space-y-4">
              {/* Selection details */}
              <div className="rounded-xl px-4 py-3.5 space-y-2.5 bg-white/[0.02]">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    Package
                  </span>
                  <span className="text-sm font-medium text-white">
                    {selectedTier.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    Product
                  </span>
                  <span className="text-sm text-white">
                    {selectedTier.manufacturer} — {selectedTier.productName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    Colour
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border border-white/10 overflow-hidden flex-shrink-0">
                      <img
                        src={selectedColour.swatchImage}
                        alt={selectedColour.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm text-white">
                      {selectedColour.code ? `${selectedColour.code} ` : ""}
                      {selectedColour.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl px-4 py-3.5 space-y-2.5 bg-white/[0.02]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">
                    {selectedTier.name} carpet supply & install
                  </span>
                  <span className="text-sm text-white/80">
                    {formatPrice(Math.round(selectedTier.price))} <span className="text-xs text-white/40">inc GST</span>
                  </span>
                </div>

                {selectedAddons.map((addon) => (
                  <motion.div
                    key={addon.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex justify-between items-start gap-3"
                  >
                    <span className="text-sm flex-1 text-white/60">
                      {addon.title}
                    </span>
                    <span className="text-sm flex-shrink-0 text-white/70">
                      + {formatPrice(Math.round(addon.price))} <span className="text-xs text-white/40">inc GST</span>
                    </span>
                  </motion.div>
                ))}

                <div className="h-px w-full bg-white/10" />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">GST (10%)</span>
                  <span className="text-sm text-white/60">{formatPrice(Math.round(grandTotal / 11))}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-white/80">
                    Total (inc GST)
                  </span>
                  <motion.span
                    key={grandTotal}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="text-xl font-semibold text-white"
                  >
                    {formatPrice(grandTotal)}
                  </motion.span>
                </div>

                {!isAgent && (
                  <>
                    <div className="h-px w-full bg-white/[0.04]" />

                    {depositPercent > 0 ? (
                      <>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-sm text-white/60">
                              {depositPercent}% Deposit
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {formatPrice(deposit)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-sm text-white/60">
                              Balance on completion
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {formatPrice(balance)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-sm text-white/60">
                            Full payment on completion
                          </span>
                        </div>
                        <span className="text-sm font-medium text-white">
                          {formatPrice(grandTotal)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Property reminder */}
              <div className="rounded-xl px-4 py-3 bg-white/[0.02]">
                <p className="text-xs mb-1 text-white/40">
                  Property
                </p>
                <p className="text-sm text-white">
                  {propertyAddress}
                </p>
              </div>

              {/* ── Agent Contact Form ── */}
              <div className="rounded-xl px-4 py-4 space-y-3 bg-white/[0.02] border border-white/10">
                <p className="text-sm font-medium mb-3 text-white/70">
                  Your Contact Details
                </p>

                {/* Name */}
                <div>
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors bg-zinc-900 ${
                      formErrors.name ? "border-red-300" : "border-white/10 focus-within:border-white/20"
                    }`}
                  >
                    <User className="w-4 h-4 flex-shrink-0 text-white/30" />
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={agentName}
                      onChange={(e) => {
                        setAgentName(e.target.value);
                        if (formErrors.name) setFormErrors((p) => ({ ...p, name: "" }));
                      }}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                      disabled={step === "submitting"}
                    />
                  </div>
                  {formErrors.name && (
                    <p className="text-xs mt-1 text-red-500">{formErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors bg-zinc-900 ${
                      formErrors.email ? "border-red-300" : "border-white/10 focus-within:border-white/20"
                    }`}
                  >
                    <Mail className="w-4 h-4 flex-shrink-0 text-white/30" />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={agentEmail}
                      onChange={(e) => {
                        setAgentEmail(e.target.value);
                        if (formErrors.email) setFormErrors((p) => ({ ...p, email: "" }));
                      }}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                      disabled={step === "submitting"}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-xs mt-1 text-red-500">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors bg-zinc-900 ${
                      formErrors.phone ? "border-red-300" : "border-white/10 focus-within:border-white/20"
                    }`}
                  >
                    <Phone className="w-4 h-4 flex-shrink-0 text-white/30" />
                    <input
                      type="tel"
                      placeholder="04XX XXX XXX"
                      value={agentPhone}
                      onChange={(e) => {
                        setAgentPhone(e.target.value);
                        if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: "" }));
                      }}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                      disabled={step === "submitting"}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-xs mt-1 text-red-500">{formErrors.phone}</p>
                  )}
                </div>

                {/* Notes / Special Instructions */}
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Notes <span className="text-white/25">(optional)</span></p>
                  <textarea
                    placeholder="Add any notes about access, preferred install dates, or special instructions"
                    value={agentNotes}
                    onChange={(e) => setAgentNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-white/10 focus:border-white/20 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none resize-none transition-colors"
                    disabled={step === "submitting"}
                  />
                </div>
              </div>

              {/* Error message */}
              {step === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3 flex items-start gap-3 bg-red-50 border border-red-100"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-600">
                      {errorMessage}
                    </p>
                    <button
                      onClick={() => setStep("form")}
                      className="text-xs mt-1 underline text-white/50 hover:text-white"
                    >
                      Try again
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Accept button or Insurance Assessment message */}
              {isInsuranceAssessment ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-3">
                  <p className="text-sm text-amber-300/90 font-medium">This quote has been prepared for insurance assessment purposes.</p>
                  {linkedQuoteSlug && linkedQuoteNumber && (
                    <a
                      href={`/quote/${linkedQuoteSlug}`}
                      className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      To proceed with carpet replacement, please refer to Quote {linkedQuoteNumber}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    disabled={step === "submitting"}
                    className="w-full py-5 rounded-xl text-base font-bold tracking-wide uppercase flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-70 bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/30"
                  >
                    {step === "submitting" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Accept Quote
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>

                  <p className="text-center text-xs text-white/35">
                    By accepting, you agree to the payment terms below
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
