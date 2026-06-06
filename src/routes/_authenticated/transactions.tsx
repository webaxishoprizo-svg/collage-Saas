import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, formatINR } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Transactions — PWMS" }] }),
  component: TxPage,
});

function TxPage() {
  const db = useDB();
  const items = db.transactions;

  return (
    <AppShell title="Transactions" back="/dashboard">
      <select className="input mb-3" defaultValue="This Month">
        <option>This Month</option><option>Last Month</option><option>This Year</option>
      </select>
      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                {t.type === "income" ? "+ " : "- "}{formatINR(t.amount)}
              </p>
              <p className="text-xs text-muted-foreground truncate">{t.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              <p className={`text-xs font-medium ${t.type === "income" ? "text-primary" : "text-foreground/70"}`}>
                {t.type === "income" ? "Income" : "Expense"}
              </p>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No transactions yet</p>}
      </div>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.6rem 0.8rem;font-size:0.85rem;background:var(--color-background);}`}</style>
    </AppShell>
  );
}
