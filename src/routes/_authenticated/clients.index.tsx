import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { clientTotals, useDB, useHydrated, formatINR } from "@/lib/store";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: [{ title: "Clients — PWMS" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const [q, setQ] = useState("");
  const list = (hydrated ? db.clients : []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Clients" action={
      <Link to="/clients/add" className="p-1.5 rounded-md text-primary hover:bg-accent">
        <Plus className="h-5 w-5" />
      </Link>
    }>
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-background" />
      </div>

      <div className="space-y-3">
        {list.map((c) => {
          const t = clientTotals(db, c.id);
          return (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="block bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{c.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Paid</span>
              </div>
              <p className="text-xs text-muted-foreground">{c.site}</p>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-primary font-semibold">{formatINR(t.paid)}</span>
                <span className="text-muted-foreground">Pending <span className="text-foreground font-medium">{formatINR(t.pending)}</span></span>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No clients found</p>}
      </div>
    </AppShell>
  );
}
