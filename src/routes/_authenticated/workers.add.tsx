import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useDB, useInvalidateDB } from "@/lib/store";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { z } from "zod";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/workers/add")({
  head: () => ({ meta: [{ title: "Student Management — Attendance System" }] }),
  validateSearch: searchSchema,
  component: AddWorker,
});

function AddWorker() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const db = useDB();
  const invalidate = useInvalidateDB();

  const student = id ? db.workers.find((w) => w.id === id) : null;

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [classId, setClassId] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student) {
      setName(student.name);
      setRollNumber(student.rollNumber);
      setMobile(student.mobile);
      setClassId(student.classId || "");
      setPhoto(student.photo || null);
    }
  }, [student]);

  async function takePhoto() {
    try {
      const image = await CapCamera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });
      if (image.base64String) {
        setPhoto(`data:image/jpeg;base64,${image.base64String}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancelled/i.test(msg) && !/no image/i.test(msg)) {
        toast.error("Failed to capture image: " + msg);
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!rollNumber.trim()) {
      toast.error("Roll Number is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        mobile: mobile.trim(),
        classId: classId || null,
        photo,
      };

      if (id) {
        await actions.updateWorker(id, payload);
        toast.success("Student updated successfully");
      } else {
        await actions.addWorker(payload);
        toast.success("Student added successfully");
      }

      await invalidate();
      nav({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this student? All attendance records will be removed.")) return;
    setBusy(true);
    try {
      await actions.deleteWorker(id);
      await invalidate();
      toast.success("Student deleted successfully");
      nav({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={id ? "Edit Student" : "Add Student"} back="/" hideNav>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex justify-center pt-2">
          <button
            onClick={takePhoto}
            type="button"
            className="h-28 w-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden border border-border"
          >
            {photo ? (
              <img src={photo} alt="Student preview" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8" />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground -mt-2">Upload Profile Photo</p>

        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter student name" className="input" />
        </Field>
        <Field label="Roll Number *">
          <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="Enter roll number (e.g. CS-101)" className="input" />
        </Field>
        <Field label="Class / Subject *">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input">
            <option value="">Select Class</option>
            {db.clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>
            ))}
          </select>
        </Field>
        <Field label="Phone Number (Optional)">
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter contact number" inputMode="numeric" className="input" />
        </Field>

        <div className="pt-2 space-y-2">
          <button disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Student
          </button>
          
          {id && (
            <button
              onClick={onDelete}
              disabled={busy}
              type="button"
              className="w-full border border-destructive text-destructive hover:bg-destructive/5 rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />Delete Student
            </button>
          )}
        </div>
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
