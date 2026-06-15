import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Search, Check, X, Phone, Mail, MapPin } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface AgencyForm { name: string; email: string; phone: string; address: string; notes: string; }
const emptyForm = (): AgencyForm => ({ name: "", email: "", phone: "", address: "", notes: "" });

export default function AgenciesPage() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AgencyForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const agenciesQuery = trpc.agencies.list.useQuery();
  const createMutation = trpc.agencies.create.useMutation({
    onSuccess: () => { utils.agencies.list.invalidate(); setShowForm(false); setForm(emptyForm()); toast.success("Agency added"); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.agencies.update.useMutation({
    onSuccess: () => { utils.agencies.list.invalidate(); setEditId(null); setForm(emptyForm()); setShowForm(false); toast.success("Agency updated"); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.agencies.delete.useMutation({
    onSuccess: () => { utils.agencies.list.invalidate(); setDeleteId(null); toast.success("Agency deleted"); },
    onError: e => toast.error(e.message),
  });

  const agencies = (agenciesQuery.data ?? []).filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (a: typeof agencies[0]) => {
    setEditId(a.id);
    setForm({ name: a.name, email: a.email ?? "", phone: a.phone ?? "", address: a.address ?? "", notes: a.notes ?? "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload = { name: form.name, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, notes: form.notes || undefined };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Agencies</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{agencies.length} agenc{agencies.length !== 1 ? "ies" : "y"}</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditId(null); setForm(emptyForm()); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Agency
          </button>
        </div>

        <div className="filter-bar mb-3">
          <div className="filter-search">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agencies..." />
          </div>
        </div>

        {showForm && (
          <div className="section-accordion mb-3 animate-fade-in">
            <div className="section-accordion-body">
              <h3 className="text-sm font-semibold mb-3 text-foreground">{editId ? "Edit Agency" : "New Agency"}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="field-label">Agency Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field-input" autoFocus />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="field-input" />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Address</label>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="field-input" />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field-textarea" />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary flex items-center gap-1.5" onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
                <button className="btn-secondary flex items-center gap-1.5" onClick={() => { setShowForm(false); setEditId(null); }}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {agenciesQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse border border-border" />)}</div>
        ) : agencies.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{search ? "No agencies match your search" : "No agencies yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agencies.map(a => (
              <div key={a.id} className="quote-card animate-fade-in">
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[oklch(14%_0_0)] border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{a.name}</div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {a.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</span>}
                        {a.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</span>}
                        {a.address && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{a.address}</span>}
                      </div>
                      {a.notes && <div className="text-xs text-muted-foreground mt-0.5 italic opacity-70">{a.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="quote-card-bottom-btn" onClick={() => startEdit(a)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="quote-card-bottom-btn danger" onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agency</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this agency.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
