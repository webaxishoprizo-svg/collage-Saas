import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, useDBStatus } from "@/lib/store";
import { Plus, Search, User, Edit2, FilterX } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Students — Attendance System" }] }),
  component: Students,
});

function Students() {
  const db = useDB();
  const { isLoading } = useDBStatus();
  const [q, setQ] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const list = db.workers.filter((w) => {
    const matchesQuery =
      w.name.toLowerCase().includes(q.toLowerCase()) ||
      w.rollNumber.toLowerCase().includes(q.toLowerCase());
    const matchesClass = selectedClassId ? w.classId === selectedClassId : true;
    return matchesQuery && matchesClass;
  });

  return (
    <AppShell
      title="Students"
      showSignOut
      action={
        <Link to="/workers/add" className="p-1.5 rounded-md text-primary hover:bg-accent">
          <Plus className="h-5 w-5" />
        </Link>
      }
    >
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or roll no."
            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background"
          />
        </div>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-xs bg-background max-w-[150px]"
        >
          <option value="">All Classes</option>
          {db.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedClassId && (
          <button
            onClick={() => setSelectedClassId("")}
            className="p-2 border border-border rounded-lg bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Clear filters"
          >
            <FilterX className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No students found"
          description={selectedClassId ? "No students are assigned to the selected class yet." : "Add students to start tracking attendance."}
          cta={
            <Link
              to="/workers/add"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add Student
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((w) => {
            const cls = db.clients.find((c) => c.id === w.classId);
            const studentEntries = db.work.filter((e) => e.workerId === w.id);
            const total = studentEntries.length;
            const present = studentEntries.filter((e) => e.status === "worked").length;
            const pct = total > 0 ? Math.round((present / total) * 100) : null;

            return (
              <div key={w.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                {w.photo ? (
                  <img src={w.photo} alt={w.name} className="h-11 w-11 rounded-full object-cover border border-border" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center text-primary">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate text-sm">{w.name}</p>
                    <div className="flex items-center gap-2">
                      {pct !== null ? (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            pct >= 75
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {pct}% Attendance
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          No Records
                        </span>
                      )}
                      <Link
                        to="/workers/add"
                        search={{ id: w.id }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Roll No: {w.rollNumber || "—"}</p>
                    <p>Class: {cls ? `${cls.name} (${cls.mobile})` : "Unassigned"}</p>
                    {w.mobile && <p>Phone: {w.mobile}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState({ title, description, cta }: { title: string; description: string; cta: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 mb-5 px-4">{description}</p>
      {cta}
    </div>
  );
}
