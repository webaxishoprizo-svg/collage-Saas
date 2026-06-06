import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, dayName, useDB, useInvalidateDB } from "@/lib/store";
import { Calendar, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/work/add")({
  head: () => ({ meta: [{ title: "Add Work Entry — PWMS" }] }),
  component: AddWork,
});

function AddWork() {
  const nav = useNavigate();
  const db = useDB();
  const invalidate = useInvalidateDB();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workerId, setWorkerId] = useState("");
  const [site, setSite] = useState("Site A");
  const [wages, setWages] = useState("800");
  const [status, setStatus] = useState<"worked" | "absent">("worked");
  const [busy, setBusy] = useState(false);

  const day = useMemo(() => dayName(date), [date]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerId) {
      toast.error("Select a worker first");
      return;
    }
    setBusy(true);
    try {
      await actions.addWork({
        workerId, date, site,
        wages: status === "worked" ? Number(wages) || 0 : 0,
        status,
      });
      await invalidate();
      nav({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Add Work Entry" back="/" hideNav>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Date">
          <div className="relative">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input pr-10" />
            <Calendar className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </Field>
        <Field label="Day">
          <input value={day} readOnly className="input bg-muted" />
        </Field>
        <Field label="Worker">
          <select value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="input">
            <option value="">Select worker</option>
            {db.workers.map((w) => (
              <option key={w.id} value={w.id}>{w.name}{w.mobile ? ` (${w.mobile})` : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="Work Site">
          <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
            <option>Site A</option><option>Site B</option><option>Site C</option>
          </select>
        </Field>
        <Field label="Daily Wages (₹)">
          <input value={wages} onChange={(e) => setWages(e.target.value)} inputMode="numeric" className="input" />
        </Field>
        <div>
          <span className="text-sm font-medium mb-1.5 block">Status</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStatus("worked")} className={`py-2.5 rounded-lg text-sm font-medium border ${status === "worked" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>Worked</button>
            <button type="button" onClick={() => setStatus("absent")} className={`py-2.5 rounded-lg text-sm font-medium border ${status === "absent" ? "bg-foreground text-background border-foreground" : "border-border bg-card"}`}>Absent</button>
          </div>
        </div>

        <button disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Entry
        </button>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.7rem 0.8rem;font-size:0.9rem;background:var(--color-background);}.input:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
