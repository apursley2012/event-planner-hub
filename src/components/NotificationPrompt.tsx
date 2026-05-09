import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  hasAskedPermission,
  markPermissionAsked,
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/reminders";
import { toast } from "sonner";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!notificationsSupported()) return;
    if (notificationPermission() === "default" && !hasAskedPermission()) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const allow = async () => {
    const result = await requestNotificationPermission();
    setShow(false);
    if (result === "granted") {
      toast.success("🔔 Reminders enabled — we'll give you a hoot before each event.");
    } else if (result === "denied") {
      toast.message("Notifications blocked. You'll still see in-app reminders.");
    }
  };

  const dismiss = () => {
    markPermissionAsked();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="animate-fade-in mt-4 bg-surface text-foreground rounded-2xl p-4 shadow-[var(--shadow-soft)] border-2 border-foreground/10 relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-foreground/50 hover:text-foreground transition"
      >
        <X size={18} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 rounded-full bg-coral text-coral-foreground flex items-center justify-center shrink-0 animate-pulse">
          <Bell size={20} />
        </div>
        <div>
          <h3 className="font-display text-lg leading-tight">Never miss an event</h3>
          <p className="text-sm mt-1 text-foreground/80">
            PunctuOwlity can send a friendly reminder <strong>1 hour</strong>, <strong>10 minutes</strong>, and{" "}
            <strong>at the time</strong> of each event — even if this tab isn't open. We'll only use it for your
            event reminders.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={allow}
              className="pill-btn bg-teal text-teal-foreground text-sm py-2 px-5"
            >
              Enable reminders
            </button>
            <button
              onClick={dismiss}
              className="pill-btn bg-transparent text-foreground text-sm py-2 px-5 shadow-none border border-foreground/20"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
