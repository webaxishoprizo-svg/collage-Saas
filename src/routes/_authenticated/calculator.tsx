import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useDB, useInvalidateDB, dayName } from "@/lib/store";
import { Calendar, Check, X, Loader2, Award, ClipboardCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  classId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/calculator")({
  head: () => ({ meta: [{ title: "Attendance Marking — Attendance System" }] }),
  validateSearch: searchSchema,
  component: AttendancePage,
});

function AttendancePage() {
  const { classId: presetClassId } = Route.useSearch();
  const db = useDB();
  const invalidate = useInvalidateDB();
  const nav = useNavigate();

  const [classId, setClassId] = useState(presetClassId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [attendance, setAttendance] = useState<Record<string, "worked" | "absent">>({});
  const [busy, setBusy] = useState(false);

  const day = useMemo(() => dayName(date), [date]);

  // Load class list or preset class
  useEffect(() => {
    if (presetClassId) {
      setClassId(presetClassId);
    } else if (db.clients.length > 0 && !classId) {
      setClassId(db.clients[0].id);
    }
  }, [presetClassId, db.clients, classId]);

  // Prefill attendance data and details when classId or date changes
  useEffect(() => {
    if (!classId) return;
    const classStudents = db.workers.filter((w) => w.classId === classId);
    const entries = db.work.filter((e) => e.classId === classId && e.date === date);
    
    const initialMap: Record<string, "worked" | "absent"> = {};
    classStudents.forEach((w) => {
      const entry = entries.find((e) => e.workerId === w.id);
      initialMap[w.id] = entry ? entry.status : "worked";
    });
    setAttendance(initialMap);

    const firstEntry = entries[0];
    if (firstEntry) {
      setSubject(firstEntry.site);
      setNotes(firstEntry.notes || "");
    } else {
      const cls = db.clients.find((c) => c.id === classId);
      setSubject(cls?.site ?? "");
      setNotes("");
    }
  }, [classId, date, db.workers, db.work, db.clients]);

  const students = useMemo(() => {
    return db.workers.filter((w) => w.classId === classId);
  }, [db.workers, classId]);

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "worked" ? "absent" : "worked",
    }));
  };

  const markAllPresent = () => {
    const updated = { ...attendance };
    students.forEach((s) => {
      updated[s.id] = "worked";
    });
    setAttendance(updated);
    toast.info("All students toggled to Present");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) {
      toast.error("Please select a class");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter a subject / topic name");
      return;
    }

    setBusy(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      await actions.saveAttendance(classId, date, subject.trim(), records, notes.trim());
      await invalidate();
      toast.success("Attendance saved successfully");
      nav({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Attendance" action={<ClipboardCheck className="h-5 w-5 text-muted-foreground" />}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Class">
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="input"
            >
              <option value="">Select Class</option>
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input pr-10"
              />
              <Calendar className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Day">
            <input value={day} readOnly className="input bg-muted" />
          </Field>
          <Field label="Subject Name">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="e.g. Physics / Python"
            />
          </Field>
        </div>

        <Field label="Notes / Topic Covered (Optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input resize-none h-16"
            placeholder="Describe the topics covered in this lecture..."
          />
        </Field>

        <div className="flex items-center justify-between pt-2">
          <h2 className="text-sm font-semibold">Students List ({students.length})</h2>
          {students.length > 0 && (
            <button
              type="button"
              onClick={markAllPresent}
              className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-lg px-2.5 py-1.5 font-medium hover:bg-primary/20 transition"
            >
              Mark All Present
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 border border-dashed border-border rounded-xl px-4">
            <p className="font-medium text-sm text-muted-foreground">No students found in this class.</p>
            <Link
              to="/workers/add"
              search={{ classId }}
              className="inline-flex items-center gap-1.5 mt-3 text-xs bg-primary text-primary-foreground rounded-lg px-3 py-2 font-medium"
            >
              Add Students
            </Link>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {students.map((s) => {
              const status = attendance[s.id] || "worked";
              const isPresent = status === "worked";

              return (
                <div
                  key={s.id}
                  onClick={() => toggleAttendance(s.id)}
                  className="flex items-center justify-between border border-border bg-card hover:bg-accent/30 rounded-xl p-3 cursor-pointer select-none transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">Roll No: {s.rollNumber || "—"}</p>
                  </div>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isPresent
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {isPresent ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Present
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" /> Absent
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {students.length > 0 && (
          <button
            disabled={busy}
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Attendance
          </button>
        )}
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.6rem 0.8rem;font-size:0.85rem;background:var(--color-background);}.input:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium mb-1 block">{label}</span>
      {children}
    </label>
  );
}
