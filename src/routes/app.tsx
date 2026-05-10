import type * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, Pencil, BellRing, BellOff, CalendarPlus } from "lucide-react";
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

        <div className="relative mt-6">
          <input
            className="pill-input pr-12"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="mt-6 bg-teal text-foreground rounded-2xl py-3 px-4 flex items-center justify-between shadow-[var(--shadow-soft)]">
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Prev"
            className="hover:scale-110 transition-transform"
          >
            <ChevronLeft />
          </button>
          <h2 className="font-display text-xl underline decoration-2 underline-offset-4">
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

        <div className="mt-4 border-t-4 border-dotted border-foreground" />

        <nav className="flex gap-6 overflow-x-auto py-2 justify-between">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-1 font-display text-base whitespace-nowrap transition-colors ${
                  active ? "text-foreground border-b-2 border-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t-4 border-dotted border-foreground" />

        <div className="mt-5 grid grid-cols-2 gap-3">
          {loadingEvents ? (
            <LoadingSkeleton />
          ) : visible.length === 0 ? (
            <div className="col-span-2">
              <EmptyState onAdd={() => setShowForm(true)} />
            </div>
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

        <div className="mt-6 border-t-4 border-dotted border-foreground" />
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

function LoadingSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-surface rounded-2xl p-4 shadow-[var(--shadow-soft)] aspect-square animate-pulse border border-foreground/10"
        >
          <div className="h-3 bg-foreground/10 rounded w-1/3 mb-3" />
          <div className="h-10 bg-foreground/10 rounded w-2/3 mb-3" />
          <div className="h-3 bg-foreground/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-foreground/10 rounded w-1/2" />
        </div>
      ))}
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-14 animate-fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal text-foreground mb-4 ring-4 ring-white shadow-[var(--shadow-soft)]">
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

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function EventCard({ event, onDelete }: { event: EventRow; onDelete: () => void }) {
  const d = new Date(event.event_date);
  const isAllDay = d.getHours() === 0 && d.getMinutes() === 0;
  const isPast = d.getTime() < Date.now() && !isSameDay(d, new Date());
  const reminderOn = !isPast;
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true })
    .replace(" ", "")
    .toUpperCase();

  return (
    <div className="bg-surface rounded-2xl p-3 shadow-[var(--shadow-soft)] border border-foreground/15 flex flex-col gap-1 hover:-translate-y-0.5 hover:shadow-xl transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-lg text-foreground leading-none">{weekday}</span>
          {reminderOn ? (
            <BellRing size={16} className="text-teal" />
          ) : (
            <BellOff size={16} className="text-coral" />
          )}
        </div>
        <div className="flex items-center gap-1 text-foreground/70">
          <button aria-label="Edit" className="p-1 rounded-full hover:bg-foreground/5 transition">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} aria-label="Delete" className="p-1 rounded-full hover:bg-coral/10 hover:text-coral transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="font-date text-5xl text-foreground leading-none">{d.getDate()}</div>
      <h3 className="font-display text-base text-foreground truncate mt-1">{event.title}</h3>
      <p className="font-display text-xs text-foreground/70 uppercase tracking-wide">
        {isAllDay ? "All Day" : time}
      </p>
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
