/**
 * JobStatusTracker — 3-stage visual tracker for accepted quotes
 * Replaces the static "Thank You" page with a live progress view.
 *
 * Stages:
 * 1. Quote Accepted ✓
 * 2. Installation Scheduled (with date)
 * 3. Installation Complete ✓
 */

import { motion } from "framer-motion";
import { Check, Calendar, Wrench } from "lucide-react";
import { LOGO_WHITE_PNG } from "@/lib/logo";
import { QUOTE_DATA } from "@/lib/quoteData";

interface JobStatusTrackerProps {
  quoteNumber: string;
  propertyAddress: string;
  jobStatus: string;
  scheduledDate?: Date | string | null;
  acceptedAt?: Date | string | null;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JobStatusTracker({
  quoteNumber,
  propertyAddress,
  jobStatus,
  scheduledDate,
  acceptedAt,
}: JobStatusTrackerProps) {
  // Determine which stages are complete
  const isAccepted = true; // Always true if this component renders
  const isScheduled = ["scheduled", "completed", "paid_in_full"].includes(jobStatus);
  const isComplete = ["completed", "paid_in_full"].includes(jobStatus);

  const stages = [
    {
      id: 1,
      label: "Quote Accepted",
      sublabel: acceptedAt ? formatDate(acceptedAt) : undefined,
      icon: Check,
      complete: isAccepted,
      active: isAccepted && !isScheduled,
    },
    {
      id: 2,
      label: "Installation Scheduled",
      sublabel: isScheduled && scheduledDate ? formatDate(scheduledDate) : undefined,
      icon: Calendar,
      complete: isScheduled,
      active: isScheduled && !isComplete,
    },
    {
      id: 3,
      label: "Installation Complete",
      sublabel: isComplete ? "Job finished" : undefined,
      icon: Wrench,
      complete: isComplete,
      active: isComplete,
    },
  ];

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
                    transition={{ delay: idx * 0.2, duration: 0.4 }}
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
                    transition={{ delay: idx * 0.2 + 0.1, duration: 0.4 }}
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
          {isComplete ? (
            <p className="text-sm text-white/50">
              Your installation is complete. Thank you for choosing Bell Carpets.
            </p>
          ) : isScheduled ? (
            <p className="text-sm text-white/50">
              Your installation is confirmed. Our team will be in touch closer to the date.
            </p>
          ) : (
            <p className="text-sm text-white/50">
              We've received your acceptance. Our team will be in touch to schedule your installation.
            </p>
          )}
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
