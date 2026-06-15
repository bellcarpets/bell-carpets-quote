import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { UNDERLAY_LABELS, TIER_LABELS, formatCurrency, getDaysLeft } from "@/lib/quoteHelpers";
import { Phone, Mail, MapPin, Clock, CheckCircle, Star, AlertTriangle } from "lucide-react";

const TIER_ORDER = ["good", "better", "best"] as const;

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-3" />
          <div className="text-muted-foreground text-sm">Loading your quote...</div>
        </div>
      </div>
    );
  }

  if (quoteQuery.isError || !q) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <div className="font-display text-xl font-semibold text-foreground mb-2">Quote not found</div>
          <div className="text-muted-foreground text-sm">This quote may have expired or the link is incorrect.</div>
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="font-display text-xl font-semibold tracking-tight text-foreground">Bell Carpets</div>
            <div className="text-xs text-muted-foreground mt-0.5">Gold Coast Flooring Specialists</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-foreground">{q.quoteNumber}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(q.issueDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Expiry notice */}
        {isExpired ? (
          <div className="border border-[oklch(35%_0.15_25)] bg-[oklch(8%_0.04_25)] rounded-xl p-4 text-center">
            <div className="font-semibold" style={{ color: "oklch(65% 0.18 25)" }}>This quote has expired</div>
            <div className="text-sm mt-1 text-muted-foreground">Please contact Bell Carpets for an updated quote.</div>
          </div>
        ) : daysLeft !== null && daysLeft <= 7 ? (
          <div className="border border-[oklch(40%_0.12_75)] bg-[oklch(8%_0.03_75)] rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" style={{ color: "oklch(72% 0.15 75)" }} />
            <span className="text-sm" style={{ color: "oklch(80% 0.1 75)" }}>
              This quote expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""} — {q.expiryDate ? new Date(q.expiryDate).toLocaleDateString("en-AU") : ""}
            </span>
          </div>
        ) : null}

        {/* Property & Client */}
        <div className="section-accordion">
          <div className="section-accordion-header">Quote Prepared For</div>
          <div className="section-accordion-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.clientName && (
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Client</div>
                  <div className="font-semibold text-foreground">{q.clientName}</div>
                </div>
              )}
              {q.propertyAddress && (
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Property</div>
                  <div className="font-medium text-foreground">{q.propertyAddress}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3-Tier Pricing */}
        {tiers.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Your Flooring Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIER_ORDER.filter(t => tiers.find((x: any) => x.tier === t)).map(tierKey => {
                const tier = tiers.find((x: any) => x.tier === tierKey);
                if (!tier) return null;
                const isSelected = activeTier === tierKey;
                const isBest = tierKey === "best";

                const tierBorderClass = tierKey === "best"
                  ? "border-[oklch(75%_0.15_75)]"
                  : tierKey === "better"
                  ? "border-[oklch(45%_0.08_75)]"
                  : "border-border";

                const tierBadgeStyle = tierKey === "best"
                  ? { background: "oklch(72% 0.15 75)", color: "oklch(10% 0 0)" }
                  : tierKey === "better"
                  ? { background: "oklch(25% 0.05 75)", color: "oklch(75% 0.1 75)", border: "1px solid oklch(40% 0.08 75)" }
                  : { background: "oklch(14% 0 0)", color: "oklch(60% 0 0)", border: "1px solid oklch(25% 0 0)" };

                return (
                  <div
                    key={tierKey}
                    onClick={() => setSelectedTier(tierKey)}
                    className={`relative border-2 rounded-xl overflow-hidden cursor-pointer transition-all ${tierBorderClass} ${
                      isSelected ? "ring-2 ring-offset-2 ring-offset-background scale-[1.02]" : "hover:scale-[1.01]"
                    }`}
                    style={isSelected ? { "--tw-ring-color": "oklch(75% 0.15 75)" } as React.CSSProperties : {}}
                  >
                    {isBest && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "oklch(72% 0.15 75)", color: "oklch(10% 0 0)" }}>
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
                      <div className="h-32 flex items-center justify-center bg-[oklch(8%_0_0)]">
                        <div className="font-display text-3xl font-black tracking-widest text-muted-foreground opacity-40">
                          {TIER_LABELS[tierKey]}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={tierBadgeStyle}>
                          {tier.label || TIER_LABELS[tierKey]}
                        </span>
                        {isSelected && <CheckCircle className="w-4 h-4 ml-auto" style={{ color: "oklch(72% 0.15 75)" }} />}
                      </div>

                      <div className="font-semibold text-foreground text-sm mb-1">{tier.productName}</div>
                      {tier.manufacturer && <div className="text-xs text-muted-foreground mb-2">{tier.manufacturer}</div>}

                      {(tier.fibre || tier.pileType) && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {tier.fibre && <span className="text-xs bg-[oklch(12%_0_0)] border border-border text-muted-foreground px-2 py-0.5 rounded">{tier.fibre}</span>}
                          {tier.pileType && <span className="text-xs bg-[oklch(12%_0_0)] border border-border text-muted-foreground px-2 py-0.5 rounded">{tier.pileType}</span>}
                        </div>
                      )}

                      {tier.carpetColours && (
                        <div className="text-xs text-muted-foreground mb-2">
                          <span className="opacity-60">Colours: </span>{tier.carpetColours}
                        </div>
                      )}

                      {tier.badges && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tier.badges.split(",").map((b: string) => (
                            <span key={b} className="text-xs border px-1.5 py-0.5 rounded" style={{ background: "oklch(10%_0.03_145)", color: "oklch(65%_0.15_145)", borderColor: "oklch(25%_0.06_145)" }}>
                              {b.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {tier.price && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-xs text-muted-foreground">Supply & Install</div>
                          <div className="text-xl font-bold text-foreground">{formatCurrency(tier.price)}</div>
                        </div>
                      )}

                      {tier.productUrl && (
                        <a
                          href={tier.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs mt-2 block hover:underline"
                          style={{ color: "oklch(72% 0.15 75)" }}
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
              <p className="text-xs text-muted-foreground mt-2 text-center">Click a tier to select your preference</p>
            )}
          </div>
        )}

        {/* Underlay */}
        {q.underlayOption && (
          <div className="section-accordion">
            <div className="section-accordion-header">Underlay Included</div>
            <div className="section-accordion-body">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "oklch(65% 0.15 145)" }} />
                <div>
                  <div className="font-medium text-foreground">{UNDERLAY_LABELS[q.underlayOption as keyof typeof UNDERLAY_LABELS]}</div>
                  <div className="text-xs text-muted-foreground">Premium carpet underlay — included in your quote</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scope of Works */}
        {q.scopeDescription && (
          <div className="section-accordion">
            <div className="section-accordion-header">Scope of Works</div>
            <div className="section-accordion-body">
              <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">{q.scopeDescription}</div>
            </div>
          </div>
        )}

        {/* Additional Services */}
        {services.length > 0 && (
          <div className="section-accordion">
            <div className="section-accordion-header">Additional Services</div>
            <div className="section-accordion-body">
              <div className="space-y-0">
                {services.map((s: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{s.title}</div>
                      {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                    </div>
                    {s.price && s.price !== "0" && (
                      <div className="text-sm font-semibold text-foreground shrink-0">{formatCurrency(s.price)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customer Notes */}
        {q.customerNotes && (
          <div className="section-accordion">
            <div className="section-accordion-header">Notes</div>
            <div className="section-accordion-body">
              <div className="text-sm text-foreground whitespace-pre-line">{q.customerNotes}</div>
            </div>
          </div>
        )}

        {/* Payment Terms */}
        <div className="section-accordion">
          <div className="section-accordion-header">Payment Terms</div>
          <div className="section-accordion-body">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Quote Valid Until</div>
                <div className="font-medium text-foreground">
                  {q.expiryDate ? new Date(q.expiryDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : `${q.validDays} days from issue`}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Payment Due</div>
                <div className="font-medium text-foreground">{q.paymentTermsDays} days from invoice</div>
              </div>
              {(q.discount && parseFloat(q.discount) > 0) && (
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Discount Applied</div>
                  <div className="font-medium" style={{ color: "oklch(65% 0.15 145)" }}>{formatCurrency(q.discount)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="section-accordion">
          <div className="section-accordion-header">Questions? Get in Touch</div>
          <div className="section-accordion-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="tel:0412345678" className="flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors">
                <Phone className="w-4 h-4 text-muted-foreground" />
                0412 345 678
              </a>
              <a href="mailto:info@bellcarpets.com.au" className="flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors">
                <Mail className="w-4 h-4 text-muted-foreground" />
                info@bellcarpets.com.au
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8 border-t border-border pt-6">
          <div className="font-display text-sm font-semibold text-foreground mb-1">Bell Carpets</div>
          <div>Gold Coast Flooring Specialists · Nearly 40 years in the trade</div>
          <div className="mt-1 opacity-60">Prices include GST. Quote valid for {q.validDays} days from issue date.</div>
        </div>
      </div>
    </div>
  );
}
