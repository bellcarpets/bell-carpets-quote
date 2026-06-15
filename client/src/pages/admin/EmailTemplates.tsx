import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Save, Info } from "lucide-react";

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
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold text-foreground">Email Templates</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Customise outgoing email content for each quote stage</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Template selector */}
          <div className="section-accordion lg:col-span-1 h-fit">
            <div className="section-accordion-header">Templates</div>
            <div className="section-accordion-body p-1">
              {templatesQuery.isLoading ? (
                <div className="space-y-1 p-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-[oklch(10%_0_0)] rounded animate-pulse" />)}</div>
              ) : templates.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">No templates yet</p>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeId === t.id
                        ? "bg-[oklch(14%_0_0)] text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-[oklch(10%_0_0)]"
                    }`}
                  >
                    {TEMPLATE_LABELS[t.name] ?? t.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3 space-y-3">
            {activeTemplate ? (
              <>
                <div className="section-accordion">
                  <div className="section-accordion-header">{TEMPLATE_LABELS[activeTemplate.name] ?? activeTemplate.name}</div>
                  <div className="section-accordion-body space-y-3">
                    <div>
                      <label className="field-label">Subject Line</label>
                      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." className="field-input" />
                    </div>
                    <div>
                      <label className="field-label">Body</label>
                      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Email body text..." className="field-textarea font-mono text-xs min-h-48" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Info className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Click to insert variable at cursor</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {VARIABLES.map(v => (
                          <button key={v} onClick={() => insertVariable(v)} className="text-xs bg-[oklch(12%_0_0)] border border-border text-muted-foreground px-2 py-0.5 rounded hover:text-foreground hover:border-foreground/30 transition-colors font-mono">
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn-primary flex items-center gap-1.5"
                      onClick={() => activeId && updateMutation.mutate({ id: activeId, subject, body })}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {updateMutation.isPending ? "Saving..." : "Save Template"}
                    </button>
                  </div>
                </div>

                {body && (
                  <div className="section-accordion">
                    <div className="section-accordion-header">Preview (sample data)</div>
                    <div className="section-accordion-body">
                      <div className="text-xs text-muted-foreground mb-2">Subject: <span className="text-foreground">{previewText(subject)}</span></div>
                      <div className="text-sm text-foreground whitespace-pre-line border-t border-border pt-3">{previewText(body)}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="section-accordion">
                <div className="section-accordion-body text-center text-muted-foreground py-8">
                  Select a template to edit
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
