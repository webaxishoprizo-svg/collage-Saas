import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — PWMS" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/", replace: true });
    });
  }, [nav]);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      nav({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-3">P</div>
          <h1 className="text-2xl font-bold tracking-tight">Paint Workers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to manage your business" : "Create your account"}
          </p>
        </div>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 border border-border rounded-lg py-3 font-medium bg-card hover:bg-accent transition disabled:opacity-50"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onEmailSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name" className="input"
            />
          )}
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="input" autoComplete="email"
          />
          <input
            type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)"
            className="input" autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <button
            type="submit" disabled={busy}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary font-medium hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.75rem 0.9rem;font-size:0.9rem;background:var(--color-background);}.input:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}`}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.1-5c-2 1.4-4.5 2.2-7.2 2.2-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.1 5c-.4.4 6.6-4.8 6.6-14.5 0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
