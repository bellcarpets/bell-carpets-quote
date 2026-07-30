/**
 * ScopeOfWorks — Professional trade document scope list
 * Clean, detailed, white background with dark text.
 * Shows the full description of each work item.
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
        <div className="h-px flex-1 bg-zinc-200" />
        <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-zinc-400">
          Scope of Works
        </h2>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      {/* Scope items — clean flat list with full descriptions */}
      <div className="space-y-0">
        {items.map((item, i) => (
          <div
            key={i}
            className="py-3 border-b border-zinc-100 last:border-b-0"
          >
            <p className="text-sm text-zinc-700 leading-relaxed">
              {item.description || item.title}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
