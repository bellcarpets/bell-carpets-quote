import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check, GripVertical, BookOpen } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface EditState { id: number; title: string; description: string; }

export default function LibraryPage() {
  const utils = trpc.useUtils();
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const itemsQuery = trpc.library.list.useQuery();
  const createMutation = trpc.library.create.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); setNewTitle(""); setNewDesc(""); setAdding(false); toast.success("Item added"); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.library.update.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); setEditing(null); toast.success("Item updated"); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.library.delete.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); toast.success("Item deleted"); },
    onError: e => toast.error(e.message),
  });

  const items = itemsQuery.data ?? [];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Library
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Scope-of-work text snippets for quick-add to quotes</p>
          </div>
          <Button onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="bg-card border border-primary/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">New Library Item</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Title *</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Diamond grind substrate" className="mt-1 bg-input border-border" autoFocus />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Full description text..." className="mt-1 bg-input border-border min-h-20 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => createMutation.mutate({ title: newTitle, description: newDesc })} disabled={!newTitle || createMutation.isPending}>
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewTitle(""); setNewDesc(""); }}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Items list */}
        {itemsQuery.isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No library items yet. Add scope-of-work snippets to speed up quoting.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                {editing?.id === item.id ? (
                  <div className="space-y-3">
                    <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="bg-input border-border" />
                    <Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="bg-input border-border min-h-16 text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: item.id, title: editing.title, description: editing.description })} disabled={updateMutation.isPending}>
                        <Check className="w-4 h-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{item.title}</div>
                      {item.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing({ id: item.id, title: item.title, description: item.description ?? "" })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Library Item</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
