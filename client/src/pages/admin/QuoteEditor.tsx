import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Copy, Mail, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { STATUS_LABELS, STATUS_ORDER, type QuoteStatus } from "@/lib/quoteHelpers";

const TIER_LEVELS = ["good", "better", "best"] as const;
const TIER_DISPLAY = { good: "GOOD", better: "BETTER", best: "BEST" };

interface TierData {
  tier: "good" | "better" | "best";
  label?: string;
  productName?: string;
  manufacturer?: string;
  fibre?: string;
  pileType?: string;
  price?: string;
  heroImageUrl?: string;
  productUrl?: string;
  primaryColour?: string;
  accentColour?: string;
  carpetColours?: string;
  badges?: string;
}

interface ServiceData {
  title: string;
  description?: string;
  price?: string;
  sortOrder?: number;
}

function Section({
  title, sectionKey, expanded, onToggle, children
}: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="section-accordion">
      <button className="section-accordion-header w-full" onClick={onToggle}>
        <span>{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="section-accordion-body">{children}</div>}
    </div>
  );
}

export default function QuoteEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const quoteId = parseInt(id!);
  const utils = trpc.useUtils();

  const quoteQuery = trpc.quotes.getById.useQuery({ id: quoteId }, { enabled: !!quoteId });
  const agenciesQuery = trpc.agencies.list.useQuery();
  const libraryQuery = trpc.library.list.useQuery();

  const updateMutation = trpc.quotes.update.useMutation({
    onSuccess: () => { toast.success("Quote saved"); utils.quotes.getById.invalidate({ id: quoteId }); },
    onError: (e) => toast.error(e.message),
  });

  // Form state
  const [quoteType, setQuoteType] = useState("homeowner");
  const [status, setStatus] = useState("draft");
  const [temperature, setTemperature] = useState("warm");
  const [clientName, setClientName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agencyId, setAgencyId] = useState<string>("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [expiryDate, setExpiryDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [credit, setCredit] = useState("0");
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [scopeDescription, setScopeDescription] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [insuranceAssessment, setInsuranceAssessment] = useState("");
  const [underlayOption, setUnderlayOption] = useState<string>("");
  const [tiers, setTiers] = useState<TierData[]>([
    { tier: "good", label: "GOOD" },
    { tier: "better", label: "BETTER" },
    { tier: "best", label: "BEST" },
  ]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    header: true, client: true, tiers: true, underlay: true,
    services: false, scope: true, notes: false, insurance: false, internal: false,
  });

  useEffect(() => {
    const q = quoteQuery.data;
    if (!q) return;
    setQuoteType(q.quoteType);
    setStatus(q.status);
    setTemperature(q.temperature);
    setClientName(q.clientName ?? "");
    setAgentEmail(q.agentEmail ?? "");
    setAgentPhone(q.agentPhone ?? "");
    setAgencyId(q.agencyId ? String(q.agencyId) : "");
    setPropertyAddress(q.propertyAddress ?? "");
    setIssueDate(q.issueDate ? new Date(q.issueDate).toISOString().split("T")[0] : "");
    setValidDays(q.validDays);
    setExpiryDate(q.expiryDate ? new Date(q.expiryDate).toISOString().split("T")[0] : "");
    setDiscount(q.discount ?? "0");
    setCredit(q.credit ?? "0");
    setPaymentTermsDays(q.paymentTermsDays);
    setScopeDescription(q.scopeDescription ?? "");
    setCustomerNotes(q.customerNotes ?? "");
    setInternalNotes(q.internalNotes ?? "");
    setInsuranceAssessment(q.insuranceAssessment ?? "");
    setUnderlayOption(q.underlayOption ?? "");
    if (q.tiers && q.tiers.length > 0) {
      setTiers(TIER_LEVELS.map(t => {
        const ex = q.tiers.find((x: any) => x.tier === t);
        return ex ? {
          tier: t, label: ex.label ?? TIER_DISPLAY[t],
          productName: ex.productName ?? "", manufacturer: ex.manufacturer ?? "",
          fibre: ex.fibre ?? "", pileType: ex.pileType ?? "", price: ex.price ?? "",
          heroImageUrl: ex.heroImageUrl ?? "", productUrl: ex.productUrl ?? "",
          primaryColour: ex.primaryColour ?? "", accentColour: ex.accentColour ?? "",
          carpetColours: ex.carpetColours ?? "", badges: ex.badges ?? "",
        } : { tier: t, label: TIER_DISPLAY[t] };
      }));
    }
    if (q.services) {
      setServices(q.services.map((s: any) => ({
        title: s.title, description: s.description ?? "", price: s.price ?? "", sortOrder: s.sortOrder
      })));
    }
  }, [quoteQuery.data]);

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));
  const updateTier = (tier: "good" | "better" | "best", field: string, value: string) =>
    setTiers(prev => prev.map(t => t.tier === tier ? { ...t, [field]: value } : t));
  const addService = () => setServices(prev => [...prev, { title: "", description: "", price: "0", sortOrder: prev.length }]);
  const removeService = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: string, value: string) =>
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleSave = () => {
    updateMutation.mutate({
      id: quoteId, quoteType: quoteType as any, status: status as any,
      temperature: temperature as any, clientName, agentEmail, agentPhone,
      agencyId: agencyId ? parseInt(agencyId) : null, propertyAddress,
      issueDate, validDays, expiryDate, discount, credit, paymentTermsDays,
      scopeDescription, customerNotes, internalNotes, insuranceAssessment,
      underlayOption: underlayOption as any || null,
      tiers: tiers.filter(t => t.productName || t.price),
      services,
    });
  };

  const copyQuoteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/quote/${quoteId}`);
    toast.success("Quote link copied");
  };

  const q = quoteQuery.data;

  if (quoteQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-14 bg-card rounded-lg animate-pulse border border-border" />)}
        </div>
      </AdminLayout>
    );
  }

  if (!q) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">
          Quote not found
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back bar */}
      <div className="sticky top-12 z-40 bg-background border-b border-border px-4 py-2 flex items-center gap-3">
        <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="font-display text-base font-semibold text-foreground">{q.quoteNumber}</span>
        {q.propertyAddress && <span className="text-xs text-muted-foreground truncate">{q.propertyAddress}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3" onClick={copyQuoteLink}>
            <Copy className="w-3.5 h-3.5" /> Copy Link
          </button>
          <button className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3" onClick={() => navigate(`/admin/quotes/${quoteId}/email`)}>
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <a href={`/quote/${quoteId}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 px-3">
            View
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-2 pb-32">

        {/* Quote Header */}
        <Section title="Quote Details" sectionKey="header" expanded={expanded.header} onToggle={() => toggle("header")}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="field-label">Quote #</label>
              <div className="field-input opacity-60 cursor-default">{q.quoteNumber}</div>
            </div>
            <div>
              <label className="field-label">Issue Date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="field-label">Valid Days</label>
              <input type="number" value={validDays} onChange={e => setValidDays(parseInt(e.target.value))} className="field-input" />
            </div>
            <div>
              <label className="field-label">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="field-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="field-label">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="field-select">
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s as QuoteStatus]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Quote Type</label>
              <select value={quoteType} onChange={e => setQuoteType(e.target.value)} className="field-select">
                <option value="homeowner">Homeowner</option>
                <option value="agency_3tier">Real Estate Agency 3-Tier</option>
                <option value="agency_single">Agency Single Product</option>
              </select>
            </div>
            <div>
              <label className="field-label">Temperature</label>
              <div className="flex gap-1.5 mt-1">
                {(["hot", "warm", "cold"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTemperature(t)}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold tracking-wide uppercase transition-all ${
                      temperature === t ? `badge-${t}` : "bg-[oklch(12%_0_0)] text-muted-foreground border border-border hover:border-[oklch(30%_0_0)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="field-label">Discount ($)</label>
              <input value={discount} onChange={e => setDiscount(e.target.value)} className="field-input" placeholder="0" />
            </div>
            <div>
              <label className="field-label">Credit ($)</label>
              <input value={credit} onChange={e => setCredit(e.target.value)} className="field-input" placeholder="0" />
            </div>
            <div>
              <label className="field-label">Payment Terms (days)</label>
              <input type="number" value={paymentTermsDays} onChange={e => setPaymentTermsDays(parseInt(e.target.value))} className="field-input" />
            </div>
          </div>
        </Section>

        {/* Client & Agent */}
        <Section title="Client & Agent" sectionKey="client" expanded={expanded.client} onToggle={() => toggle("client")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Client Name</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} className="field-input" placeholder="Client name" />
            </div>
            <div>
              <label className="field-label">Property Address</label>
              <input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} className="field-input" placeholder="123 Main St, Suburb QLD 4000" />
            </div>
            <div>
              <label className="field-label">Agent Email</label>
              <input type="email" value={agentEmail} onChange={e => setAgentEmail(e.target.value)} className="field-input" placeholder="agent@agency.com.au" />
            </div>
            <div>
              <label className="field-label">Agent Phone</label>
              <input value={agentPhone} onChange={e => setAgentPhone(e.target.value)} className="field-input" placeholder="0412 345 678" />
            </div>
            <div>
              <label className="field-label">Agency</label>
              <select value={agencyId || "none"} onChange={e => setAgencyId(e.target.value === "none" ? "" : e.target.value)} className="field-select">
                <option value="none">No agency</option>
                {agenciesQuery.data?.map(a => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={copyQuoteLink}>
                <Copy className="w-3.5 h-3.5" /> Resend Quote Link
              </button>
            </div>
          </div>
        </Section>

        {/* 3-Tier Pricing */}
        <Section title="3-Tier Pricing — GOOD / BETTER / BEST" sectionKey="tiers" expanded={expanded.tiers} onToggle={() => toggle("tiers")}>
          <div className="space-y-4">
            {TIER_LEVELS.map(tierLevel => {
              const tier = tiers.find(t => t.tier === tierLevel) ?? { tier: tierLevel };
              const tierAccent = tierLevel === "best"
                ? "border-[oklch(80%_0_0/0.3)]"
                : tierLevel === "better"
                  ? "border-[oklch(60%_0_0/0.2)]"
                  : "border-border";
              return (
                <div key={tierLevel} className={`border rounded-lg p-4 ${tierAccent}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[0.65rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${
                      tierLevel === "best" ? "bg-foreground text-background" :
                      tierLevel === "better" ? "bg-[oklch(20%_0_0)] text-foreground border border-border" :
                      "bg-[oklch(14%_0_0)] text-muted-foreground border border-border"
                    }`}>
                      {TIER_DISPLAY[tierLevel]}
                    </span>
                    <input
                      value={tier.label ?? TIER_DISPLAY[tierLevel]}
                      onChange={e => updateTier(tierLevel, "label", e.target.value)}
                      className="field-input h-7 text-sm w-32 py-1"
                      placeholder="Label"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="field-label">Product Name</label>
                      <input value={tier.productName ?? ""} onChange={e => updateTier(tierLevel, "productName", e.target.value)} className="field-input" placeholder="e.g. Hycraft Wool Blend" />
                    </div>
                    <div>
                      <label className="field-label">Manufacturer</label>
                      <input value={tier.manufacturer ?? ""} onChange={e => updateTier(tierLevel, "manufacturer", e.target.value)} className="field-input" placeholder="e.g. Hycraft" />
                    </div>
                    <div>
                      <label className="field-label">Price (supply & install)</label>
                      <input value={tier.price ?? ""} onChange={e => updateTier(tierLevel, "price", e.target.value)} className="field-input" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="field-label">Fibre</label>
                      <input value={tier.fibre ?? ""} onChange={e => updateTier(tierLevel, "fibre", e.target.value)} className="field-input" placeholder="e.g. 80% Wool" />
                    </div>
                    <div>
                      <label className="field-label">Pile Type</label>
                      <input value={tier.pileType ?? ""} onChange={e => updateTier(tierLevel, "pileType", e.target.value)} className="field-input" placeholder="e.g. Cut Pile" />
                    </div>
                    <div>
                      <label className="field-label">Primary Colour</label>
                      <input value={tier.primaryColour ?? ""} onChange={e => updateTier(tierLevel, "primaryColour", e.target.value)} className="field-input" placeholder="e.g. Charcoal" />
                    </div>
                    <div>
                      <label className="field-label">Accent Colour</label>
                      <input value={tier.accentColour ?? ""} onChange={e => updateTier(tierLevel, "accentColour", e.target.value)} className="field-input" placeholder="e.g. Silver" />
                    </div>
                    <div>
                      <label className="field-label">Carpet Colours</label>
                      <input value={tier.carpetColours ?? ""} onChange={e => updateTier(tierLevel, "carpetColours", e.target.value)} className="field-input" placeholder="Charcoal, Silver Birch, Ocean" />
                    </div>
                    <div>
                      <label className="field-label">Badges / Certifications</label>
                      <input value={tier.badges ?? ""} onChange={e => updateTier(tierLevel, "badges", e.target.value)} className="field-input" placeholder="e.g. GreenTag, NZ Wool" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="field-label">Hero Image URL</label>
                      <input value={tier.heroImageUrl ?? ""} onChange={e => updateTier(tierLevel, "heroImageUrl", e.target.value)} className="field-input" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="field-label">Product URL</label>
                      <input value={tier.productUrl ?? ""} onChange={e => updateTier(tierLevel, "productUrl", e.target.value)} className="field-input" placeholder="https://..." />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Underlay */}
        <Section title="Underlay" sectionKey="underlay" expanded={expanded.underlay} onToggle={() => toggle("underlay")}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(["protect", "ultimate", "extra", "eureka"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setUnderlayOption(underlayOption === opt ? "" : opt)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  underlayOption === opt
                    ? "border-foreground bg-[oklch(12%_0_0)] text-foreground"
                    : "border-border bg-[oklch(8%_0_0)] text-muted-foreground hover:border-[oklch(30%_0_0)]"
                }`}
              >
                <div className="text-[0.65rem] font-medium tracking-wide uppercase mb-0.5 opacity-60">Dunlop Springtred</div>
                <div className="text-sm font-semibold capitalize">{opt}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Additional Services */}
        <Section title="Additional Services" sectionKey="services" expanded={expanded.services} onToggle={() => toggle("services")}>
          <div className="space-y-2">
            {services.map((service, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-[oklch(7%_0_0)] rounded-lg border border-border">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input value={service.title} onChange={e => updateService(i, "title", e.target.value)} placeholder="Service title" className="field-input" />
                  <input value={service.description ?? ""} onChange={e => updateService(i, "description", e.target.value)} placeholder="Description (optional)" className="field-input" />
                  <input value={service.price ?? ""} onChange={e => updateService(i, "price", e.target.value)} placeholder="Price" className="field-input" />
                </div>
                <button onClick={() => removeService(i)} className="btn-ghost p-1.5 text-muted-foreground hover:text-[oklch(70%_0.15_27)] shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={addService}>
              <Plus className="w-3.5 h-3.5" /> Add Service
            </button>
          </div>
        </Section>

        {/* Scope of Works */}
        <Section title="Scope of Works" sectionKey="scope" expanded={expanded.scope} onToggle={() => toggle("scope")}>
          <div className="space-y-3">
            <textarea
              value={scopeDescription}
              onChange={e => setScopeDescription(e.target.value)}
              placeholder="Describe the scope of works..."
              className="field-textarea min-h-28"
            />
            {libraryQuery.data && libraryQuery.data.length > 0 && (
              <div>
                <label className="field-label">Quick-add from Library</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {libraryQuery.data.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => setScopeDescription(prev => prev ? `${prev}\n${item.title}${item.description ? `: ${item.description}` : ""}` : `${item.title}${item.description ? `: ${item.description}` : ""}`)}
                      className="text-xs px-2.5 py-1 rounded-full bg-[oklch(12%_0_0)] border border-border text-muted-foreground hover:text-foreground hover:border-[oklch(30%_0_0)] transition-colors"
                    >
                      + {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Customer Notes */}
        <Section title="Customer Notes" sectionKey="notes" expanded={expanded.notes} onToggle={() => toggle("notes")}>
          <textarea
            value={customerNotes}
            onChange={e => setCustomerNotes(e.target.value)}
            placeholder="Notes visible to the customer..."
            className="field-textarea"
          />
        </Section>

        {/* Insurance Assessment */}
        <Section title="Insurance Assessment" sectionKey="insurance" expanded={expanded.insurance} onToggle={() => toggle("insurance")}>
          <textarea
            value={insuranceAssessment}
            onChange={e => setInsuranceAssessment(e.target.value)}
            placeholder="Insurance assessment notes..."
            className="field-textarea"
          />
        </Section>

        {/* Internal Notes */}
        <Section title="Internal Notes (Admin Only)" sectionKey="internal" expanded={expanded.internal} onToggle={() => toggle("internal")}>
          <textarea
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="Internal notes — not visible to client..."
            className="field-textarea"
          />
        </Section>

      </div>

      {/* Sticky Save Footer */}
      <div className="sticky-save-footer">
        <button
          className="btn-primary px-8"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </AdminLayout>
  );
}
