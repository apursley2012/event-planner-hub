import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — PunctuOwlity" },
      { name: "description", content: "Create a PunctuOwlity account to start tracking events." },
    ],
  }),
  component: SignupPage,
});

const schema = z
  .object({
    first_name: z.string().trim().min(1, "First name required").max(50),
    last_name: z.string().trim().min(1, "Last name required").max(50),
    email: z.string().trim().email("Invalid email").max(255),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    username: z.string().trim().min(3, "Username must be at least 3 characters").max(30),
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          phone: parsed.data.phone || null,
          username: parsed.data.username,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created!");
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col items-center px-6 pt-8 pb-16">
        <Logo size={120} />
        <h1 className="font-display text-2xl mt-1 text-foreground">Create an Account</h1>

        <form onSubmit={submit} className="w-full max-w-md mt-8 space-y-3">
          <input className="pill-input" placeholder="First Name" value={form.first_name} onChange={upd("first_name")} required />
          <input className="pill-input" placeholder="Last Name" value={form.last_name} onChange={upd("last_name")} required />
          <input className="pill-input" type="email" placeholder="Email Address" value={form.email} onChange={upd("email")} required />
          <input className="pill-input" type="tel" placeholder="Phone (optional, for SMS alerts)" value={form.phone} onChange={upd("phone")} />
          <input className="pill-input" placeholder="Username" value={form.first_name + form.last_name ? undefined : undefined} onChange={() => {}} hidden />
          <div className="relative">
            <input
              className="pill-input pr-12"
              type={show ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={upd("password")}
              required
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Toggle">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <input
              className="pill-input pr-12"
              type={show ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirm}
              onChange={upd("confirm")}
              required
            />
          </div>

          <div className="flex justify-center pt-3">
            <button type="submit" disabled={busy} className="pill-btn bg-teal text-teal-foreground">
              {busy ? "Creating..." : "Sign Up"}
            </button>
          </div>
        </form>

        <p className="mt-8 text-foreground">
          Already have an account?{" "}
          <Link to="/" className="underline font-semibold">
            Login
          </Link>
        </p>
      </main>
    </div>
  );
}
