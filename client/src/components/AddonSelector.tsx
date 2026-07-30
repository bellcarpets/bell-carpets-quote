/**
 * AddonSelector — Optional add-on services with toggle switches
 * Clean white background, dark text
 */

import { motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";

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
              className={`w-full text-left rounded-xl px-4 py-4 transition-all duration-300 border ${
                isSelected
                  ? "bg-zinc-50 border-zinc-300 shadow-sm"
                  : "bg-white border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Toggle indicator */}
                <div
                  className={`w-10 h-6 rounded-full flex-shrink-0 relative transition-all duration-300 ${
                    isSelected
                      ? "bg-zinc-800"
                      : "bg-zinc-200"
                  }`}
                >
                  <motion.div
                    animate={{ x: isSelected ? 18 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`absolute top-0.5 w-4 h-4 rounded-full ${
                      isSelected ? "bg-white" : "bg-white"
                    }`}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${isSelected ? "text-zinc-900" : "text-zinc-600"}`}>
                    {addon.title}
                  </p>
                  <p className={`text-xs mt-0.5 leading-relaxed whitespace-normal break-words ${isSelected ? "text-zinc-500" : "text-zinc-400"}`}>
                    {addon.description}
                  </p>
                </div>

                {/* Price + icon */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-base font-semibold ${isSelected ? "text-zinc-900" : "text-zinc-400"}`}>
                    {addon.priceFormatted}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isSelected ? "bg-zinc-200" : "bg-zinc-100"
                    }`}
                  >
                    {isSelected ? (
                      <Minus className="w-3 h-3 text-zinc-600" />
                    ) : (
                      <Plus className="w-3 h-3 text-zinc-400" />
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
        className="mt-4 rounded-xl px-4 py-4 bg-zinc-50 border border-zinc-200"
      >
        <div className="space-y-2">
          {selectedAddonIds.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">
                {tierName} base price
              </span>
              <span className="text-sm text-zinc-600">
                {formatPrice(baseTierPrice)}
              </span>
            </div>
          )}

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
                <span className="text-xs text-zinc-400">
                  + {a.title}
                </span>
                <span className="text-sm text-zinc-600">
                  {a.priceFormatted}
                </span>
              </motion.div>
            ))}

          <div className="h-px w-full bg-zinc-200" />

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-600">
              Total inc GST
            </span>
            <motion.span
              key={grandTotal}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-xl font-semibold text-zinc-900"
            >
              {formatPrice(grandTotal)}
            </motion.span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
