import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB } from "@/lib/store";
import { Plus, Search, BookOpen, GraduationCap, Percent } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: [{ title: "Classes — Attendance System" }] }),
  component: ClassesPage,
});

function ClassesPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  
  const list = db.clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.site.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell
      title="Classes"
      action={
        <Link to="/clients/add" className="p-1.5 rounded-md text-primary hover:bg-accent">
          <Plus className="h-5 w-5" />
        </Link>
      }
    >
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search classes or subjects"
          className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-background"
        />
      </div>

      <div className="space-y-3">
        {list.map((c) => {
          const studentCount = db.workers.filter((w) => w.classId === c.id).length;
          
          const classEntries = db.work.filter((e) => e.classId === c.id);
          const total = classEntries.length;
          const present = classEntries.filter((e) => e.status === "worked").length;
          const pct = total > 0 ? Math.round((present / total) * 100) : null;

          return (
            <Link
              key={c.id}
              to="/clients/$id"
              params={{ id: c.id }}
              className="block bg-card border border-border rounded-xl p-3 hover:bg-accent/10 transition"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-foreground">{c.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {c.mobile || "Semester —"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{c.site || "No subject specified"}</p>
              
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-foreground font-medium">{studentCount}</span> Students
                </span>
                <span className="flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-primary" />
                  Average Attendance:{" "}
                  <span className={`font-semibold ${pct !== null ? (pct >= 75 ? "text-emerald-600" : "text-rose-600") : "text-foreground"}`}>
                    {pct !== null ? `${pct}%` : "—"}
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No classes found</p>
        )}
      </div>
    </AppShell>
  );
}
