/**
 * ScopeOfWorks — Displays the included works as a vertical timeline
 * Clean black & white premium design with subtle numbered timeline
 */

import { motion } from "framer-motion";

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
      className="mt-14"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-white/10" />
        <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-white/50">
          Scope of Works
        </h2>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Timeline container */}
      <div className="relative pl-8">
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-2 bottom-0 w-px bg-gradient-to-b from-amber-400/40 via-amber-300/20 to-amber-400/10" />

        {/* Scope items */}
        <div className="space-y-4">
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
              <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center bg-zinc-900 border border-amber-400/40 flex-shrink-0">
                <span className="text-xs font-medium text-amber-300/80">{i + 1}</span>
              </div>

              {/* Item content */}
              <div className="rounded-xl px-4 py-3.5 bg-white/[0.02]">
                <p className="text-sm font-medium mb-0.5 text-white">
                  {item.title}
                </p>
                <p className="text-sm text-white/50">
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
