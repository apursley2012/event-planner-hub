import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Cake, Calendar, Plane, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";

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
  birthday: <Cake size={18} />,
  appointment: <Calendar size={18} />,
  trip: <Plane size={18} />,
  other: <Clock size={18} />,
};

function AppPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
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
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
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
        <div className="flex flex-col items-center">
          <Logo size={110} />
          <h1 className="font-display text-2xl mt-1 text-foreground">Upcoming Events</h1>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-6">
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
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Prev">
            <ChevronLeft />
          </button>
          <h2 className="font-display text-xl">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next">
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
                className={`pb-2 font-display text-base whitespace-nowrap ${
                  active ? "text-teal border-b-2 border-foreground" : "text-foreground/70"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 space-y-3">
          {visible.length === 0 ? (
            <div className="text-center py-16 text-foreground/70">
              <p className="font-display text-lg">No events found.</p>
              <p className="text-sm mt-1">Tap the + button to add one.</p>
            </div>
          ) : (
            visible.map((e) => <EventCard key={e.id} event={e} onDelete={() => removeEvent(e.id)} />)
          )}
        </div>
      </main>

      <button
        onClick={() => setShowForm(true)}
        aria-label="Add event"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-coral text-coral-foreground flex items-center justify-center shadow-[var(--shadow-soft)] hover:scale-105 transition"
      >
        <Plus size={26} />
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
  const cls = variant === "coral" ? "bg-coral text-coral-foreground" : "bg-teal text-teal-foreground";
  return (
    <div className={`${cls} rounded-2xl py-3 text-center shadow-[var(--shadow-soft)]`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function EventCard({ event, onDelete }: { event: EventRow; onDelete: () => void }) {
  const d = new Date(event.event_date);
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-[var(--shadow-soft)] flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-teal text-teal-foreground flex items-center justify-center shrink-0">
        {TYPE_ICON[event.event_type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg truncate">{event.title}</h3>
          <button onClick={onDelete} aria-label="Delete" className="text-coral hover:opacity-70">
            <Trash2 size={18} />
          </button>
        </div>
        <p className="text-sm text-foreground/70">
          {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
          {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </p>
        {event.location && <p className="text-sm text-foreground/70">📍 {event.location}</p>}
        {event.description && <p className="text-sm mt-1">{event.description}</p>}
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
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-3xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
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
