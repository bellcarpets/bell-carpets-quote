import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Check, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function Library() {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.library.list.useQuery();

  const createMutation = trpc.library.create.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); setShowAdd(false); setNewTitle(""); setNewDesc(""); toast.success("Snippet added"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.library.update.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); setEditId(null); toast.success("Snippet updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.library.delete.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); setDeleteId(null); toast.success("Snippet deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const items = listQuery.data ?? [];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Library</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Scope-of-work text snippets for quick insertion</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Snippet
          </button>
        </div>

        {showAdd && (
          <div className="section-accordion mb-3 animate-fade-in">
            <div className="section-accordion-body">
              <div className="space-y-3">
                <div>
                  <label className="field-label">Title</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="field-input" placeholder="e.g. Full Subfloor Preparation" autoFocus />
                </div>
                <div>
                  <label className="field-label">Description (optional)</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="field-textarea" placeholder="Detailed description..." />
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary flex items-center gap-1.5" onClick={() => createMutation.mutate({ title: newTitle, description: newDesc || undefined })} disabled={!newTitle.trim() || createMutation.isPending}>
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                  <button className="btn-secondary flex items-center gap-1.5" onClick={() => { setShowAdd(false); setNewTitle(""); setNewDesc(""); }}>
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {listQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse border border-border" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No snippets yet</p>
            <p className="text-xs mt-1 opacity-60">Add scope-of-work text snippets to reuse across quotes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="quote-card animate-fade-in">
                {editId === item.id ? (
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="field-label">Title</label>
                      <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="field-input" autoFocus />
                    </div>
                    <div>
                      <label className="field-label">Description</label>
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="field-textarea" />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-primary flex items-center gap-1.5" onClick={() => updateMutation.mutate({ id: item.id, title: editTitle, description: editDesc || undefined })} disabled={!editTitle.trim() || updateMutation.isPending}>
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button className="btn-secondary flex items-center gap-1.5" onClick={() => setEditId(null)}>
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      {item.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button className="quote-card-bottom-btn" onClick={() => { setEditId(item.id); setEditTitle(item.title); setEditDesc(item.description ?? ""); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="quote-card-bottom-btn danger" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snippet</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this library snippet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
