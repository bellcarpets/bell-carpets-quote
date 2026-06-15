import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, X, Check, Receipt, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/quoteHelpers";

const STATUS_STYLES: Record<string, string> = {
  unpaid: "bg-amber-900/30 text-amber-300 border-amber-700",
  paid: "bg-green-900/30 text-green-300 border-green-700",
  overdue: "bg-red-900/30 text-red-300 border-red-700",
  cancelled: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  unpaid: <Clock className="w-3 h-3" />,
  paid: <CheckCircle2 className="w-3 h-3" />,
  overdue: <AlertCircle className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
};

export default function InvoicesPage() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ quoteId: "", amount: "", dueDate: "", notes: "" });

  const invoicesQuery = trpc.invoices.list.useQuery();
  const quotesQuery = trpc.quotes.list.useQuery({});
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

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Invoices</h1>
            <p className="text-sm text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
        </div>

        {showForm && (
          <div className="bg-card border border-primary/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">New Invoice</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs text-muted-foreground">Quote *</Label>
                <select
                  value={form.quoteId}
                  onChange={e => setForm(p => ({ ...p, quoteId: e.target.value }))}
                  className="mt-1 w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
                >
                  <option value="">Select quote</option>
                  {(quotesQuery.data ?? []).map((q: any) => (
                    <option key={q.id} value={String(q.id)}>{q.quoteNumber} — {q.propertyAddress || q.clientName || "No address"}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount ($) *</Label>
                <Input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate({ quoteId: parseInt(form.quoteId), amount: form.amount, dueDate: form.dueDate || undefined, notes: form.notes || undefined })} disabled={!form.quoteId || !form.amount || createMutation.isPending}>
                <Check className="w-4 h-4 mr-1" /> Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            </div>
          </div>
        )}

        {invoicesQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No invoices yet</p></div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv: any) => {
              const overdue = isOverdue(inv);
              const effectiveStatus = overdue && inv.status === "unpaid" ? "overdue" : inv.status;
              return (
                <div key={inv.id} className={cn("bg-card border rounded-xl p-4", overdue ? "border-red-800" : "border-border")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{inv.invoiceNumber}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded border flex items-center gap-1", STATUS_STYLES[effectiveStatus])}>
                          {STATUS_ICONS[effectiveStatus]} {effectiveStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{getQuoteLabel(inv.quoteId)}</div>
                      {inv.dueDate && (
                        <div className={cn("text-xs mt-0.5", overdue ? "text-red-400" : "text-muted-foreground")}>
                          Due: {new Date(inv.dueDate).toLocaleDateString("en-AU")}
                          {overdue && " — OVERDUE"}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-foreground">{formatCurrency(inv.amount)}</div>
                      {inv.status !== "paid" && inv.status !== "cancelled" && (
                        <div className="flex gap-1 mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-400 border-green-800 hover:bg-green-900/30"
                            onClick={() => updateMutation.mutate({ id: inv.id, status: "paid", paidAt: new Date().toISOString() })}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => updateMutation.mutate({ id: inv.id, status: "cancelled" })}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      {inv.status === "paid" && inv.paidAt && (
                        <div className="text-xs text-green-400 mt-1">Paid {new Date(inv.paidAt).toLocaleDateString("en-AU")}</div>
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
