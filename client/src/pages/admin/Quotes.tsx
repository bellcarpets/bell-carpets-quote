import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Mail, Copy, Edit, Eye, ChevronDown, ChevronUp,
  Archive, FileText, Clock, Search, AlignLeft
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_ORDER, QUOTE_TYPE_LABELS,
  getDaysLeft, type QuoteStatus
} from "@/lib/quoteHelpers";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const NEXT_ACTION: Record<string, string> = {
  draft: "Mark as Quote Sent",
  quote_sent: "Mark as Accepted",
  accepted: "Mark as Deposit Paid",
  deposit_paid: "Mark as Scheduled",
  scheduled: "Mark as Completed",
  completed: "Mark as Invoice Paid",
};

const NEXT_STATUS: Record<string, string> = {
  draft: "quote_sent",
  quote_sent: "accepted",
  accepted: "deposit_paid",
  deposit_paid: "scheduled",
  scheduled: "completed",
  completed: "invoice_paid",
};

const STATUS_PIPELINE = ["draft", "quote_sent", "accepted", "deposit_paid", "scheduled", "completed", "invoice_paid", "expired"];

function TempBadge({ temp }: { temp: string }) {
  return <span className={`badge-${temp}`}>{temp.toUpperCase()}</span>;
}

function QuoteTypeBadge({ type }: { type: string }) {
  if (type === "homeowner") return <span className="badge-homeowner">Homeowner</span>;
  if (type === "agency_single") return <span className="badge-agency-single">Agency Single</span>;
  return <span className="badge-agent">Agent</span>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[0.7rem] font-medium status-${status.replace("_", "-")}`}>
      {STATUS_LABELS[status as QuoteStatus] ?? status}
    </span>
  );
}

export default function QuotesPage() {
  const [, navigate] = useLocation();
  const [activeStatus, setActiveStatus] = useState("draft");
  const [search, setSearch] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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
    onSuccess: () => {
      utils.quotes.list.invalidate();
      utils.quotes.statusCounts.invalidate();
      toast.success("Quote deleted");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const duplicateMutation = trpc.quotes.duplicate.useMutation({
    onSuccess: (data) => {
      navigate(`/admin/quotes/${data.id}/edit`);
      utils.quotes.list.invalidate();
      utils.quotes.statusCounts.invalidate();
      toast.success(`Duplicated as ${data.quoteNumber}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const quotes = quotesQuery.data ?? [];
  const counts = countsQuery.data ?? {} as Record<string, number>;

  const getCount = (key: string) => {
    if (key === "all") return Object.values(counts).reduce((a, b) => a + b, 0);
    return counts[key] ?? 0;
  };

  const copyQuoteLink = (id: number) => {
    const url = `${window.location.origin}/quote/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Quote link copied");
  };

  const handleStatusChange = (quoteId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: quoteId, status: newStatus as any });
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* Status filter grid — 3 columns like original */}
        <div className="status-filter-grid">
          {STATUS_PIPELINE.filter(s => s !== "expired" && s !== "invoice_paid").map(s => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={`status-filter-btn${activeStatus === s ? " active" : ""}`}
            >
              <div className="count">{getCount(s)}</div>
              <div className="label">{STATUS_LABELS[s as QuoteStatus]}</div>
            </button>
          ))}
          <button
            onClick={() => setActiveStatus("invoice_paid")}
            className={`status-filter-btn${activeStatus === "invoice_paid" ? " active" : ""}`}
          >
            <div className="count">{getCount("invoice_paid")}</div>
            <div className="label">Invoice Paid</div>
          </button>
          <button
            onClick={() => setActiveStatus("expired")}
            className={`status-filter-btn${activeStatus === "expired" ? " active" : ""}`}
          >
            <div className="count">{getCount("expired")}</div>
            <div className="label">Expired</div>
          </button>
        </div>

        {/* Archived button */}
        <button
          onClick={() => { setActiveStatus("archived"); setShowArchived(true); }}
          className={`archived-btn${activeStatus === "archived" ? " border-[oklch(100%_0_0/0.2)] text-foreground" : ""}`}
        >
          <Archive className="w-4 h-4" />
          <span>Archived Quotes</span>
        </button>

        {/* Search + filters */}
        <div className="filter-bar flex-wrap">
          <div className="filter-search flex-1 min-w-48">
            <Search className="w-4 h-4 shrink-0" />
            <input
              placeholder="Search by quote #, client, address, or agent..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={agencyFilter}
            onChange={e => setAgencyFilter(e.target.value)}
            className="field-select w-44"
          >
            <option value="all">All Agents</option>
            {agenciesQuery.data?.map(a => (
              <option key={a.id} value={String(a.id)}>{a.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="field-input w-36"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="field-input w-36"
          />
        </div>

        {/* Quote list */}
        {quotesQuery.isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-card rounded-lg animate-pulse border border-border" />)}
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">No quotes found</p>
            <p className="text-xs mt-1 opacity-60">Create a new quote to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map(quote => {
              const daysLeft = getDaysLeft(quote.expiryDate);
              const isExpanded = expandedId === quote.id;
              const nextAction = NEXT_ACTION[quote.status];
              const nextStatus = NEXT_STATUS[quote.status];

              return (
                <div key={quote.id} className="quote-card animate-fade-in">
                  {/* Main card row — clickable to expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                    className="w-full text-left px-4 py-3 hover:bg-[oklch(100%_0_0/0.02)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Top row: quote number, type, status, temp, date */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-foreground text-sm tracking-wide">{quote.quoteNumber}</span>
                          <QuoteTypeBadge type={quote.quoteType} />
                          <StatusBadge status={quote.status} />
                          <TempBadge temp={quote.temperature} />
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(quote.issueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </span>
                        </div>

                        {/* Client name */}
                        <div className="text-sm font-medium text-foreground mb-0.5">
                          {quote.clientName || <span className="text-muted-foreground italic text-xs">No client name</span>}
                        </div>

                        {/* Address */}
                        {quote.propertyAddress && (
                          <div className="text-xs text-muted-foreground mb-1">{quote.propertyAddress}</div>
                        )}

                        {/* Agent email + meta */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {quote.agentEmail && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {quote.agentEmail}
                              {quote.emailedAt && <span className="text-[oklch(70%_0.15_145)] ml-1">✓ emailed</span>}
                            </span>
                          )}
                          {daysLeft !== null && (
                            <span className={`text-xs flex items-center gap-1 ${daysLeft <= 3 ? "text-[oklch(65%_0.18_30)]" : "text-muted-foreground"}`}>
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

                      {/* Chevron */}
                      <div className="text-muted-foreground mt-1 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded action rows */}
                  {isExpanded && (
                    <div className="quote-card-actions">
                      {/* Email Template */}
                      <button
                        className="action-btn-email"
                        onClick={() => navigate(`/admin/quotes/${quote.id}/email`)}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email Template
                      </button>

                      {/* Next status action */}
                      {nextAction && nextStatus && (
                        <button
                          className="action-btn-mark"
                          onClick={() => handleStatusChange(quote.id, nextStatus)}
                          disabled={updateStatusMutation.isPending}
                        >
                          {nextAction}
                        </button>
                      )}

                      {/* Copy Quote Link */}
                      <button
                        className="action-btn-copy"
                        onClick={() => copyQuoteLink(quote.id)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Quote Link
                      </button>

                      {/* Text Templates dropdown placeholder */}
                      <button className="action-btn-mark">
                        <AlignLeft className="w-3.5 h-3.5" />
                        Text Templates
                      </button>

                      {/* Bottom row: Edit, Duplicate, View, Status, Delete */}
                      <div className="quote-card-bottom">
                        <button
                          className="quote-card-bottom-btn"
                          onClick={() => navigate(`/admin/quotes/${quote.id}/edit`)}
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          className="quote-card-bottom-btn"
                          onClick={() => duplicateMutation.mutate({ id: quote.id })}
                          disabled={duplicateMutation.isPending}
                        >
                          Duplicate
                        </button>
                        <a
                          href={`/quote/${quote.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="quote-card-bottom-btn"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </a>

                        {/* Status dropdown */}
                        <div className="relative group">
                          <button className="quote-card-bottom-btn">
                            Status <ChevronDown className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-full right-0 mb-1 bg-[oklch(12%_0_0)] border border-border rounded-lg shadow-xl z-20 min-w-40 hidden group-focus-within:block">
                            {STATUS_PIPELINE.map(s => (
                              <button
                                key={s}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-[oklch(16%_0_0)] text-muted-foreground hover:text-foreground transition-colors first:rounded-t-lg last:rounded-b-lg"
                                onClick={() => handleStatusChange(quote.id, s)}
                              >
                                {STATUS_LABELS[s as QuoteStatus]}
                              </button>
                            ))}
                            <button
                              className="w-full text-left px-3 py-2 text-xs hover:bg-[oklch(16%_0_0)] text-muted-foreground hover:text-foreground transition-colors rounded-b-lg border-t border-border"
                              onClick={() => handleStatusChange(quote.id, "archived")}
                            >
                              Archive
                            </button>
                          </div>
                        </div>

                        <button
                          className="quote-card-bottom-btn danger"
                          onClick={() => setDeleteId(quote.id)}
                        >
                          Delete
                        </button>
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
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the quote. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
