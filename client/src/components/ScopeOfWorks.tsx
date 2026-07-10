/**
 * ScopeOfWorks — Displays the included works as a vertical timeline
 * Premium document design with generous spacing and subtle numbered timeline
 */

import { motion } from "framer-motion";
import { CREAM } from "@/lib/quoteDescription";

interface ScopeItem {
  title: string;
  description: string;
}

interface ScopeOfWorksProps {
  items: ScopeItem[];
}

export default function ScopeOfWorks({ items }: ScopeOfWorksProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="mt-0"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-px flex-1 bg-white/10" />
        <h2 className="text-xs font-medium tracking-[0.25em] uppercase text-white/40">
          Scope of Works
        </h2>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Timeline container */}
      <div className="relative pl-8">
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-2 bottom-0 w-px" style={{ backgroundColor: `${CREAM}40` }} />

        {/* Scope items */}
        <div className="space-y-5">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              {/* Numbered circle on timeline */}
              <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center bg-zinc-900 flex-shrink-0" style={{ border: `1px solid ${CREAM}66` }}>
                <span className="text-xs font-medium" style={{ color: `${CREAM}CC` }}>{i + 1}</span>
              </div>

              {/* Item content */}
              <div className="rounded-xl px-5 py-4 bg-white/[0.02]">
                <p className="text-sm font-medium mb-1 text-white">
                  {item.title}
                </p>
                <p className="text-sm text-white/50 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
