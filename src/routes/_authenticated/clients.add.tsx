import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useInvalidateDB } from "@/lib/store";
import { Camera, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

export const Route = createFileRoute("/_authenticated/clients/add")({
  head: () => ({ meta: [{ title: "Add Client — Painter Work" }] }),
  component: AddClient,
});

function AddClient() {
  const nav = useNavigate();
  const invalidate = useInvalidateDB();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [site, setSite] = useState("");
  const [total, setTotal] = useState("");
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function addSiteImage() {
    if (siteImages.length >= 3) {
      toast.error("You can upload a maximum of 3 site images.");
      return;
    }
    try {
      const image = await CapCamera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });
      if (image.base64String) {
        setSiteImages((prev) => [...prev, `data:image/jpeg;base64,${image.base64String}`]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancelled/i.test(msg) && !/no image/i.test(msg)) {
        toast.error("Failed to capture image: " + msg);
      }
    }
  }

  function removeSiteImage(index: number) {
    setSiteImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await actions.addClient({ name: name.trim(), mobile: mobile.trim(), site, totalProject: Number(total) || 0, siteImages });
      await invalidate();
      nav({ to: "/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Add Client" back="/clients" hideNav>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Client Name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Enter client name" /></Field>
        <Field label="Mobile Number"><input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="numeric" className="input" placeholder="Enter mobile number" /></Field>
        <Field label="Site / Place">
          <input value={site} onChange={(e) => setSite(e.target.value)} className="input" placeholder="e.g. Anna Nagar, Chennai" />
        </Field>
        <Field label="Total Project (₹)"><input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" className="input" placeholder="0" /></Field>
        <Field label="Site Images (Max 3)">
          <div className="flex gap-3 items-center mt-2 flex-wrap">
            {siteImages.map((img, index) => (
              <div key={index} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-muted">
                <img src={img} alt={`Site preview ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeSiteImage(index)}
                  className="absolute top-1 right-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {siteImages.length < 3 && (
              <button
                type="button"
                onClick={addSiteImage}
                className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-accent hover:border-muted-foreground/60 transition"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px] font-medium">Add Photo</span>
              </button>
            )}
          </div>
        </Field>
        <button disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Client
        </button>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.7rem 0.8rem;font-size:0.9rem;background:var(--color-background);}.input:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium mb-1.5 block">{label}</span>{children}</label>;
}
