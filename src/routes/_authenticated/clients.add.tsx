import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/clients/add")({
  head: () => ({ meta: [{ title: "Add Client — PWMS" }] }),
  component: AddClient,
});

function AddClient() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [site, setSite] = useState("Site A");
  const [total, setTotal] = useState("");

  return (
    <AppShell title="Add Client" back="/clients" hideNav>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          actions.addClient({ name: name.trim(), mobile: mobile.trim(), site, totalProject: Number(total) || 0 });
          nav({ to: "/clients" });
        }}
        className="space-y-4"
      >
        <Field label="Client Name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Enter client name" /></Field>
        <Field label="Mobile Number"><input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="numeric" className="input" placeholder="Enter mobile number" /></Field>
        <Field label="Site">
          <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
            <option>Site A</option><option>Site B</option><option>Site C</option>
          </select>
        </Field>
        <Field label="Total Project (₹)"><input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" className="input" placeholder="0" /></Field>
        <button className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium">Save Client</button>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.7rem 0.8rem;font-size:0.9rem;background:var(--color-background);}.input:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium mb-1.5 block">{label}</span>{children}</label>;
}
