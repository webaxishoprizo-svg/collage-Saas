import { Link, useLocation } from "@tanstack/react-router";
import { Users, Calculator, LayoutDashboard, UserCircle2, FileBarChart2, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Workers", icon: Users },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: UserCircle2 },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
] as const;

export function AppShell({
  title,
  children,
  back,
  action,
  hideNav,
}: {
  title: string;
  children: ReactNode;
  back?: string;
  action?: ReactNode;
  hideNav?: boolean;
}) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col mx-auto max-w-[480px] border-x border-border">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        {back ? (
          <Link to={back} className="-ml-1 p-1 rounded-md hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <h1 className="text-lg font-semibold tracking-tight flex-1">{title}</h1>
        {action}
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
