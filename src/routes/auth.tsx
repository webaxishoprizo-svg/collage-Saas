import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { login, getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { GraduationCap, Lock, User, CheckSquare } from "lucide-react";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "LMS - Sign in" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [campusId, setCampusId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  
  // Pre-warm the database sync so that localDB is populated when login checks credentials
  useDB();

  useEffect(() => {
    // If already logged in, send to home
    const user = getCurrentUser();
    if (user) {
      nav({ to: "/", replace: true });
    }
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campusId.trim()) {
      toast.error("Please enter a Campus ID / Username.");
      return;
    }
    if (!password) {
      toast.error("Please enter a Password.");
      return;
    }

    setBusy(true);
    try {
      const user = await login(campusId, password);
      toast.success(`Welcome back, ${user.name}!`);
      // Force navigation to home route
      nav({ to: "/", replace: true }).then(() => {
        window.location.reload(); // Hard reload to reset AppShell and Router instances
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-[#e5e7eb] shadow-sm">
        {/* Brand / Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-xl bg-[#2563eb] text-white flex items-center justify-center mb-3">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            LMS Portal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Access classes, attendance, marks & study materials
          </p>
        </div>

        {/* Main Auth Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              ID
            </label>
            <div className="relative">
              <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                placeholder="e.g. a101"
                className="w-full border border-[#e5e7eb] rounded-lg pl-10 pr-3 py-3 text-sm bg-white focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#e5e7eb] rounded-lg pl-10 pr-3 py-3 text-sm bg-white focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#2563eb] text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50 mt-6"
          >
            {busy ? "Signing in..." : "Sign in to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
