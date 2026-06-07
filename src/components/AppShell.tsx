import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Users, CheckSquare, LayoutDashboard, BookOpen, FileBarChart2, ArrowLeft, LogOut, Wifi, WifiOff, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncStatus } from "@/lib/store";
import { syncNow } from "@/lib/sync";

const tabs = [
  { to: "/", label: "Students", icon: Users },
  { to: "/calculator", label: "Attendance", icon: CheckSquare },
  { to: "/dashboard", label: "Analytics", icon: LayoutDashboard },
  { to: "/clients", label: "Classes", icon: BookOpen },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
] as const;

export function AppShell({
  title,
  children,
  back,
  action,
  hideNav,
  showSignOut,
}: {
  title: string;
  children: ReactNode;
  back?: string;
  action?: ReactNode;
  hideNav?: boolean;
  showSignOut?: boolean;
}) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const sync = useSyncStatus();

  async function onSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col mx-auto max-w-[480px] border-x border-border">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        {back ? (
          <Link to={back} className="-ml-1 p-1 rounded-md hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <h1 className="text-lg font-semibold tracking-tight flex-1 truncate">{title}</h1>
        <button
          onClick={() => void syncNow()}
          aria-label={sync.online ? "Online — tap to sync" : "Offline"}
          title={
            sync.online
              ? sync.pendingCount > 0
                ? `${sync.pendingCount} pending — tap to sync`
                : "Online"
              : `Offline${sync.pendingCount ? ` — ${sync.pendingCount} pending` : ""}`
          }
          className={`relative p-1.5 rounded-md hover:bg-accent ${
            sync.online ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {sync.syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : sync.online ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          {sync.pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-foreground text-background text-[9px] font-bold leading-[14px] text-center">
              {sync.pendingCount > 9 ? "9+" : sync.pendingCount}
            </span>
          )}
        </button>
        {action}
        {showSignOut && (
          <button onClick={onSignOut} aria-label="Sign out" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </header>
      <main className={`flex-1 px-4 py-4 ${hideNav ? "pb-6" : "pb-24"}`}>{children}</main>
      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-background border-t border-border">
          <ul className="grid grid-cols-5">
            {tabs.map((t) => {
              const active =
                t.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
