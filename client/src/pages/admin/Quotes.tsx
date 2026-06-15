import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Search, Mail, Copy, Edit, Trash2, Eye, ChevronDown,
  Flame, Thermometer, Snowflake, Clock, Archive, MoreHorizontal
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_ORDER, NEXT_STATUS_LABEL, QUOTE_TYPE_LABELS,
  getDaysLeft, formatCurrency, getPriceRange, type QuoteStatus
} from "@/lib/quoteHelpers";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  ...STATUS_ORDER.filter(s => s !== "archived").map(s => ({ key: s, label: STATUS_LABELS[s] })),
  { key: "archived", label: "Archived" },
];

function TemperatureIcon({ temp }: { temp: string }) {
  if (temp === "hot") return <Flame className="w-3 h-3" />;
  if (temp === "cold") return <Snowflake className="w-3 h-3" />;
  return <Thermometer className="w-3 h-3" />;
}

export default function QuotesPage() {
  const [, navigate] = useLocation();
  const [activeStatus, setActiveStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const quotesQuery = trpc.quotes.list.useQuery({
    status: activeStatus === "all" ? undefined : activeStatus,
    search: search || undefined,
    agencyId: agencyFilter !== "all" ? parseInt(agencyFilter) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }, { refetchInterval: 30000 });

  const countsQuery = trpc.quotes.statusCounts.useQuery(undefined, { refetchInterval: 30000 });
  const agenciesQuery = trpc.agencies.list.useQuery();

  const createMutation = trpc.quotes.create.useMutation({
    onSuccess: (data) => {
      navigate(`/admin/quotes/${data.id}/edit`);
      utils.quotes.list.invalidate();
      utils.quotes.statusCounts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => { utils.quotes.list.invalidate(); utils.quotes.statusCounts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.quotes.delete.useMutation({
    onSuccess: () => { utils.quotes.list.invalidate(); utils.quotes.statusCounts.invalidate(); toast.success("Quote deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const duplicateMutation = trpc.quotes.duplicate.useMutation({
    onSuccess: (data) => { navigate(`/admin/quotes/${data.id}/edit`); utils.quotes.list.invalidate(); utils.quotes.statusCounts.invalidate(); toast.success(`Duplicated as ${data.quoteNumber}`); },
    onError: (e) => toast.error(e.message),
  });

  const markEmailedMutation = trpc.quotes.markEmailed.useMutation({
    onSuccess: () => { utils.quotes.list.invalidate(); toast.success("Marked as emailed"); },
  });

  const quotes = quotesQuery.data ?? [];
  const counts = countsQuery.data ?? {};

  const getCount = (key: string) => {
    if (key === "all") return Object.values(counts).reduce((a, b) => a + b, 0);
    return counts[key] ?? 0;
  };

  const copyQuoteLink = (id: number) => {
    const url = `${window.location.origin}/quote/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Quote link copied");
  };

  return (
    <AdminLayout>
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Quotes</h1>
            <p className="text-sm text-muted-foreground">{quotes.length} quote{quotes.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => createMutation.mutate({})} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeStatus === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {tab.key === "archived" ? <Archive className="w-3.5 h-3.5" /> : null}
              {tab.label}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                activeStatus === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {getCount(tab.key)}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by quote #, client, address, or agent..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-44 bg-input border-border">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agenciesQuery.data?.map(a => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 bg-input border-border" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 bg-input border-border" />
        </div>

        {/* Quote list */}
        {quotesQuery.isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No quotes found</p>
            <p className="text-sm mt-1">Create a new quote to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map(quote => {
              const daysLeft = getDaysLeft(quote.expiryDate);
              const isExpanded = expandedId === quote.id;
              const nextStatusLabel = NEXT_STATUS_LABEL[quote.status as QuoteStatus];

              return (
                <div key={quote.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Main row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                    className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Quote info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-foreground text-sm">{quote.quoteNumber}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {QUOTE_TYPE_LABELS[quote.quoteType as keyof typeof QUOTE_TYPE_LABELS]?.split(" ")[0] ?? quote.quoteType}
                          </span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", `status-${quote.status}`)}>
                            {STATUS_LABELS[quote.status as QuoteStatus]}
                          </span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", `badge-${quote.temperature}`)}>
                            <TemperatureIcon temp={quote.temperature} />
                            {quote.temperature.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(quote.issueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-foreground truncate">
                          {quote.clientName || <span className="text-muted-foreground italic">No client name</span>}
                        </div>
                        {quote.propertyAddress && (
                          <div className="text-xs text-muted-foreground truncate">{quote.propertyAddress}</div>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {quote.agentEmail && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {quote.agentEmail}
                              {quote.emailedAt && <span className="text-green-500">✓ emailed</span>}
                            </span>
                          )}
                          {daysLeft !== null && (
                            <span className={cn("text-xs flex items-center gap-1", daysLeft <= 3 ? "text-destructive" : "text-muted-foreground")}>
                              <Clock className="w-3 h-3" />
                              {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
                            </span>
                          )}
                          {quote.viewCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {quote.viewCount} view{quote.viewCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded actions */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 bg-accent/20">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => navigate(`/admin/quotes/${quote.id}/email`)}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Email Template
                        </Button>

                        {nextStatusLabel && (
                          <Button
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: quote.id, status: NEXT_STATUS_LABEL[quote.status as QuoteStatus] ? (Object.entries(NEXT_STATUS_LABEL).find(([k]) => k === quote.status)?.[0] ? Object.entries({draft:"quote_sent",quote_sent:"accepted",accepted:"deposit_paid",deposit_paid:"scheduled",scheduled:"completed",completed:"invoice_paid"}).find(([k])=>k===quote.status)?.[1] as any : undefined) : undefined })}
                            disabled={updateStatusMutation.isPending}
                          >
                            {nextStatusLabel}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => copyQuoteLink(quote.id)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Quote Link
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => navigate(`/admin/quotes/${quote.id}/edit`)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => duplicateMutation.mutate({ id: quote.id })}
                          disabled={duplicateMutation.isPending}
                        >
                          Duplicate
                        </Button>

                        <a href={`/quote/${quote.id}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="text-xs h-7">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </a>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs h-7">
                              Status <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {STATUS_ORDER.map(s => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => updateStatusMutation.mutate({ id: quote.id, status: s })}
                                className={quote.status === s ? "font-semibold" : ""}
                              >
                                {STATUS_LABELS[s]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs h-7 ml-auto"
                          onClick={() => setDeleteId(quote.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the quote and all its data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); setDeleteId(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// Missing import fix
function FileText(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
