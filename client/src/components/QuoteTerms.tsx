/**
 * QuoteTerms — Payment terms and conditions
 * Clean white background with dark text
 */

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface QuoteTermsProps {
  terms: string[];
  validUntil: string;
}

export default function QuoteTerms({ terms, validUntil }: QuoteTermsProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="mt-14"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-zinc-200" />
        <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-zinc-400">
          Payment Terms
        </h2>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="space-y-3">
        {terms.filter(t => t && t.trim()).map((term, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100"
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium bg-zinc-200 text-zinc-500">
              {i + 1}
            </div>
            <p className="text-sm text-zinc-600">
              {term}
            </p>
          </div>
        ))}
      </div>

      {/* Validity notice */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-5 flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50"
      >
        <Clock className="w-4 h-4 flex-shrink-0 text-zinc-400" />
        <p className="text-sm text-zinc-600">
          This quote is valid until{" "}
          <span className="font-semibold text-zinc-900">
            {validUntil}
          </span>
        </p>
      </motion.div>
    </motion.section>
  );
}
