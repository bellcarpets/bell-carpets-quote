import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check, Users, Phone, Mail, Building2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    onSuccess: () => { utils.contacts.list.invalidate(); toast.success("Contact deleted"); },
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
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Contacts</h1>
            <p className="text-sm text-muted-foreground">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => { setEditId(null); setForm(emptyForm()); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Contact
          </Button>
        </div>

        <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4 bg-input border-border" />

        {showForm && (
          <div className="bg-card border border-primary/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">{editId ? "Edit Contact" : "New Contact"}</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 bg-input border-border" autoFocus /></div>
              <div><Label className="text-xs text-muted-foreground">Role</Label><Input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Agent, PM, Owner..." className="mt-1 bg-input border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1 bg-input border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1 bg-input border-border" /></div>
              <div>
                <Label className="text-xs text-muted-foreground">Agency</Label>
                <Select value={form.agencyId || "none"} onValueChange={v => setForm(p => ({ ...p, agencyId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1 bg-input border-border"><SelectValue placeholder="No agency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No agency</SelectItem>
                    {agenciesQuery.data?.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-muted-foreground">Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 bg-input border-border" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}><Check className="w-4 h-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            </div>
          </div>
        )}

        {contactsQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No contacts yet</p></div>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.role && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{c.role}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.agencyId && <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{getAgencyName(c.agencyId)}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Contact</AlertDialogTitle><AlertDialogDescription>This will permanently delete this contact.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
