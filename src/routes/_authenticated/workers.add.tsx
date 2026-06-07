import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useInvalidateDB } from "@/lib/store";
import { Camera, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

export const Route = createFileRoute("/_authenticated/workers/add")({
  head: () => ({ meta: [{ title: "Add Worker — Painter Work" }] }),
  component: AddWorker,
});

function AddWorker() {
  const nav = useNavigate();
  const invalidate = useInvalidateDB();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (!name.trim()) return;
    setBusy(true);
    try {
      await actions.addWorker({ name: name.trim(), mobile: mobile.trim(), photo });
      await invalidate();
      nav({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Add Worker" back="/" hideNav>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex justify-center pt-2">
          <button
            onClick={takePhoto}
            type="button"
            className="h-28 w-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden border border-border"
          >
            {photo ? (
              <img src={photo} alt="Worker preview" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8" />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground -mt-2">Upload Photo</p>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter worker name" className="input" />
        </Field>
        <Field label="Mobile Number">
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter mobile number" inputMode="numeric" className="input" />
        </Field>

        <button disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Worker
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
