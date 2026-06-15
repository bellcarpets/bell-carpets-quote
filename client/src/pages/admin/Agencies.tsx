import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check, Building2, Phone, Mail, MapPin } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    onSuccess: () => { utils.agencies.list.invalidate(); toast.success("Agency deleted"); },
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
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Agencies</h1>
            <p className="text-sm text-muted-foreground">{agencies.length} agenc{agencies.length !== 1 ? "ies" : "y"}</p>
          </div>
          <Button onClick={() => { setEditId(null); setForm(emptyForm()); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Agency
          </Button>
        </div>

        <Input placeholder="Search agencies..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4 bg-input border-border" />

        {showForm && (
          <div className="bg-card border border-primary/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">{editId ? "Edit Agency" : "New Agency"}</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2"><Label className="text-xs text-muted-foreground">Agency Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 bg-input border-border" autoFocus /></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1 bg-input border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1 bg-input border-border" /></div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground">Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1 bg-input border-border" /></div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground">Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 bg-input border-border min-h-16 text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}><Check className="w-4 h-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            </div>
          </div>
        )}

        {agenciesQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
        ) : agencies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No agencies yet</p></div>
        ) : (
          <div className="space-y-2">
            {agencies.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{a.name}</div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {a.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</span>}
                    {a.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</span>}
                    {a.address && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{a.address}</span>}
                  </div>
                  {a.notes && <div className="text-xs text-muted-foreground mt-1 italic">{a.notes}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Agency</AlertDialogTitle><AlertDialogDescription>This will permanently delete this agency.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
