/**
 * JobStatusTracker — live job progress view for accepted quotes.
 * Replaces the static "Thank You" page with a staged progress timeline.
 *
 * Two flows, selected by quote type via usesAgentPaymentTerms():
 *
 * Homeowner flow (5 stages):
 *   1. Quote Accepted        (date)
 *   2. Deposit Received      (date)
 *   3. Installation Scheduled(date + installer name)
 *   4. Installation Complete
 *   5. Paid in Full
 *
 * Agent flow (3 stages):
 *   1. Quote Accepted        (date)
 *   2. Installation Scheduled(date + installer name)
 *   3. Installation Complete
 */

import { motion } from "framer-motion";
import { Check, Calendar, Wrench, Banknote, CircleDollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LOGO_WHITE_PNG } from "@/lib/logo";
import { QUOTE_DATA } from "@/lib/quoteData";
import { usesAgentPaymentTerms } from "../../../shared/quoteConfigTypes";

interface JobStatusTrackerProps {
  quoteNumber: string;
  propertyAddress: string;
  jobStatus: string;
  quoteType: string;
  scheduledDate?: Date | string | null;
  acceptedAt?: Date | string | null;
  /** Free-text installer name set by admin at scheduling */
  installerName?: string | null;
}

interface Stage {
  id: number;
  label: string;
  sublabel?: string;
  /** Extra line shown under the label (e.g. installer name) */
  detail?: string;
  icon: LucideIcon;
  complete: boolean;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });
}

export default function JobStatusTracker({
  quoteNumber,
  propertyAddress,
  jobStatus,
  quoteType,
  scheduledDate,
  acceptedAt,
  installerName,
}: JobStatusTrackerProps) {
  const isAgent = usesAgentPaymentTerms(quoteType);

  // Status flags — order: accepted → deposit_paid → scheduled → completed → paid_in_full
  const isAccepted = true; // Always true if this component renders
  const isDepositPaid = ["deposit_paid", "scheduled", "completed", "paid_in_full"].includes(jobStatus);
  const isScheduled = ["scheduled", "completed", "paid_in_full"].includes(jobStatus);
  const isComplete = ["completed", "paid_in_full"].includes(jobStatus);
  const isPaidInFull = jobStatus === "paid_in_full";

  const installer = installerName?.trim() || "";
  const installerDetail = installer ? `Your installer: ${installer}` : undefined;

  const stages: Stage[] = isAgent
    ? [
        {
          id: 1,
          label: "Quote Accepted",
          sublabel: acceptedAt ? formatDate(acceptedAt) : undefined,
          icon: Check,
          complete: isAccepted,
        },
        {
          id: 2,
          label: "Installation Scheduled",
          sublabel: isScheduled && scheduledDate ? formatDate(scheduledDate) : undefined,
          detail: isScheduled ? installerDetail : undefined,
          icon: Calendar,
          complete: isScheduled,
        },
        {
          id: 3,
          label: "Installation Complete",
          sublabel: isComplete ? "Job finished" : undefined,
          icon: Wrench,
          complete: isComplete,
        },
      ]
    : [
        {
          id: 1,
          label: "Quote Accepted",
          sublabel: acceptedAt ? formatDate(acceptedAt) : undefined,
          icon: Check,
          complete: isAccepted,
        },
        {
          id: 2,
          label: "Deposit Received",
          sublabel: isDepositPaid ? "Received with thanks" : undefined,
          icon: Banknote,
          complete: isDepositPaid,
        },
        {
          id: 3,
          label: "Installation Scheduled",
          sublabel: isScheduled && scheduledDate ? formatDate(scheduledDate) : undefined,
          detail: isScheduled ? installerDetail : undefined,
          icon: Calendar,
          complete: isScheduled,
        },
        {
          id: 4,
          label: "Installation Complete",
          sublabel: isComplete ? "Job finished" : undefined,
          icon: Wrench,
          complete: isComplete,
        },
        {
          id: 5,
          label: "Paid in Full",
          sublabel: isPaidInFull ? "Thank you" : undefined,
          icon: CircleDollarSign,
          complete: isPaidInFull,
        },
      ];

  // Status message reflects the furthest-reached stage
  const statusMessage = isPaidInFull
    ? "Your job is complete and paid in full. Thank you for choosing Bell Carpets."
    : isComplete
    ? "Your installation is complete. Thank you for choosing Bell Carpets."
    : isScheduled
    ? "Your installation is confirmed. We'll be in touch closer to the date."
    : isDepositPaid && !isAgent
    ? "Thanks — your deposit is received. We'll be in touch to lock in your installation date."
    : "We've received your acceptance. We'll be in touch to schedule your installation.";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-10 mx-auto mb-2" />
          <p className="text-[10px] tracking-[0.3em] text-white/50 uppercase font-light">
            {QUOTE_DATA.business.tagline}
          </p>
        </div>

        {/* Quote Reference */}
        <div className="text-center mb-10">
          <p className="text-xs font-medium tracking-widest uppercase text-white/40 mb-2">
            Job Progress
          </p>
          <p className="text-lg font-semibold text-white font-mono">{quoteNumber}</p>
          <p className="text-sm text-white/50 mt-1">{propertyAddress}</p>
        </div>

        {/* Status Tracker */}
        <div className="relative pl-8 space-y-0">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isLast = idx === stages.length - 1;

            return (
              <div key={stage.id} className="relative pb-8">
                {/* Vertical connector line */}
                {!isLast && (
                  <div
                    className="absolute left-[15px] top-[36px] w-[2px] h-[calc(100%-20px)]"
                    style={{
                      background: stage.complete
                        ? "linear-gradient(180deg, #D4AF37, #D4AF3780)"
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                )}

                {/* Stage row */}
                <div className="flex items-start gap-4">
                  {/* Circle indicator */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.15, duration: 0.4 }}
                    className={`relative z-10 w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 ${
                      stage.complete
                        ? "bg-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                        : "bg-zinc-800 border border-white/10"
                    }`}
                  >
                    {stage.complete ? (
                      <Check className="w-4 h-4 text-zinc-900" strokeWidth={3} />
                    ) : (
                      <Icon className="w-4 h-4 text-white/30" />
                    )}
                  </motion.div>

                  {/* Text */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 + 0.1, duration: 0.4 }}
                    className="pt-1"
                  >
                    <p
                      className={`text-sm font-medium ${
                        stage.complete ? "text-white" : "text-white/40"
                      }`}
                    >
                      {stage.label}
                    </p>
                    {stage.sublabel && (
                      <p className="text-xs text-white/50 mt-0.5">{stage.sublabel}</p>
                    )}
                    {stage.detail && (
                      <p className="text-xs text-white/50 mt-0.5">{stage.detail}</p>
                    )}
                    {!stage.complete && !stage.sublabel && (
                      <p className="text-xs text-white/30 mt-0.5 italic">Pending</p>
                    )}
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-white/50">{statusMessage}</p>
        </motion.div>

        {/* Need help? — subtle tap-to-call */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-white/30 mb-1">Need help?</p>
          <a
            href="tel:0755711177"
            className="text-sm text-white/60 hover:text-white transition-colors underline-offset-4 hover:underline"
          >
            07 5571 1177
          </a>
        </motion.div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/30">
            Bell Carpets — Established 1987
          </p>
          <p className="text-xs text-white/30 mt-1">
            07 5571 1177 &middot; hello@bellcarpets.com.au
          </p>
        </div>
      </motion.div>
    </div>
  );
}
