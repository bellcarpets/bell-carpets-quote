import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { ArrowLeft, Mail, Copy, Check, ExternalLink, Printer } from "lucide-react";

const TEMPLATE_LABELS: Record<string, string> = {
  quote_sent: "Quote Sent",
  quote_reminder: "Quote Reminder",
  quote_accepted: "Quote Accepted",
  deposit_request: "Deposit Request",
  job_scheduled: "Job Scheduled",
  invoice_sent: "Invoice Sent",
};

const SAMPLE_VARS = (q: any) => ({
  quoteNumber: q?.quoteNumber ?? "",
  clientName: q?.clientName ?? "",
  quoteLink: `${window.location.origin}/quote/${q?.id ?? ""}`,
  validDays: String(q?.validDays ?? 30),
  propertyAddress: q?.propertyAddress ?? "",
  agentEmail: q?.agentEmail ?? "",
  expiryDate: q?.expiryDate ? new Date(q.expiryDate).toLocaleDateString("en-AU") : "",
});

function fillTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export default function QuoteEmailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const quoteId = parseInt(id!);

  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const quoteQuery = trpc.quotes.getById.useQuery({ id: quoteId }, { enabled: !!quoteId });
  const templatesQuery = trpc.emailTemplates.list.useQuery();
  const markEmailedMutation = trpc.quotes.markEmailed.useMutation({
    onSuccess: () => toast.success("Quote marked as emailed"),
    onError: (e: any) => toast.error(e.message),
  });

  const sendEmailMutation = trpc.quotes.sendEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Email sent successfully");
      } else if (!data.smtpConfigured) {
        // Fallback to mailto if SMTP not configured
        const mailto = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        setTimeout(() => markEmailedMutation.mutate({ id: quoteId }), 800);
        toast.info("SMTP not configured — opened your mail app instead");
      } else {
        toast.error(data.error ?? "Failed to send email");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const emailConfigQuery = trpc.quotes.checkEmailConfig.useQuery(undefined, { retry: false });

  const q = quoteQuery.data;
  const templates = templatesQuery.data ?? [];
  const vars = SAMPLE_VARS(q);
  const quoteLink = `${window.location.origin}/quote/${quoteId}`;

  // Load first template on mount
  useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      const first = templates[0];
      setSelectedTemplate(first.id);
      setSubject(fillTemplate(first.subject ?? "", vars));
      setBody(fillTemplate(first.body ?? "", vars));
    }
  }, [templates, q]);

  // Pre-fill recipient from quote
  useEffect(() => {
    if (q?.agentEmail && !recipientEmail) {
      setRecipientEmail(q.agentEmail);
    }
  }, [q]);

  const selectTemplate = (t: typeof templates[0]) => {
    setSelectedTemplate(t.id);
    setSubject(fillTemplate(t.subject ?? "", vars));
    setBody(fillTemplate(t.body ?? "", vars));
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(quoteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Quote link copied");
  };

  const handleMarkEmailed = () => {
    markEmailedMutation.mutate({ id: quoteId });
  };

  const handlePrint = () => {
    window.open(`/quote/${quoteId}?print=1`, "_blank");
  };

  const handleSendEmail = () => {
    if (!recipientEmail) return;
    sendEmailMutation.mutate({ id: quoteId, to: recipientEmail, subject, body });
  };

  const handleOpenMailClient = () => {
    const mailto = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setTimeout(() => markEmailedMutation.mutate({ id: quoteId }), 500);
  };

  if (quoteQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="h-8 w-32 bg-card rounded animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (!q) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto px-4 py-4 text-muted-foreground text-sm">Quote not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3" onClick={() => navigate(`/admin/quotes/${quoteId}`)}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div>
            <span className="font-display text-base font-semibold text-foreground">{q.quoteNumber}</span>
            {q.propertyAddress && <span className="text-xs text-muted-foreground ml-2">{q.propertyAddress}</span>}
          </div>
        </div>

        {/* Quote Link */}
        <div className="section-accordion">
          <div className="section-accordion-header">Quote Link</div>
          <div className="section-accordion-body">
            <div className="flex items-center gap-2 mb-3">
              <div className="field-input flex-1 text-xs font-mono text-muted-foreground truncate py-2">{quoteLink}</div>
              <button className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shrink-0" onClick={copyLink}>
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <a href={`/quote/${quoteId}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </a>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
              <button
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                onClick={handleMarkEmailed}
                disabled={markEmailedMutation.isPending}
              >
                <Check className="w-3.5 h-3.5" />
                {markEmailedMutation.isPending ? "Saving..." : "Mark as Emailed"}
              </button>
            </div>
            {q.emailedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Last emailed: {new Date(q.emailedAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>

        {/* Email Composer */}
        <div className="section-accordion">
          <div className="section-accordion-header">Compose Email</div>
          <div className="section-accordion-body space-y-3">
            {/* Template selector */}
            <div>
              <label className="field-label">Template</label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      selectedTemplate === t.id
                        ? "border-[oklch(40%_0_0)] bg-[oklch(12%_0_0)] text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-[oklch(30%_0_0)]"
                    }`}
                  >
                    {TEMPLATE_LABELS[t.name] ?? t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">To</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="agent@agency.com.au"
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} className="field-input" />
            </div>

            <div>
              <label className="field-label">Body</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} className="field-textarea min-h-40 text-sm" />
            </div>

            <div className="flex gap-2 items-center">
              <button
                className="btn-primary flex items-center gap-1.5"
                onClick={handleSendEmail}
                disabled={!recipientEmail || sendEmailMutation.isPending}
              >
                <Mail className="w-3.5 h-3.5" />
                {sendEmailMutation.isPending ? "Sending..." : emailConfigQuery.data?.configured ? "Send Email" : "Send via Mail App"}
              </button>
              {emailConfigQuery.data?.configured ? (
                <p className="text-xs text-green-400">SMTP configured — email will be sent directly.</p>
              ) : (
                <p className="text-xs text-muted-foreground">No SMTP configured — will open your mail app. Add SMTP credentials in Settings to send directly.</p>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        {body && (
          <div className="section-accordion">
            <div className="section-accordion-header">Preview</div>
            <div className="section-accordion-body">
              <div className="text-xs text-muted-foreground mb-1">To: <span className="text-foreground">{recipientEmail || "(no recipient)"}</span></div>
              <div className="text-xs text-muted-foreground mb-3">Subject: <span className="text-foreground">{subject}</span></div>
              <div className="text-sm text-foreground whitespace-pre-line border-t border-border pt-3">{body}</div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
