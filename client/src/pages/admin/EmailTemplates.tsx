import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Save, Info } from "lucide-react";

const TEMPLATE_LABELS: Record<string, string> = {
  quote_sent: "Quote Sent",
  quote_reminder: "Quote Reminder",
  quote_accepted: "Quote Accepted",
  deposit_request: "Deposit Request",
  job_scheduled: "Job Scheduled",
  invoice_sent: "Invoice Sent",
};

const VARIABLES = ["{{quoteNumber}}", "{{clientName}}", "{{quoteLink}}", "{{validDays}}", "{{propertyAddress}}", "{{agentEmail}}", "{{expiryDate}}"];

const SAMPLE: Record<string, string> = {
  quoteNumber: "BC-001",
  clientName: "John Smith",
  quoteLink: `${typeof window !== "undefined" ? window.location.origin : ""}/quote/1`,
  validDays: "30",
  propertyAddress: "12 Main St, Surfers Paradise QLD 4217",
  agentEmail: "agent@raywhite.com.au",
  expiryDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-AU"),
};

export default function EmailTemplatesPage() {
  const utils = trpc.useUtils();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const templatesQuery = trpc.emailTemplates.list.useQuery();
  const templates = templatesQuery.data ?? [];

  const updateMutation = trpc.emailTemplates.update.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); toast.success("Template saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Load active template into form
  useEffect(() => {
    if (!activeId && templates.length > 0) {
      const first = templates[0];
      setActiveId(first.id);
      setSubject(first.subject ?? "");
      setBody(first.body ?? "");
    }
  }, [templates]);

  const selectTemplate = (t: typeof templates[0]) => {
    setActiveId(t.id);
    setSubject(t.subject ?? "");
    setBody(t.body ?? "");
  };

  const insertVariable = (v: string) => setBody(prev => prev + v);

  const previewText = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE[k] ?? `{{${k}}}`);

  const activeTemplate = templates.find(t => t.id === activeId);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Email Templates</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Template selector */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-1 lg:col-span-1">
            {templatesQuery.isLoading ? (
              <div className="space-y-1">{[1,2,3].map(i => <div key={i} className="h-8 bg-input rounded animate-pulse" />)}</div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No templates yet</p>
            ) : (
              templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeId === t.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  {TEMPLATE_LABELS[t.name] ?? t.name}
                </button>
              ))
            )}
          </div>

          {/* Editor */}
          <div className="lg:col-span-3 space-y-4">
            {activeTemplate ? (
              <>
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {TEMPLATE_LABELS[activeTemplate.name] ?? activeTemplate.name}
                  </h3>

                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">Subject Line</Label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." className="mt-1 bg-input border-border" />
                  </div>

                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">Body</Label>
                    <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Email body text..." className="mt-1 bg-input border-border min-h-48 text-sm font-mono" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-1 mb-2">
                      <Info className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Click to insert variable</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {VARIABLES.map(v => (
                        <button key={v} onClick={() => insertVariable(v)} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded hover:bg-accent hover:text-foreground transition-colors font-mono">
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={() => activeId && updateMutation.mutate({ id: activeId, subject, body })} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </div>

                {body && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Preview (sample data)</h3>
                    <div className="text-xs text-muted-foreground mb-1">Subject: {previewText(subject)}</div>
                    <div className="text-sm text-foreground whitespace-pre-line border-t border-border pt-3 mt-2">{previewText(body)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                Select a template to edit
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
