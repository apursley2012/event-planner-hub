import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Login — PunctuOwlity" },
      { name: "description", content: "Log in to PunctuOwlity to track your events." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader showBack={false} />
      <main className="flex-1 flex flex-col items-center px-6 pt-10 pb-16">
        <Logo />
        <h1 className="font-display text-2xl mt-2 text-foreground">Welcome to PunctuOwlity!</h1>

        <form onSubmit={submit} className="w-full max-w-md mt-10 space-y-4">
          <input
            className="pill-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div className="relative">
            <input
              className="pill-input pr-12"
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Toggle password"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-center pt-2">
            <button type="submit" disabled={busy} className="pill-btn bg-coral text-coral-foreground">
              {busy ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>

        <p className="mt-10 text-foreground">Don't have an account?</p>
        <Link to="/signup" className="pill-btn bg-teal text-teal-foreground mt-3 inline-block">
          Sign Up
        </Link>
      </main>
    </div>
  );
}
