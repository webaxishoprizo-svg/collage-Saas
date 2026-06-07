import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, useDBStatus } from "@/lib/store";
import { Plus, User, Edit3, ClipboardCheck, Calendar, Percent, GraduationCap } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Class Details — Attendance System" }] }),
  component: ClassDetails,
});

function ClassDetails() {
  const { id } = Route.useParams();
  const db = useDB();
  const { isLoading } = useDBStatus();

  const cls = db.clients.find((c) => c.id === id);

  const students = useMemo(() => {
    return db.workers.filter((w) => w.classId === id);
  }, [db.workers, id]);

  const stats = useMemo(() => {
    const classEntries = db.work.filter((e) => e.classId === id);
    const uniqueDates = Array.from(new Set(classEntries.map((e) => e.date))).length;
    const total = classEntries.length;
    const present = classEntries.filter((e) => e.status === "worked").length;
    const avgPct = total > 0 ? Math.round((present / total) * 100) : null;

    return {
      lecturesConducted: uniqueDates,
      averageAttendance: avgPct,
    };
  }, [db.work, id]);

  if (isLoading) {
    return (
      <AppShell title="Class Details" back="/clients">
        <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />
      </AppShell>
    );
  }

  if (!cls) {
    return (
      <AppShell title="Class Details" back="/clients">
        <p className="text-center py-12 text-sm text-muted-foreground">Class not found</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Class Details"
      back="/clients"
      action={
        <Link
          to="/clients/add"
          search={{ id }}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <Edit3 className="h-5 w-5" />
        </Link>
      }
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-base">{cls.name}</p>
          <p className="text-xs text-muted-foreground">Subject: {cls.site || "—"}</p>
          <p className="text-xs text-muted-foreground">Semester/Year: {cls.mobile || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard
          label="Students"
          value={String(students.length)}
          icon={<User className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label="Lectures"
          value={String(stats.lecturesConducted)}
          icon={<Calendar className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label="Avg Attendance"
          value={stats.averageAttendance !== null ? `${stats.averageAttendance}%` : "—"}
          icon={<Percent className="h-4 w-4 text-primary" />}
          accent={stats.averageAttendance !== null ? (stats.averageAttendance >= 75 ? "emerald" : "rose") : undefined}
        />
      </div>

      {cls.siteImages && cls.siteImages.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Classroom / Lab Photos</p>
          <div className="flex gap-2">
            {cls.siteImages.map((img, index) => (
              <div
                key={index}
                className="flex-1 aspect-video rounded-xl overflow-hidden border border-border bg-muted relative"
              >
                <img src={img} alt={`Classroom photo ${index + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground">Student Roster</p>
        <Link
          to="/workers/add"
          search={{ classId: id }}
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add Student
        </Link>
      </div>

      <div className="space-y-2 mb-5 max-h-[260px] overflow-y-auto pr-1">
        {students.map((s) => {
          const studentEntries = db.work.filter((e) => e.workerId === s.id && e.classId === id);
          const total = studentEntries.length;
          const present = studentEntries.filter((e) => e.status === "worked").length;
          const pct = total > 0 ? Math.round((present / total) * 100) : null;

          return (
            <Link
              key={s.id}
              to="/workers/add"
              search={{ id: s.id }}
              className="bg-card border border-border rounded-xl p-3 flex justify-between items-center hover:bg-accent/10 transition"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">Roll No: {s.rollNumber}</p>
              </div>
              <div className="text-right">
                {pct !== null ? (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      pct >= 75
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {pct}%
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    No records
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {students.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No students assigned to this class yet</p>
        )}
      </div>

      <Link
        to="/calculator"
        search={{ classId: id }}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-medium hover:bg-primary/95 transition"
      >
        <ClipboardCheck className="h-4.5 w-4.5" /> Mark Attendance
      </Link>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "emerald" | "rose";
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-2.5 flex flex-col justify-between min-h-[72px]">
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
        {icon}
      </div>
      <p
        className={`font-bold text-sm mt-1.5 ${
          accent === "emerald" ? "text-emerald-600" : accent === "rose" ? "text-rose-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
