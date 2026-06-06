import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useDB, useHydrated } from "@/lib/store";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const search = z.object({ clientId: z.string().optional() });

export const Route = createFileRoute("/payments/add")({
  head: () => ({ meta: [{ title: "Add Payment — PWMS" }] }),
  validateSearch: search,
  component: AddPayment,
});

function AddPayment() {
  const nav = useNavigate();
  const db = useDB();
  const hydrated = useHydrated();
  const { clientId: preset } = Route.useSearch();
  const [clientId, setClientId] = useState(preset ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"Cash" | "UPI" | "Bank Transfer" | "Cheque">("Cash");
  const [note, setNote] = useState("");

  return (
    <AppShell title="Add Payment" back="/clients" hideNav>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!clientId || !amount) return;
          actions.addPayment({ clientId, date, amount: Number(amount), mode, note });
          nav({ to: "/clients/$id", params: { id: clientId } });
        }}
        className="space-y-4"
      >
        <Field label="Client">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="input">
            <option value="">Select client</option>
            {hydrated && db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <div className="relative">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input pr-10" />
            <Calendar className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </Field>
        <Field label="Amount (₹)"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="input" placeholder="0" /></Field>
        <Field label="Payment Mode">
          <select value={mode} onChange={(e) => setMode(e.target.value as never)} className="input">
            <option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option>
          </select>
        </Field>
        <Field label="Note (Optional)"><input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Enter note" /></Field>
        <button className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium">Save Payment</button>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.7rem 0.8rem;font-size:0.9rem;background:var(--color-background);}.input:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium mb-1.5 block">{label}</span>{children}</label>;
}
