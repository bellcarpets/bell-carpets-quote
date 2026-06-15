import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { UNDERLAY_LABELS, TIER_LABELS, formatCurrency, getDaysLeft } from "@/lib/quoteHelpers";
import { Phone, Mail, MapPin, Clock, CheckCircle, Star } from "lucide-react";

const TIER_ORDER = ["good", "better", "best"] as const;

const TIER_STYLES = {
  good: {
    border: "border-zinc-600",
    badge: "bg-zinc-700 text-zinc-100",
    header: "bg-zinc-800",
    accent: "#9ca3af",
  },
  better: {
    border: "border-amber-600/60",
    badge: "bg-amber-700/80 text-amber-100",
    header: "bg-amber-900/30",
    accent: "#d97706",
  },
  best: {
    border: "border-amber-400",
    badge: "bg-amber-500 text-black",
    header: "bg-amber-900/50",
    accent: "#f59e0b",
  },
};

export default function QuoteView() {
  const { id } = useParams<{ id: string }>();
  const quoteId = parseInt(id!);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const quoteQuery = trpc.quotes.getPublic.useQuery({ id: quoteId }, {
    enabled: !!quoteId && !isNaN(quoteId),
    retry: false,
  });

  const q = quoteQuery.data;

  if (quoteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading your quote...</div>
      </div>
    );
  }

  if (quoteQuery.isError || !q) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-300 font-semibold mb-2">Quote not found</div>
          <div className="text-zinc-500 text-sm">This quote may have expired or the link is incorrect.</div>
        </div>
      </div>
    );
  }

  const tiers = (q.tiers ?? []).filter((t: any) => t.productName || t.price);
  const services = q.services ?? [];
  const daysLeft = getDaysLeft(q.expiryDate);
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const activeTier: string | undefined = selectedTier ?? (q.selectedTier ?? undefined);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white tracking-widest text-sm uppercase">Bell</span>
              <span className="font-bold text-amber-400 tracking-widest text-sm uppercase">Carpets</span>
            </div>
            <div className="text-xs text-zinc-500">Gold Coast Flooring Specialists</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-white">{q.quoteNumber}</div>
            <div className="text-xs text-zinc-500">
              {new Date(q.issueDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Expiry notice */}
        {isExpired ? (
          <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-center">
            <div className="text-red-400 font-semibold">This quote has expired</div>
            <div className="text-red-500 text-sm mt-1">Please contact Bell Carpets for an updated quote.</div>
          </div>
        ) : daysLeft !== null && daysLeft <= 7 ? (
          <div className="bg-amber-950/50 border border-amber-800 rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-300 text-sm font-medium">
              This quote expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""} — {q.expiryDate ? new Date(q.expiryDate).toLocaleDateString("en-AU") : ""}
            </span>
          </div>
        ) : null}

        {/* Property & Client */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quote Prepared For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {q.clientName && (
              <div>
                <div className="text-xs text-zinc-500">Client</div>
                <div className="font-semibold text-white">{q.clientName}</div>
              </div>
            )}
            {q.propertyAddress && (
              <div>
                <div className="text-xs text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Property</div>
                <div className="font-medium text-zinc-200">{q.propertyAddress}</div>
              </div>
            )}
          </div>
        </div>

        {/* 3-Tier Pricing */}
        {tiers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Your Flooring Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIER_ORDER.filter(t => tiers.find((x: any) => x.tier === t)).map(tierKey => {
                const tier = tiers.find((x: any) => x.tier === tierKey);
                if (!tier) return null;
                const style = TIER_STYLES[tierKey];
                const isSelected = activeTier === tierKey;
                const isBest = tierKey === "best";

                return (
                  <div
                    key={tierKey}
                    onClick={() => setSelectedTier(tierKey)}
                    className={cn(
                      "relative border-2 rounded-xl overflow-hidden cursor-pointer transition-all",
                      style.border,
                      isSelected ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950 scale-[1.02]" : "hover:scale-[1.01]"
                    )}
                  >
                    {isBest && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> Recommended
                        </span>
                      </div>
                    )}

                    {/* Hero image */}
                    {tier.heroImageUrl ? (
                      <div className="h-40 overflow-hidden">
                        <img src={tier.heroImageUrl} alt={tier.productName ?? ""} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={cn("h-32 flex items-center justify-center", style.header)}>
                        <div className="text-2xl font-black tracking-widest" style={{ color: style.accent }}>
                          {TIER_LABELS[tierKey]}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-zinc-900">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded", style.badge)}>
                          {tier.label || TIER_LABELS[tierKey]}
                        </span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-amber-400 ml-auto" />}
                      </div>

                      <div className="font-semibold text-white text-sm mb-1">{tier.productName}</div>
                      {tier.manufacturer && <div className="text-xs text-zinc-400 mb-2">{tier.manufacturer}</div>}

                      {(tier.fibre || tier.pileType) && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {tier.fibre && <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{tier.fibre}</span>}
                          {tier.pileType && <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{tier.pileType}</span>}
                        </div>
                      )}

                      {tier.carpetColours && (
                        <div className="text-xs text-zinc-400 mb-2">
                          <span className="text-zinc-500">Colours: </span>{tier.carpetColours}
                        </div>
                      )}

                      {tier.badges && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tier.badges.split(",").map((b: string) => (
                            <span key={b} className="text-xs bg-green-900/50 text-green-300 border border-green-800 px-1.5 py-0.5 rounded">
                              {b.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {tier.price && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                          <div className="text-xs text-zinc-500">Supply & Install</div>
                          <div className="text-xl font-bold text-white">{formatCurrency(tier.price)}</div>
                        </div>
                      )}

                      {tier.productUrl && (
                        <a
                          href={tier.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-amber-400 hover:text-amber-300 mt-2 block"
                        >
                          View product details →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {tiers.length > 1 && (
              <p className="text-xs text-zinc-500 mt-2 text-center">Click a tier to select your preference</p>
            )}
          </div>
        )}

        {/* Underlay */}
        {q.underlayOption && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">Underlay Included</h2>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <div className="font-medium text-white">{UNDERLAY_LABELS[q.underlayOption as keyof typeof UNDERLAY_LABELS]}</div>
                <div className="text-xs text-zinc-500">Premium carpet underlay — included in your quote</div>
              </div>
            </div>
          </div>
        )}

        {/* Scope of Works */}
        {q.scopeDescription && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Scope of Works</h2>
            <div className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{q.scopeDescription}</div>
          </div>
        )}

        {/* Additional Services */}
        {services.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Additional Services</h2>
            <div className="space-y-2">
              {services.map((s: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white">{s.title}</div>
                    {s.description && <div className="text-xs text-zinc-400 mt-0.5">{s.description}</div>}
                  </div>
                  {s.price && s.price !== "0" && (
                    <div className="text-sm font-semibold text-white shrink-0">{formatCurrency(s.price)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Notes */}
        {q.customerNotes && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">Notes</h2>
            <div className="text-sm text-zinc-300 whitespace-pre-line">{q.customerNotes}</div>
          </div>
        )}

        {/* Payment Terms */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Payment Terms</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-zinc-500">Quote Valid Until</div>
              <div className="font-medium text-white">
                {q.expiryDate ? new Date(q.expiryDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : `${q.validDays} days from issue`}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Payment Due</div>
              <div className="font-medium text-white">{q.paymentTermsDays} days from invoice</div>
            </div>
            {(q.discount && parseFloat(q.discount) > 0) && (
              <div>
                <div className="text-xs text-zinc-500">Discount Applied</div>
                <div className="font-medium text-green-400">{formatCurrency(q.discount)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Questions? Get in Touch</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="tel:0412345678" className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors">
              <Phone className="w-4 h-4 text-amber-400" />
              0412 345 678
            </a>
            <a href="mailto:info@bellcarpets.com.au" className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors">
              <Mail className="w-4 h-4 text-amber-400" />
              info@bellcarpets.com.au
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-600 pb-8">
          <div className="font-semibold text-zinc-500 mb-1">Bell Carpets — Gold Coast Flooring Specialists</div>
          <div>Nearly 40 years in the trade · ABN XX XXX XXX XXX</div>
          <div className="mt-1">Prices include GST. Quote valid for {q.validDays} days from issue date.</div>
        </div>
      </div>
    </div>
  );
}
