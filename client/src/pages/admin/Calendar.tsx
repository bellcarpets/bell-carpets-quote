import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Plus, X, Check, ChevronLeft, ChevronRight, CalendarDays, Trash2 } from "lucide-react";

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
  const quotesQuery = trpc.quotes.list.useQuery();

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
    const map: Record<string, any[]> = {};
    (eventsQuery.data ?? []).forEach(e => {
      const key = new Date(e.startDate).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [eventsQuery.data]);

  const selectedDayKey = selectedDay?.toISOString().split("T")[0];
  const selectedEvents = selectedDayKey ? (eventsByDate[selectedDayKey] ?? []) : [];
  const todayKey = today.toISOString().split("T")[0];

  const getQuoteLabel = (quoteId: number | null) => {
    if (!quoteId) return null;
    const q = quotesQuery.data?.find((q: any) => q.id === quoteId);
    return q ? `${q.quoteNumber} — ${q.propertyAddress ?? q.clientName ?? ""}` : null;
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Calendar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Job scheduling and appointments</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setForm(emptyForm()); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>

        {/* Add Event Form */}
        {showForm && (
          <div className="section-accordion mb-4 animate-fade-in">
            <div className="section-accordion-body">
              <h3 className="text-sm font-semibold mb-3 text-foreground">New Event</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="field-label">Title *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="field-input" placeholder="e.g. Install — 123 Main St" autoFocus />
                </div>
                <div>
                  <label className="field-label">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Linked Quote</label>
                  <select value={form.quoteId || "none"} onChange={e => setForm(p => ({ ...p, quoteId: e.target.value === "none" ? "" : e.target.value }))} className="field-select">
                    <option value="none">No quote linked</option>
                    {quotesQuery.data?.map((q: any) => (
                      <option key={q.id} value={String(q.id)}>{q.quoteNumber} — {q.propertyAddress ?? q.clientName ?? ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Notes</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field-input" placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary flex items-center gap-1.5"
                  onClick={() => createMutation.mutate({ title: form.title, quoteId: form.quoteId ? parseInt(form.quoteId) : undefined, startDate: form.startDate, endDate: form.endDate || form.startDate, allDay: true, description: form.notes || undefined })}
                  disabled={!form.title.trim() || createMutation.isPending}
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
                <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowForm(false)}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="section-accordion">
              {/* Month nav */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <button className="quote-card-bottom-btn" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-display text-base font-semibold">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                <button className="quote-card-bottom-btn" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {DAYS.map(d => (
                  <div key={d} className="py-2 text-center text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="min-h-[3.5rem] border-b border-r border-border/40" />;
                  const key = day.toISOString().split("T")[0];
                  const events = eventsByDate[key] ?? [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDayKey;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[3.5rem] p-1.5 border-b border-r border-border/40 text-left transition-colors ${
                        isSelected ? "bg-[oklch(12%_0_0)]" : "hover:bg-[oklch(8%_0_0)]"
                      }`}
                    >
                      <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isToday ? "bg-foreground text-background" : "text-foreground"
                      }`}>
                        {day.getDate()}
                      </div>
                      {events.slice(0, 2).map((e: any) => (
                        <div key={e.id} className="text-[0.6rem] px-1 py-0.5 rounded bg-[oklch(18%_0.04_250)] text-[oklch(78%_0.08_250)] truncate mb-0.5">
                          {e.title}
                        </div>
                      ))}
                      {events.length > 2 && <div className="text-[0.6rem] text-muted-foreground">+{events.length - 2}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Day Panel */}
          <div>
            <div className="section-accordion">
              <div className="section-accordion-header">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  {selectedDay ? selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }) : "Select a day"}
                </span>
              </div>
              <div className="section-accordion-body">
                {!selectedDay ? (
                  <p className="text-xs text-muted-foreground">Click a day to see events</p>
                ) : selectedEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No events on this day</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e: any) => (
                      <div key={e.id} className="p-3 bg-[oklch(7%_0_0)] rounded-lg border border-border">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{e.title}</div>
                            {e.quoteId && <div className="text-xs text-muted-foreground mt-0.5">{getQuoteLabel(e.quoteId)}</div>}
                            {e.notes && <div className="text-xs text-muted-foreground mt-0.5 italic">{e.notes}</div>}
                          </div>
                          <button className="quote-card-bottom-btn danger shrink-0" onClick={() => deleteMutation.mutate({ id: e.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
