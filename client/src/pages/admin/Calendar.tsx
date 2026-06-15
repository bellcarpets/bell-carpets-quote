import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Check, ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface EventForm { title: string; quoteId: string; startDate: string; endDate: string; allDay: boolean; notes: string; }
const emptyForm = (): EventForm => ({
  title: "", quoteId: "", startDate: new Date().toISOString().split("T")[0],
  endDate: new Date().toISOString().split("T")[0], allDay: true, notes: ""
});

export default function CalendarPage() {
  const utils = trpc.useUtils();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toISOString().split("T")[0];
  const eventsQuery = trpc.calendar.list.useQuery({ from: monthStart, to: monthEnd });
  const quotesQuery = trpc.quotes.list.useQuery({});

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); setShowForm(false); setForm(emptyForm()); toast.success("Event added"); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Event removed"); },
    onError: e => toast.error(e.message),
  });

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [viewDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof eventsQuery.data> = {};
    (eventsQuery.data ?? []).forEach(e => {
      const key = new Date(e.startDate).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key]!.push(e);
    });
    return map;
  }, [eventsQuery.data]);

  const selectedDayEvents = selectedDay
    ? (eventsByDate[selectedDay.toISOString().split("T")[0]] ?? [])
    : [];

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setForm(prev => ({ ...prev, startDate: day.toISOString().split("T")[0], endDate: day.toISOString().split("T")[0] }));
  };

  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Calendar
          </h1>
          <Button onClick={() => { setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Job
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar grid */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="font-semibold text-foreground">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</h2>
              <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateKey = day.toISOString().split("T")[0];
                const dayEvents = eventsByDate[dateKey] ?? [];
                const isSelected = selectedDay?.toDateString() === day.toDateString();
                return (
                  <button
                    key={i}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "min-h-[52px] p-1 rounded-lg text-left transition-all border",
                      isSelected ? "border-primary bg-primary/10" : "border-transparent hover:border-border hover:bg-accent",
                      isToday(day) && !isSelected ? "border-primary/40" : ""
                    )}
                  >
                    <div className={cn("text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full", isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground")}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((e, ei) => (
                        <div key={ei} className="text-xs bg-primary/20 text-primary px-1 rounded truncate">{e.title}</div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 2}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Add event form */}
            {showForm && (
              <div className="bg-card border border-primary/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Schedule Job</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title *</Label>
                    <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Install — 12 Main St" className="mt-1 bg-input border-border" autoFocus />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Quote (optional)</Label>
                    <Select value={form.quoteId || "none"} onValueChange={v => setForm(p => ({ ...p, quoteId: v === "none" ? "" : v }))}>
                      <SelectTrigger className="mt-1 bg-input border-border"><SelectValue placeholder="Link to quote" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No quote</SelectItem>
                        {quotesQuery.data?.map((q: any) => (
                          <SelectItem key={q.id} value={String(q.id)}>{q.quoteNumber} — {q.propertyAddress || q.clientName || "No address"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="mt-1 bg-input border-border" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End Date</Label>
                      <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="mt-1 bg-input border-border" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 bg-input border-border min-h-16 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm"             onClick={() => createMutation.mutate({ title: form.title, quoteId: form.quoteId ? parseInt(form.quoteId) : undefined, startDate: form.startDate, endDate: form.endDate, description: form.notes || undefined })} disabled={!form.title || createMutation.isPending}>
                      <Check className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowForm(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected day events */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {selectedDay ? selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }) : "Select a day"}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No jobs scheduled</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((e: any) => (
                    <div key={e.id} className="flex items-start justify-between gap-2 p-2 bg-input rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-foreground">{e.title}</div>
                        {e.notes && <div className="text-xs text-muted-foreground">{e.notes}</div>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => deleteMutation.mutate({ id: e.id })}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
