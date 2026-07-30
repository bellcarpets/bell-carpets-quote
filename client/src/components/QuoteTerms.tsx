/**
 * QuoteTerms — Payment terms and conditions
 * Premium document design: commanding section header, elegant term display.
 * Single term renders as a clean statement without numbering.
 */

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface QuoteTermsProps {
  terms: string[];
  validUntil: string;
}

export default function QuoteTerms({ terms, validUntil }: QuoteTermsProps) {
  const isSingleTerm = terms.length === 1;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="mt-20"
    >
      {/* Section header — commanding serif typography */}
      <div className="mb-10">
        <h2 className="font-serif-display text-2xl sm:text-[1.75rem] tracking-wide text-white/90">
          Payment Terms
        </h2>
        <div className="h-px w-12 mt-4 bg-white/20" />
      </div>

      {/* Terms */}
      {isSingleTerm ? (
        /* Single term: clean statement, no numbering */
        <div className="pl-0">
          <p className="text-[15px] text-white/60 leading-relaxed">
            {terms[0]}
          </p>
        </div>
      ) : (
        /* Multiple terms: subtle numbered list */
        <div className="space-y-4">
          {terms.map((term, i) => (
            <div
              key={i}
              className="flex items-start gap-4"
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-medium text-white/30 border border-white/[0.08]">
                {i + 1}
              </span>
              <p className="text-[15px] text-white/60 leading-relaxed">
                {term}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Validity notice */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-8 flex items-center gap-3"
      >
        <Clock className="w-3.5 h-3.5 flex-shrink-0 text-white/25" />
        <p className="text-sm text-white/40">
          This quote is valid until{" "}
          <span className="font-medium text-white/70">
            {validUntil}
          </span>
        </p>
      </motion.div>
    </motion.section>
  );
}
