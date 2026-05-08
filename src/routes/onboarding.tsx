import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — PunctuOwlity" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const choose = async (sms: boolean) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ sms_opt_in: sms, onboarded: true })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col items-center px-6 pt-10 pb-16">
        <Logo size={130} />
        <p className="font-display text-xl text-center max-w-md mt-8 leading-relaxed text-foreground">
          Thanks for joining PunctuOwlity. Before you continue on to the app, PunctuOwlity would like to send you SMS
          alerts for upcoming events. Do you want to receive sms alerts?
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <button disabled={busy} onClick={() => choose(true)} className="pill-btn bg-teal text-teal-foreground">
            Allow SMS Notifications
          </button>
          <button disabled={busy} onClick={() => choose(false)} className="pill-btn bg-coral text-coral-foreground">
            No, thanks
          </button>
        </div>
      </main>
    </div>
  );
}
