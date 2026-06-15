import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Search, Check, X, Mail, Phone, Building2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface ContactForm { name: string; email: string; phone: string; role: string; agencyId: string; notes: string; }
const emptyForm = (): ContactForm => ({ name: "", email: "", phone: "", role: "", agencyId: "", notes: "" });

export default function ContactsPage() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const contactsQuery = trpc.contacts.list.useQuery();
  const agenciesQuery = trpc.agencies.list.useQuery();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => { utils.contacts.list.invalidate(); setShowForm(false); setForm(emptyForm()); toast.success("Contact added"); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => { utils.contacts.list.invalidate(); setEditId(null); setForm(emptyForm()); toast.success("Contact updated"); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => { utils.contacts.list.invalidate(); setDeleteId(null); toast.success("Contact deleted"); },
    onError: e => toast.error(e.message),
  });

  const contacts = (contactsQuery.data ?? []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (c: typeof contacts[0]) => {
    setEditId(c.id);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", role: c.role ?? "", agencyId: c.agencyId ? String(c.agencyId) : "", notes: c.notes ?? "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload = { name: form.name, email: form.email || undefined, phone: form.phone || undefined, role: form.role || undefined, agencyId: form.agencyId ? parseInt(form.agencyId) : undefined, notes: form.notes || undefined };
    if (editId) { updateMutation.mutate({ id: editId, ...payload }); }
    else { createMutation.mutate(payload); }
  };

  const getAgencyName = (id: number | null | undefined) => agenciesQuery.data?.find(a => a.id === id)?.name ?? "";

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Contacts</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditId(null); setForm(emptyForm()); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
        </div>

        <div className="filter-bar mb-3">
          <div className="filter-search">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." />
          </div>
        </div>

        {showForm && (
          <div className="section-accordion mb-3 animate-fade-in">
            <div className="section-accordion-body">
              <h3 className="text-sm font-semibold mb-3 text-foreground">{editId ? "Edit Contact" : "New Contact"}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="field-label">Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field-input" autoFocus />
                </div>
                <div>
                  <label className="field-label">Role</label>
                  <input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Agent, PM, Owner..." className="field-input" />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Agency</label>
                  <select value={form.agencyId || "none"} onChange={e => setForm(p => ({ ...p, agencyId: e.target.value === "none" ? "" : e.target.value }))} className="field-select">
                    <option value="none">No agency</option>
                    {agenciesQuery.data?.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Notes</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field-input" />
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

        {contactsQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse border border-border" />)}</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{search ? "No contacts match your search" : "No contacts yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="quote-card animate-fade-in">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[oklch(14%_0_0)] border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        {c.role && <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[oklch(12%_0_0)] border border-border text-muted-foreground">{c.role}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                        {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                        {c.agencyId && <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{getAgencyName(c.agencyId)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="quote-card-bottom-btn" onClick={() => startEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="quote-card-bottom-btn danger" onClick={() => setDeleteId(c.id)}>
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
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this contact.</AlertDialogDescription>
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
