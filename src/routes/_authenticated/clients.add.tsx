import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useDB, useInvalidateDB } from "@/lib/store";
import { Camera, X, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { z } from "zod";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/clients/add")({
  head: () => ({ meta: [{ title: "Class Setup — Attendance System" }] }),
  validateSearch: searchSchema,
  component: AddClass,
});

function AddClass() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const db = useDB();
  const invalidate = useInvalidateDB();

  const cls = id ? db.clients.find((c) => c.id === id) : null;

  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [mobile, setMobile] = useState("");
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cls) {
      setName(cls.name);
      setSite(cls.site);
      setMobile(cls.mobile);
      setSiteImages(cls.siteImages || []);
    }
  }, [cls]);

  async function addSiteImage() {
    if (siteImages.length >= 3) {
      toast.error("You can upload a maximum of 3 class/lab images.");
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
    if (!name.trim()) {
      toast.error("Class Name is required");
      return;
    }
    if (!site.trim()) {
      toast.error("Subject Name is required");
      return;
    }
    if (!mobile.trim()) {
      toast.error("Semester / Year is required");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        site: site.trim(),
        mobile: mobile.trim(),
        totalProject: 0,
        siteImages,
      };

      if (id) {
        await actions.updateClient(id, payload);
        toast.success("Class updated successfully");
      } else {
        await actions.addClient(payload);
        toast.success("Class added successfully");
      }

      await invalidate();
      nav({ to: "/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this class? All students will be unassigned and attendance records deleted.")) return;
    setBusy(true);
    try {
      await actions.deleteClient(id);
      await invalidate();
      toast.success("Class deleted successfully");
      nav({ to: "/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={id ? "Edit Class" : "Add Class"} back="/clients" hideNav>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Class Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. BSc CS / MBA"
          />
        </Field>
        <Field label="Subject Name *">
          <input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="input"
            placeholder="e.g. Database Systems / Python"
          />
        </Field>
        <Field label="Semester / Year *">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="input"
            placeholder="e.g. Semester 3 / 2nd Year"
          />
        </Field>

        <Field label="Classroom / Lab Images (Max 3)">
          <div className="flex gap-3 items-center mt-2 flex-wrap">
            {siteImages.map((img, index) => (
              <div key={index} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-muted">
                <img src={img} alt={`Class preview ${index + 1}`} className="h-full w-full object-cover" />
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

        <div className="pt-2 space-y-2">
          <button disabled={busy} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Class
          </button>
          
          {id && (
            <button
              onClick={onDelete}
              disabled={busy}
              type="button"
              className="w-full border border-destructive text-destructive hover:bg-destructive/5 rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />Delete Class
            </button>
          )}
        </div>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.7rem 0.8rem;font-size:0.9rem;background:var(--color-background);}.input:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium mb-1.5 block">{label}</span>{children}</label>;
}
