/**
 * AcceptModal — Full-screen overlay for quote acceptance
 * Shows contact form → submitting → success screen
 * Black and white, premium minimal feel
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, AlertCircle, Phone, Mail, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { QuoteType } from "@shared/quoteConfigTypes";

interface Addon {
  id: string;
  title: string;
  price: number;
}

interface AcceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierName: string;
  productName: string;
  manufacturer: string;
  colourName: string;
  colourCode?: string;
  basePrice: number;
  grandTotal: number;
  quoteNumber: string;
  propertyAddress: string;
  clientName: string;
  slug: string;
  selectedAddons?: Addon[];
  quoteType?: QuoteType;
  depositPercent?: number;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
}

export default function AcceptModal({
  isOpen,
  onClose,
  tierName,
  productName,
  manufacturer,
  colourName,
  colourCode,
  basePrice,
  grandTotal,
  quoteNumber,
  propertyAddress,
  clientName,
  slug,
  selectedAddons = [],
  quoteType = "real_estate",
  depositPercent = 50,
  initialName = "",
  initialEmail = "",
  initialPhone = "",
}: AcceptModalProps) {
  const [step, setStep] = useState<"form" | "submitting" | "success" | "error">("form");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const acceptMutation = trpc.quote.accept.useMutation();
  const markAcceptedMutation = trpc.admin.markAccepted.useMutation();

  const formatPrice = (n: number) => "$" + n.toLocaleString("en-AU");

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Please enter your name";
    if (!email.trim()) {
      e.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Please enter a valid email address";
    }
    if (!phone.trim()) {
      e.phone = "Please enter your phone number";
    } else if (phone.replace(/\D/g, "").length < 8) {
      e.phone = "Please enter a valid phone number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep("submitting");
    setErrorMessage("");

    try {
      const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
      const total = grandTotal || basePrice + addonsTotal;

      await acceptMutation.mutateAsync({
        quoteNumber,
        propertyAddress,
        clientName,
        tierName,
        productName,
        manufacturer,
        colourName,
        colourCode: colourCode || "",
        basePrice,
        addons: selectedAddons.map((a) => ({ id: a.id, title: a.title, price: a.price })),
        grandTotal: total,
        agentName: name.trim(),
        agentEmail: email.trim(),
        agentPhone: phone.trim(),
        agentNotes: notes.trim(),
      });

      await markAcceptedMutation.mutateAsync({
        slug,
        tierName,
        colourName,
        totalPrice: total,
        agentName: name.trim(),
        agentEmail: email.trim(),
        agentPhone: phone.trim(),
        agentNotes: notes.trim(),
      });

      setStep("success");
    } catch (error: any) {
      console.error("[AcceptModal] Accept error:", error);
      // Special case: quote has expired — show expiry message, no retry
      if (error?.message === "QUOTE_EXPIRED") {
        setErrorMessage("QUOTE_EXPIRED");
        setStep("error");
        return;
      }
      let msg = "Something went wrong. Please try again or call us on 07 5571 1177.";
      if (error?.message && error.message.length < 200 && !error.message.startsWith("[")) {
        msg = error.message;
      }
      setErrorMessage(msg);
      setStep("error");
    }
  };

  const handleClose = () => {
    if (step === "submitting") return; // don't allow close during submit
    onClose();
    // Reset form after close animation
    setTimeout(() => {
      if (step !== "success") {
        setStep("form");
        setErrors({});
        setErrorMessage("");
      }
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={step !== "submitting" ? handleClose : undefined}
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6"
          >
            <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
              {/* Close button */}
              {step !== "submitting" && step !== "success" && (
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* ── SUCCESS STATE ── */}
              {step === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center px-8 py-12 text-center min-h-[400px]"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "backOut" }}
                    className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-6"
                  >
                    <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Quote Accepted</h2>
                    <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                      Thank you. We'll be in touch shortly to schedule your installation at a time that works.
                    </p>
                    <div className="bg-zinc-50 rounded-xl px-5 py-4 text-left space-y-2 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Quote</span>
                        <span className="text-zinc-800 font-medium">{quoteNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Selection</span>
                        <span className="text-zinc-800 font-medium">{tierName} — {colourName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Total</span>
                        <span className="text-zinc-800 font-medium">{formatPrice(grandTotal || basePrice)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400">
                      A confirmation has been sent to {email}
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* ── FORM STATE ── */}
              {(step === "form" || step === "submitting" || step === "error") && (
                <div className="px-6 pt-7 pb-8">
                  {/* Header */}
                  <div className="mb-6 pr-8">
                    <p className="text-xs uppercase tracking-[0.15em] text-zinc-400 mb-1">Step 3 of 3</p>
                    <h2 className="text-xl font-semibold text-zinc-900">Confirm your quote</h2>
                    <p className="text-sm text-zinc-500 mt-1">Enter your contact details to accept.</p>
                  </div>

                  {/* Selection summary */}
                  <div className="bg-zinc-50 rounded-xl px-4 py-3.5 mb-5 border border-zinc-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">{tierName} — {manufacturer} {productName}</p>
                        <p className="text-sm font-medium text-zinc-800">
                          {colourCode ? `${colourCode} ` : ""}{colourName}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-zinc-900">{formatPrice(grandTotal || basePrice)}</p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    {/* Name */}
                    <div>
                      <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 transition-colors ${
                        errors.name ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white focus-within:border-zinc-400"
                      }`}>
                        <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                          }}
                          className="flex-1 bg-transparent outline-none text-sm text-zinc-800 placeholder:text-zinc-400"
                          disabled={step === "submitting"}
                        />
                      </div>
                      {errors.name && <p className="text-xs mt-1 text-red-500 pl-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 transition-colors ${
                        errors.email ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white focus-within:border-zinc-400"
                      }`}>
                        <Mail className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                          }}
                          className="flex-1 bg-transparent outline-none text-sm text-zinc-800 placeholder:text-zinc-400"
                          disabled={step === "submitting"}
                        />
                      </div>
                      {errors.email && <p className="text-xs mt-1 text-red-500 pl-1">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 transition-colors ${
                        errors.phone ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white focus-within:border-zinc-400"
                      }`}>
                        <Phone className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <input
                          type="tel"
                          placeholder="04XX XXX XXX"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                          }}
                          className="flex-1 bg-transparent outline-none text-sm text-zinc-800 placeholder:text-zinc-400"
                          disabled={step === "submitting"}
                        />
                      </div>
                      {errors.phone && <p className="text-xs mt-1 text-red-500 pl-1">{errors.phone}</p>}
                    </div>

                    {/* Notes (optional) */}
                    <div>
                      <textarea
                        placeholder="Notes — access details, preferred install dates, etc. (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none resize-none focus:border-zinc-400 transition-colors"
                        disabled={step === "submitting"}
                      />
                    </div>
                  </div>

                  {/* Error message */}
                  {step === "error" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        {errorMessage === "QUOTE_EXPIRED" ? (
                          <>
                            <p className="text-xs font-semibold text-red-600 mb-1">This quote has expired.</p>
                            <p className="text-xs text-red-500 leading-relaxed">
                              Please contact Bell Carpets on{" "}
                              <a href="tel:0466912786" className="font-medium underline">0466 912 786</a>
                              {" "}or{" "}
                              <a href="mailto:info@bellcarpets.com.au" className="font-medium underline">email us</a>
                              {" "}for a fresh quote.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-red-600">{errorMessage}</p>
                            <button
                              onClick={() => setStep("form")}
                              className="text-xs mt-1 underline text-red-500 hover:text-red-700"
                            >
                              Try again
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={step === "error" ? () => { setStep("form"); setTimeout(handleSubmit, 50); } : handleSubmit}
                    disabled={step === "submitting"}
                    className="mt-5 w-full py-4 rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-70 bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
                  >
                    {step === "submitting" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm &amp; Accept Quote
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-center text-[11px] text-zinc-400">
                    By accepting, you agree to the quote terms and conditions.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
