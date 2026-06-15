import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Bell, Mail, MessageSquare, FileText, CheckCircle } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email_sent: <Mail className="w-3.5 h-3.5" />,
  status_change: <CheckCircle className="w-3.5 h-3.5" />,
  quote_viewed: <FileText className="w-3.5 h-3.5" />,
  note: <MessageSquare className="w-3.5 h-3.5" />,
};

const TYPE_LABEL: Record<string, string> = {
  email_sent: "Email Sent",
  status_change: "Status Change",
  quote_viewed: "Quote Viewed",
  note: "Note",
};

export default function NotificationsPage() {
  const notifsQuery = trpc.notifications.list.useQuery();
  const quotesQuery = trpc.quotes.list.useQuery();

  const notifs = notifsQuery.data ?? [];

  const getQuoteLabel = (id: number | null | undefined) => {
    if (!id) return null;
    const q = (quotesQuery.data ?? []).find((x: any) => x.id === id);
    return q ? `${q.quoteNumber}${q.propertyAddress ? ` — ${q.propertyAddress}` : ""}` : `Quote #${id}`;
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{notifs.length} notification{notifs.length !== 1 ? "s" : ""}</p>
        </div>

        {notifsQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse border border-border" />)}</div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((n: any) => (
              <div key={n.id} className="quote-card animate-fade-in">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[oklch(12%_0_0)] border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] ?? <Bell className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{n.message}</div>
                    {n.quoteId && (
                      <div className="text-xs text-muted-foreground mt-0.5">{getQuoteLabel(n.quoteId)}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[oklch(12%_0_0)] border border-border text-muted-foreground shrink-0 whitespace-nowrap">
                    {TYPE_LABEL[n.type] ?? n.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
