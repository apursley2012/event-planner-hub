import type * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Cake, Calendar, Plane, Clock, Trash2, MapPin, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { scheduleReminders, cancelAllReminders } from "@/lib/reminders";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "My Events — PunctuOwlity" }] }),
  component: AppPage,
});

type EventType = "birthday" | "appointment" | "trip" | "other";
interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  event_date: string;
  location: string | null;
}

const TABS: { key: "all" | EventType; label: string }[] = [
  { key: "all", label: "All Events" },
  { key: "birthday", label: "Birthdays" },
  { key: "appointment", label: "Appointments" },
  { key: "trip", label: "Trips" },
];

const TYPE_ICON: Record<EventType, React.ReactNode> = {
  birthday: <Cake size={20} />,
  appointment: <Calendar size={20} />,
  trip: <Plane size={20} />,
  other: <Clock size={20} />,
};

const TYPE_LABEL: Record<EventType, string> = {
  birthday: "Birthday",
  appointment: "Appointment",
  trip: "Trip",
  other: "Event",
};

function AppPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoadingEvents(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    setLoadingEvents(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEvents((data ?? []) as EventRow[]);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Schedule reminders whenever events change
  useEffect(() => {
    scheduleReminders(events.map((e) => ({ id: e.id, title: e.title, event_date: e.event_date, location: e.location })));
    return () => cancelAllReminders();
  }, [events]);

  const today = new Date();
  const stats = useMemo(() => {
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    let todayN = 0,
      upcoming = 0,
      past = 0;
    events.forEach((e) => {
      const d = new Date(e.event_date);
      if (isSameDay(d, today)) todayN++;
      else if (d > today) upcoming++;
      else past++;
    });
    return { total: events.length, today: todayN, upcoming, past };
  }, [events, today]);

  const visible = useMemo(() => {
    return events.filter((e) => {
      const d = new Date(e.event_date);
      if (d.getFullYear() !== month.getFullYear() || d.getMonth() !== month.getMonth()) return false;
      if (tab !== "all" && e.event_type !== tab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !(e.description ?? "").toLowerCase().includes(q) &&
          !(e.location ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [events, month, tab, search]);

  const removeEvent = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Event deleted");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader showLogout />
      <main className="flex-1 px-4 pt-6 pb-24 max-w-3xl mx-auto w-full">
        <div className="flex flex-col items-center animate-fade-in">
          <Logo size={110} />
          <h1 className="font-display text-2xl mt-1 text-foreground">Upcoming Events</h1>
        </div>

        <NotificationPrompt />

        <div className="grid grid-cols-4 gap-3 mt-6 animate-fade-in">
          <Stat label="Total" value={stats.total} variant="coral" />
          <Stat label="Today" value={stats.today} variant="teal" />
          <Stat label="Upcoming" value={stats.upcoming} variant="teal" />
          <Stat label="Past" value={stats.past} variant="coral" />
        </div>

        <div className="relative mt-6">
          <input
            className="pill-input pr-12"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="mt-6 bg-teal text-teal-foreground rounded-2xl py-3 px-4 flex items-center justify-between shadow-[var(--shadow-soft)]">
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Prev"
            className="hover:scale-110 transition-transform"
          >
            <ChevronLeft />
          </button>
          <h2 className="font-display text-xl">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next"
            className="hover:scale-110 transition-transform"
          >
            <ChevronRight />
          </button>
        </div>

        <nav className="mt-5 flex gap-6 border-b border-foreground/10 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-2 font-display text-base whitespace-nowrap transition-colors ${
                  active ? "text-foreground border-b-2 border-coral" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 space-y-3">
          {loadingEvents ? (
            <LoadingSkeleton />
          ) : visible.length === 0 ? (
            <EmptyState onAdd={() => setShowForm(true)} />
          ) : (
            visible.map((e, i) => (
              <div
                key={e.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 60, 400)}ms`, animationFillMode: "backwards" }}
              >
                <EventCard event={e} onDelete={() => removeEvent(e.id)} />
              </div>
            ))
          )}
        </div>
      </main>

      <button
        onClick={() => setShowForm(true)}
        aria-label="Add event"
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-coral text-coral-foreground flex items-center justify-center shadow-[var(--shadow-soft)] hover:scale-110 active:scale-95 transition-transform ring-4 ring-white"
      >
        <Plus size={28} />
      </button>

      {showForm && user && (
        <EventForm
          userId={user.id}
          onClose={() => setShowForm(false)}
          onSaved={(ev) => {
            setEvents((prev) => [...prev, ev].sort((a, b) => a.event_date.localeCompare(b.event_date)));
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, variant }: { label: string; value: number; variant: "coral" | "teal" }) {
  const cls = variant === "coral" ? "bg-coral" : "bg-teal";
  return (
    <div
      className={`${cls} text-foreground py-3 text-center border-white border-4 border-solid rounded-lg shadow-lg ring-2 ring-foreground hover:scale-105 transition-transform`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-surface rounded-2xl p-4 shadow-[var(--shadow-soft)] flex items-center gap-4 animate-pulse"
        >
          <div className="w-16 h-16 rounded-xl bg-foreground/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-foreground/10 rounded w-2/3" />
            <div className="h-3 bg-foreground/10 rounded w-1/2" />
            <div className="h-3 bg-foreground/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-14 animate-fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal text-teal-foreground mb-4 ring-4 ring-white shadow-[var(--shadow-soft)]">
        <CalendarPlus size={36} />
      </div>
      <p className="font-display text-xl text-foreground">No events this month.</p>
      <p className="text-sm mt-2 text-foreground/70 max-w-xs mx-auto">
        Tap below to add one — we'll send a friendly reminder when it's almost time.
      </p>
      <button
        onClick={onAdd}
        className="pill-btn bg-coral text-coral-foreground mt-5 inline-flex items-center gap-2"
      >
        <Plus size={18} /> Add an event
      </button>
    </div>
  );
}

function EventCard({ event, onDelete }: { event: EventRow; onDelete: () => void }) {
  const d = new Date(event.event_date);
  const accent = event.event_type === "birthday" || event.event_type === "trip" ? "bg-coral text-coral-foreground" : "bg-teal text-teal-foreground";
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-[var(--shadow-soft)] flex items-stretch gap-4 hover:-translate-y-0.5 hover:shadow-xl transition-all border-2 border-transparent hover:border-foreground/10">
      <div className={`${accent} rounded-xl flex flex-col items-center justify-center w-20 shrink-0 px-2 py-2`}>
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
          {d.toLocaleDateString(undefined, { month: "short" })}
        </div>
        <div className="font-date text-4xl leading-none mt-0.5">{d.getDate()}</div>
        <div className="text-[10px] font-semibold mt-0.5 opacity-90">
          {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-foreground/60 text-xs font-semibold uppercase tracking-wide">
              <span className="text-foreground/80">{TYPE_ICON[event.event_type]}</span>
              {TYPE_LABEL[event.event_type]}
            </div>
            <h3 className="font-display text-xl text-foreground truncate mt-0.5">{event.title}</h3>
          </div>
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="text-coral hover:bg-coral/10 rounded-full p-1.5 transition shrink-0"
          >
            <Trash2 size={18} />
          </button>
        </div>
        {event.location && (
          <p className="text-sm text-foreground/70 mt-1 flex items-center gap-1">
            <MapPin size={14} /> {event.location}
          </p>
        )}
        {event.description && <p className="text-sm mt-1 text-foreground/80 line-clamp-2">{event.description}</p>}
      </div>
    </div>
  );
}

function EventForm({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: (e: EventRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("other");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    setBusy(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: userId,
        title: title.trim().slice(0, 200),
        event_type: type,
        event_date: new Date(date).toISOString(),
        location: location.trim() || null,
        description: description.trim() || null,
      })
      .select()
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Event added");
    onSaved(data as EventRow);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-background rounded-3xl p-6 w-full max-w-md shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl mb-4 text-center">New Event</h2>
        <form onSubmit={submit} className="space-y-3">
          <input className="pill-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <select
            className="pill-input"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            <option value="birthday">Birthday</option>
            <option value="appointment">Appointment</option>
            <option value="trip">Trip</option>
            <option value="other">Other</option>
          </select>
          <input
            className="pill-input"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <input className="pill-input" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <textarea
            className="pill-input"
            style={{ borderRadius: "1.25rem", minHeight: 80 }}
            placeholder="Notes (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-3 justify-center pt-2">
            <button type="button" onClick={onClose} className="pill-btn bg-coral text-coral-foreground">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="pill-btn bg-teal text-teal-foreground">
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
