import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Plus, X, Check, Receipt, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/quoteHelpers";

export default function InvoicesPage() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ quoteId: "", amount: "", dueDate: "", notes: "" });

  const invoicesQuery = trpc.invoices.list.useQuery();
  const quotesQuery = trpc.quotes.list.useQuery();
  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => { utils.invoices.list.invalidate(); setShowForm(false); setForm({ quoteId: "", amount: "", dueDate: "", notes: "" }); toast.success("Invoice created"); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess: () => { utils.invoices.list.invalidate(); toast.success("Invoice updated"); },
    onError: e => toast.error(e.message),
  });

  const invoices = invoicesQuery.data ?? [];
  const getQuoteLabel = (id: number | null | undefined) => {
    if (!id) return "";
    const q = (quotesQuery.data ?? []).find((x: any) => x.id === id);
    return q ? `${q.quoteNumber}${q.propertyAddress ? ` — ${q.propertyAddress}` : ""}` : `#${id}`;
  };

  const isOverdue = (inv: any) => inv.status === "unpaid" && inv.dueDate && new Date(inv.dueDate) < new Date();

  const statusBadge = (inv: any) => {
    const overdue = isOverdue(inv);
    const s = overdue ? "overdue" : inv.status;
    const map: Record<string, string> = {
      unpaid: "status-scheduled",
      paid: "status-invoice_paid",
      overdue: "status-expired",
      cancelled: "status-archived",
    };
    return <span className={`status-badge ${map[s] ?? "status-draft"}`}>{s.toUpperCase()}</span>;
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Invoices</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </button>
        </div>

        {showForm && (
          <div className="section-accordion mb-3 animate-fade-in">
            <div className="section-accordion-body">
              <h3 className="text-sm font-semibold mb-3 text-foreground">New Invoice</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="field-label">Quote *</label>
                  <select value={form.quoteId} onChange={e => setForm(p => ({ ...p, quoteId: e.target.value }))} className="field-select">
                    <option value="">Select quote</option>
                    {(quotesQuery.data ?? []).map((q: any) => (
                      <option key={q.id} value={String(q.id)}>{q.quoteNumber} — {q.propertyAddress || q.clientName || "No address"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Amount ($) *</label>
                  <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="field-input" />
                </div>
                <div>
                  <label className="field-label">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Notes</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field-input" />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary flex items-center gap-1.5" onClick={() => createMutation.mutate({ quoteId: parseInt(form.quoteId), amount: form.amount, dueDate: form.dueDate || undefined, notes: form.notes || undefined })} disabled={!form.quoteId || !form.amount || createMutation.isPending}>
                  <Check className="w-3.5 h-3.5" /> Create
                </button>
                <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowForm(false)}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {invoicesQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse border border-border" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No invoices yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv: any) => {
              const overdue = isOverdue(inv);
              return (
                <div key={inv.id} className={`quote-card animate-fade-in ${overdue ? "border-[oklch(35%_0.15_25)]" : ""}`}>
                  <div className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{inv.invoiceNumber}</span>
                        {statusBadge(inv)}
                      </div>
                      <div className="text-xs text-muted-foreground">{getQuoteLabel(inv.quoteId)}</div>
                      {inv.dueDate && (
                        <div className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? "text-[oklch(65%_0.18_25)]" : "text-muted-foreground"}`}>
                          {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          Due: {new Date(inv.dueDate).toLocaleDateString("en-AU")}
                          {overdue && " — OVERDUE"}
                        </div>
                      )}
                      {inv.notes && <div className="text-xs text-muted-foreground mt-0.5 italic">{inv.notes}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-foreground">{formatCurrency(parseFloat(inv.amount))}</div>
                      {inv.status === "paid" && inv.paidAt && (
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          Paid {new Date(inv.paidAt).toLocaleDateString("en-AU")}
                        </div>
                      )}
                      {inv.status !== "paid" && inv.status !== "cancelled" && (
                        <div className="flex gap-1 mt-1.5 justify-end">
                          <button
                            className="text-xs px-2.5 py-1 rounded border border-[oklch(30%_0.1_145)] text-[oklch(65%_0.15_145)] hover:bg-[oklch(12%_0.04_145)] transition-colors flex items-center gap-1"
                            onClick={() => updateMutation.mutate({ id: inv.id, status: "paid", paidAt: new Date().toISOString() })}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Mark Paid
                          </button>
                          <button
                            className="quote-card-bottom-btn text-xs px-2.5 py-1"
                            onClick={() => updateMutation.mutate({ id: inv.id, status: "cancelled" })}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
