import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, useHydrated, formatINR } from "@/lib/store";
import { Plus, Filter, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Workers — PWMS" }] }),
  component: Workers,
});

function Workers() {
  const db = useDB();
  const hydrated = useHydrated();
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <AppShell title="Workers" action={
      <Link to="/workers/add" className="p-1.5 rounded-md text-primary hover:bg-accent">
        <Plus className="h-5 w-5" />
      </Link>
    }>
      <div className="flex gap-2 mb-4">
        <Link to="/work/add" className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Today Work
        </Link>
        <button className="flex items-center gap-2 px-4 rounded-lg border border-border text-sm font-medium">
          <Filter className="h-4 w-4" /> Filter
        </button>
      </div>

      <div className="space-y-3">
        {hydrated && db.workers.map((w) => {
          const todayEntry = db.work.find((e) => e.workerId === w.id && e.date === todayISO);
          return (
            <div key={w.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{w.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${todayEntry ? (todayEntry.status === "worked" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive") : "bg-muted text-muted-foreground"}`}>
                    {todayEntry ? (todayEntry.status === "worked" ? "Today" : "Absent") : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{w.mobile}</p>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="text-muted-foreground">{todayEntry?.site ?? "—"}</span>
                  <span className="text-foreground font-medium">{todayEntry ? formatINR(todayEntry.wages) : "—"}</span>
                  {todayEntry && (
                    <span className={`ml-auto font-medium ${todayEntry.status === "worked" ? "text-primary" : "text-destructive"}`}>
                      {todayEntry.status === "worked" ? "Worked" : "Absent"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
