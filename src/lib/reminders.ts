import { toast } from "sonner";

export interface ReminderEvent {
  id: string;
  title: string;
  event_date: string;
  location?: string | null;
}

const KEY_PERMISSION_ASKED = "punctuowlity:notif-asked";
const scheduled = new Map<string, number[]>();

export function hasAskedPermission() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY_PERMISSION_ASKED) === "1";
}

export function markPermissionAsked() {
  if (typeof window !== "undefined") localStorage.setItem(KEY_PERMISSION_ASKED, "1");
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  markPermissionAsked();
  if (!notificationsSupported()) return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

function fire(event: ReminderEvent, lead: string) {
  const body = `${lead} — ${new Date(event.event_date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}${event.location ? ` · ${event.location}` : ""}`;

  if (notificationsSupported() && Notification.permission === "granted") {
    try {
      new Notification(`🦉 ${event.title}`, { body, tag: `${event.id}-${lead}` });
    } catch {
      /* noop */
    }
  }
  toast(`🦉 ${event.title}`, { description: body });
}

function clearEvent(id: string) {
  const timers = scheduled.get(id);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    scheduled.delete(id);
  }
}

const MAX_TIMEOUT = 2_147_483_000; // ~24.8 days

function schedule(event: ReminderEvent, msFromNow: number, lead: string) {
  if (msFromNow <= 0 || msFromNow > MAX_TIMEOUT) return;
  const timer = window.setTimeout(() => fire(event, lead), msFromNow);
  const arr = scheduled.get(event.id) ?? [];
  arr.push(timer);
  scheduled.set(event.id, arr);
}

export function scheduleReminders(events: ReminderEvent[]) {
  if (typeof window === "undefined") return;
  // clear all existing
  scheduled.forEach((timers) => timers.forEach((t) => clearTimeout(t)));
  scheduled.clear();

  const now = Date.now();
  events.forEach((event) => {
    const eventTime = new Date(event.event_date).getTime();
    if (Number.isNaN(eventTime)) return;
    schedule(event, eventTime - now - 60 * 60 * 1000, "Starts in 1 hour");
    schedule(event, eventTime - now - 10 * 60 * 1000, "Starts in 10 minutes");
    schedule(event, eventTime - now, "Happening now");
  });
}

export function cancelAllReminders() {
  scheduled.forEach((timers) => timers.forEach((t) => clearTimeout(t)));
  scheduled.clear();
}

export { clearEvent };
