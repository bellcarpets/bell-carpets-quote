/**
 * AddonSelector — Optional add-on services with toggle switches
 * Premium design with generous spacing
 */

import { motion } from "framer-motion";
import { Plus, Minus, Package } from "lucide-react";

interface Addon {
  id: string;
  title: string;
  description: string;
  price: number;
  priceFormatted: string;
}

interface AddonSelectorProps {
  addons: Addon[];
  selectedAddonIds: string[];
  onToggleAddon: (addonId: string) => void;
  baseTierPrice: number;
  tierName: string;
}

export default function AddonSelector({
  addons,
  selectedAddonIds,
  onToggleAddon,
  baseTierPrice,
  tierName,
}: AddonSelectorProps) {
  const addonsTotal = addons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const grandTotal = baseTierPrice + addonsTotal;

  const formatPrice = (n: number) =>
    "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.04] border border-white/10">
          <Package className="w-4 h-4 text-white/40" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Additional Services
          </p>
          <p className="text-sm text-white/60 mt-0.5">
            Optional extras — add to your quote
          </p>
        </div>
      </div>

      {/* Addon cards */}
      <div className="space-y-3">
        {addons.map((addon, i) => {
          const isSelected = selectedAddonIds.includes(addon.id);
          return (
            <motion.button
              key={addon.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              onClick={() => onToggleAddon(addon.id)}
              className={`w-full text-left rounded-xl px-5 py-5 transition-all duration-300 border ${
                isSelected
                  ? "bg-white/[0.03] border-white/20 shadow-sm"
                  : "bg-zinc-900 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Toggle indicator */}
                <div
                  className={`w-10 h-6 rounded-full flex-shrink-0 relative transition-all duration-300 ${
                    isSelected
                      ? "bg-white"
                      : "bg-white/10"
                  }`}
                >
                  <motion.div
                    animate={{ x: isSelected ? 18 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`absolute top-0.5 w-4 h-4 rounded-full ${
                      isSelected ? "bg-zinc-900" : "bg-zinc-900"
                    }`}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${isSelected ? "text-white" : "text-white/70"}`}>
                    {addon.title}
                  </p>
                  <p className={`text-xs mt-1 leading-relaxed whitespace-normal break-words ${isSelected ? "text-white/50" : "text-white/35"}`}>
                    {addon.description}
                  </p>
                </div>

                {/* Price + icon */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-base font-semibold ${isSelected ? "text-white" : "text-white/40"}`}>
                    {addon.priceFormatted}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isSelected ? "bg-white/10" : "bg-white/[0.04]"
                    }`}
                  >
                    {isSelected ? (
                      <Minus className="w-3 h-3 text-white/60" />
                    ) : (
                      <Plus className="w-3 h-3 text-white/40" />
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Live price summary */}
      <motion.div
        layout
        className="mt-6 rounded-xl px-5 py-5 bg-white/[0.02] border border-white/10"
      >
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">
              {tierName} base price
            </span>
            <span className="text-sm text-white/60">
              {formatPrice(baseTierPrice)}
            </span>
          </div>

          {addons
            .filter((a) => selectedAddonIds.includes(a.id))
            .map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between items-center"
              >
                <span className="text-xs text-white/40">
                  + {a.title}
                </span>
                <span className="text-sm text-white/70">
                  {a.priceFormatted}
                </span>
              </motion.div>
            ))}

          <div className="h-px w-full bg-white/10 my-1" />

          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-medium text-white/70">
              Total inc GST
            </span>
            <motion.span
              key={grandTotal}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-semibold text-white"
            >
              {formatPrice(grandTotal)}
            </motion.span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
