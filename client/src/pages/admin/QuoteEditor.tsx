import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Save, ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  Flame, Thermometer, Snowflake, Copy, Mail, FileDown
} from "lucide-react";
import {
  QUOTE_TYPE_LABELS, UNDERLAY_LABELS, STATUS_LABELS, STATUS_ORDER, type QuoteStatus
} from "@/lib/quoteHelpers";

const TIER_LEVELS = ["good", "better", "best"] as const;
const TIER_DISPLAY = { good: "GOOD", better: "BETTER", best: "BEST" };
const TIER_COLOURS = {
  good: "border-muted",
  better: "border-primary/50",
  best: "border-primary",
};

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tiers: true, underlay: true, services: true, scope: true, notes: false, payment: true, internal: false,
  });

  // Load quote data
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
        const existing = q.tiers.find((x: any) => x.tier === t);
        return existing ? {
          tier: t,
          label: existing.label ?? TIER_DISPLAY[t],
          productName: existing.productName ?? "",
          manufacturer: existing.manufacturer ?? "",
          fibre: existing.fibre ?? "",
          pileType: existing.pileType ?? "",
          price: existing.price ?? "",
          heroImageUrl: existing.heroImageUrl ?? "",
          productUrl: existing.productUrl ?? "",
          primaryColour: existing.primaryColour ?? "",
          accentColour: existing.accentColour ?? "",
          carpetColours: existing.carpetColours ?? "",
          badges: existing.badges ?? "",
        } : { tier: t, label: TIER_DISPLAY[t] };
      }));
    }
    if (q.services) {
      setServices(q.services.map((s: any) => ({ title: s.title, description: s.description ?? "", price: s.price ?? "", sortOrder: s.sortOrder })));
    }
  }, [quoteQuery.data]);

  const toggleSection = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const updateTier = (tier: "good" | "better" | "best", field: string, value: string) => {
    setTiers(prev => prev.map(t => t.tier === tier ? { ...t, [field]: value } : t));
  };

  const addService = () => setServices(prev => [...prev, { title: "", description: "", price: "0", sortOrder: prev.length }]);
  const removeService = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: string, value: string) => {
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: quoteId,
      quoteType: quoteType as any,
      status: status as any,
      temperature: temperature as any,
      clientName,
      agentEmail,
      agentPhone,
      agencyId: agencyId ? parseInt(agencyId) : null,
      propertyAddress,
      issueDate,
      validDays,
      expiryDate,
      discount,
      credit,
      paymentTermsDays,
      scopeDescription,
      customerNotes,
      internalNotes,
      insuranceAssessment,
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
    return <AdminLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></AdminLayout>;
  }

  if (!q) {
    return <AdminLayout><div className="p-8 text-center text-muted-foreground">Quote not found</div></AdminLayout>;
  }

  const SectionHeader = ({ title, sectionKey }: { title: string; sectionKey: string }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
    >
      {title}
      {expandedSections[sectionKey] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{q.quoteNumber}</h1>
            <p className="text-xs text-muted-foreground">{q.propertyAddress || "No address set"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyQuoteLink}>
              <Copy className="w-4 h-4 mr-1" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/quotes/${quoteId}/email`)}>
              <Mail className="w-4 h-4 mr-1" /> Email
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Quote Header Fields */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">Quote #</Label>
                <div className="font-semibold text-foreground mt-1">{q.quoteNumber}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Issue Date</Label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="mt-1 bg-input border-border h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valid Days</Label>
                <Input type="number" value={validDays} onChange={e => setValidDays(parseInt(e.target.value))} className="mt-1 bg-input border-border h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="mt-1 bg-input border-border h-8 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1 bg-input border-border h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quote Type</Label>
                <Select value={quoteType} onValueChange={setQuoteType}>
                  <SelectTrigger className="mt-1 bg-input border-border h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homeowner">Homeowner</SelectItem>
                    <SelectItem value="agency_3tier">Real Estate Agency 3-Tier</SelectItem>
                    <SelectItem value="agency_single">Agency Single Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Temperature</Label>
                <div className="flex gap-1 mt-1">
                  {(["hot", "warm", "cold"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTemperature(t)}
                      className={cn(
                        "flex-1 py-1 rounded text-xs font-medium transition-all",
                        temperature === t ? `badge-${t}` : "bg-secondary text-secondary-foreground opacity-50 hover:opacity-75"
                      )}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Discount ($)</Label>
                <Input value={discount} onChange={e => setDiscount(e.target.value)} className="mt-1 bg-input border-border h-8 text-sm" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Credit ($)</Label>
                <Input value={credit} onChange={e => setCredit(e.target.value)} className="mt-1 bg-input border-border h-8 text-sm" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Payment Terms (days)</Label>
                <Input type="number" value={paymentTermsDays} onChange={e => setPaymentTermsDays(parseInt(e.target.value))} className="mt-1 bg-input border-border h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Client / Agent */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Client & Agent</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Client Name</Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} className="mt-1 bg-input border-border" placeholder="Client name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Property Address</Label>
                <Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} className="mt-1 bg-input border-border" placeholder="123 Main St, Suburb QLD 4000" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Agent Email</Label>
                <Input type="email" value={agentEmail} onChange={e => setAgentEmail(e.target.value)} className="mt-1 bg-input border-border" placeholder="agent@agency.com.au" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Agent Phone</Label>
                <Input value={agentPhone} onChange={e => setAgentPhone(e.target.value)} className="mt-1 bg-input border-border" placeholder="0412 345 678" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Agency</Label>
                <Select value={agencyId || "none"} onValueChange={v => setAgencyId(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1 bg-input border-border">
                    <SelectValue placeholder="Select agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No agency</SelectItem>
                    {agenciesQuery.data?.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="w-full" onClick={copyQuoteLink}>
                  <Copy className="w-4 h-4 mr-2" /> Resend Quote Link
                </Button>
              </div>
            </div>
          </div>

          {/* 3-Tier Pricing */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader title="3-Tier Pricing (GOOD / BETTER / BEST)" sectionKey="tiers" />
            {expandedSections.tiers && (
              <div className="space-y-4 mt-3">
                {TIER_LEVELS.map(tierLevel => {
                  const tier = tiers.find(t => t.tier === tierLevel) ?? { tier: tierLevel };
                  return (
                    <div key={tierLevel} className={cn("border rounded-lg p-4", TIER_COLOURS[tierLevel])}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded", tierLevel === "best" ? "bg-primary text-primary-foreground" : tierLevel === "better" ? "bg-primary/30 text-primary" : "bg-secondary text-secondary-foreground")}>
                          {TIER_DISPLAY[tierLevel]}
                        </span>
                        <Input
                          value={tier.label ?? TIER_DISPLAY[tierLevel]}
                          onChange={e => updateTier(tierLevel, "label", e.target.value)}
                          className="h-7 text-sm bg-input border-border w-32"
                          placeholder="Label"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Product Name</Label>
                          <Input value={tier.productName ?? ""} onChange={e => updateTier(tierLevel, "productName", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="e.g. Hycraft Wool Blend" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                          <Input value={tier.manufacturer ?? ""} onChange={e => updateTier(tierLevel, "manufacturer", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="e.g. Hycraft" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Price (supply & install)</Label>
                          <Input value={tier.price ?? ""} onChange={e => updateTier(tierLevel, "price", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="0.00" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Fibre</Label>
                          <Input value={tier.fibre ?? ""} onChange={e => updateTier(tierLevel, "fibre", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="e.g. 80% Wool" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Pile Type</Label>
                          <Input value={tier.pileType ?? ""} onChange={e => updateTier(tierLevel, "pileType", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="e.g. Cut Pile" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Primary Colour</Label>
                          <Input value={tier.primaryColour ?? ""} onChange={e => updateTier(tierLevel, "primaryColour", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="e.g. Charcoal" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Accent Colour</Label>
                          <Input value={tier.accentColour ?? ""} onChange={e => updateTier(tierLevel, "accentColour", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="e.g. Silver" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Carpet Colours</Label>
                          <Input value={tier.carpetColours ?? ""} onChange={e => updateTier(tierLevel, "carpetColours", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="Charcoal, Silver Birch, Ocean" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Badges/Certifications</Label>
                          <Input value={tier.badges ?? ""} onChange={e => updateTier(tierLevel, "badges", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="e.g. GreenTag, NZ Wool" />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-muted-foreground">Hero Image URL</Label>
                          <Input value={tier.heroImageUrl ?? ""} onChange={e => updateTier(tierLevel, "heroImageUrl", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="https://..." />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Product URL</Label>
                          <Input value={tier.productUrl ?? ""} onChange={e => updateTier(tierLevel, "productUrl", e.target.value)} className="mt-1 h-8 text-sm bg-input border-border" placeholder="https://..." />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Underlay */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader title="Underlay" sectionKey="underlay" />
            {expandedSections.underlay && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                {(["protect", "ultimate", "extra", "eureka"] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setUnderlayOption(underlayOption === opt ? "" : opt)}
                    className={cn(
                      "p-3 rounded-lg border text-sm font-medium transition-all text-left",
                      underlayOption === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-input text-foreground hover:border-primary/50"
                    )}
                  >
                    <div className="font-semibold text-xs mb-0.5">Dunlop Springtred</div>
                    <div className="capitalize">{opt}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Additional Services */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader title="Additional Services" sectionKey="services" />
            {expandedSections.services && (
              <div className="mt-3 space-y-2">
                {services.map((service, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-input rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input value={service.title} onChange={e => updateService(i, "title", e.target.value)} placeholder="Service title" className="bg-background border-border h-8 text-sm" />
                      <Input value={service.description ?? ""} onChange={e => updateService(i, "description", e.target.value)} placeholder="Description (optional)" className="bg-background border-border h-8 text-sm" />
                      <Input value={service.price ?? ""} onChange={e => updateService(i, "price", e.target.value)} placeholder="Price" className="bg-background border-border h-8 text-sm" />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeService(i)} className="text-destructive hover:text-destructive h-8 w-8 p-0 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addService} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Add Service
                </Button>
              </div>
            )}
          </div>

          {/* Scope of Works */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader title="Scope of Works" sectionKey="scope" />
            {expandedSections.scope && (
              <div className="mt-3 space-y-3">
                <Textarea
                  value={scopeDescription}
                  onChange={e => setScopeDescription(e.target.value)}
                  placeholder="Describe the scope of works..."
                  className="bg-input border-border min-h-24 text-sm"
                />
                {libraryQuery.data && libraryQuery.data.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Quick-add from Library</Label>
                    <div className="flex flex-wrap gap-1">
                      {libraryQuery.data.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setScopeDescription(prev => prev ? `${prev}\n${item.title}${item.description ? `: ${item.description}` : ""}` : `${item.title}${item.description ? `: ${item.description}` : ""}`)}
                          className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          + {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer Notes */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader title="Customer Notes" sectionKey="notes" />
            {expandedSections.notes && (
              <Textarea
                value={customerNotes}
                onChange={e => setCustomerNotes(e.target.value)}
                placeholder="Notes visible to the customer..."
                className="mt-3 bg-input border-border min-h-20 text-sm"
              />
            )}
          </div>

          {/* Insurance Assessment */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader title="Insurance Assessment" sectionKey="insurance" />
            {expandedSections.insurance && (
              <Textarea
                value={insuranceAssessment}
                onChange={e => setInsuranceAssessment(e.target.value)}
                placeholder="Insurance assessment notes..."
                className="mt-3 bg-input border-border min-h-20 text-sm"
              />
            )}
          </div>

          {/* Internal Notes */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader title="Internal Notes (Admin Only)" sectionKey="internal" />
            {expandedSections.internal && (
              <Textarea
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder="Internal notes — not visible to client..."
                className="mt-3 bg-input border-border min-h-20 text-sm"
              />
            )}
          </div>

          {/* Save button at bottom */}
          <div className="flex justify-end pb-8">
            <Button onClick={handleSave} disabled={updateMutation.isPending} size="lg">
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Quote"}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
