import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { clientTotals, useDB, useDBStatus, formatINR } from "@/lib/store";
import { Plus, User, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Client Details — PWMS" }] }),
  component: ClientDetails,
});

function ClientDetails() {
  const { id } = Route.useParams();
  const db = useDB();
  const { isLoading } = useDBStatus();
  const client = db.clients.find((c) => c.id === id);
  const t = client ? clientTotals(db, id) : { paid: 0, pending: 0, total: 0 };
  const payments = db.payments.filter((p) => p.clientId === id);

  if (isLoading) {
    return (
      <AppShell title="Client Details" back="/clients">
        <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell title="Client Details" back="/clients">
        <p className="text-center py-12 text-sm text-muted-foreground">Client not found</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Client Details" back="/clients" action={<MoreVertical className="h-5 w-5 text-muted-foreground" />}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-primary">
          <User className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">{client.name}</p>
          <p className="text-xs text-muted-foreground">{client.mobile || "—"}</p>
          <p className="text-xs text-muted-foreground">{client.site || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Total Project" value={formatINR(t.total)} />
        <Stat label="Paid Amount" value={formatINR(t.paid)} accent="primary" />
        <Stat label="Pending Amount" value={formatINR(t.pending)} accent="warning" />
      </div>

      <p className="text-sm font-semibold mb-2">Payment History</p>
      <div className="space-y-2 mb-4">
        {payments.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex justify-between">
            <div>
              <p className="text-sm font-medium">{new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <p className="text-xs text-muted-foreground">Payment Received · {p.mode}</p>
            </div>
            <p className="font-semibold">{formatINR(p.amount)}</p>
          </div>
        ))}
        {payments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>}
      </div>

      <Link to="/payments/add" search={{ clientId: id }} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-medium">
        <Plus className="h-4 w-4" /> Add Payment
      </Link>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "primary" | "warning" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-semibold text-sm mt-0.5 ${accent === "primary" ? "text-primary" : accent === "warning" ? "text-foreground" : ""}`}>{value}</p>
    </div>
  );
}
