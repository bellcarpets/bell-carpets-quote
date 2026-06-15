import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Bell, Mail, MessageSquare, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email_sent: <Mail className="w-4 h-4" />,
  status_change: <CheckCircle className="w-4 h-4" />,
  quote_viewed: <FileText className="w-4 h-4" />,
  note: <MessageSquare className="w-4 h-4" />,
};

const TYPE_COLOURS: Record<string, string> = {
  email_sent: "text-blue-400 bg-blue-900/20",
  status_change: "text-green-400 bg-green-900/20",
  quote_viewed: "text-amber-400 bg-amber-900/20",
  note: "text-zinc-400 bg-zinc-800",
};

export default function NotificationsPage() {
  const notifsQuery = trpc.notifications.list.useQuery();
  const quotesQuery = trpc.quotes.list.useQuery({});

  const notifs = notifsQuery.data ?? [];

  const getQuoteLabel = (id: number | null | undefined) => {
    if (!id) return null;
    const q = (quotesQuery.data ?? []).find((x: any) => x.id === id);
    return q ? `${q.quoteNumber}${q.propertyAddress ? ` — ${q.propertyAddress}` : ""}` : `Quote #${id}`;
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <span className="text-sm text-muted-foreground ml-1">({notifs.length})</span>
        </div>

        {notifsQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((n: any) => (
              <div key={n.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", TYPE_COLOURS[n.type] ?? "text-zinc-400 bg-zinc-800")}>
                  {TYPE_ICONS[n.type] ?? <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{n.message}</div>
                  {n.quoteId && (
                    <div className="text-xs text-muted-foreground mt-0.5">{getQuoteLabel(n.quoteId)}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded capitalize shrink-0", TYPE_COLOURS[n.type] ?? "text-zinc-400 bg-zinc-800")}>
                  {(n.type ?? "note").replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
