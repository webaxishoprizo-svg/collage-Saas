import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { totals, useDB, useHydrated, formatINR } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — PWMS" }] }),
  component: Reports,
});

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Reports() {
  const db = useDB();
  const hydrated = useHydrated();
  const t = hydrated ? totals(db) : { income: 0, expense: 0, profit: 0 };

  // monthly aggregation
  const monthly: Record<string, { income: number; expense: number }> = {};
  if (hydrated) {
    db.transactions.forEach((tx) => {
      const m = MONTHS[new Date(tx.date).getMonth()];
      monthly[m] ??= { income: 0, expense: 0 };
      monthly[m][tx.type === "income" ? "income" : "expense"] += tx.amount;
    });
  }
  const rows = MONTHS.filter((m) => monthly[m]).map((m) => ({
    m, ...monthly[m], profit: monthly[m].income - monthly[m].expense,
  }));

  return (
    <AppShell title="Reports">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select className="input" defaultValue="2024"><option>Year: 2024</option><option>Year: 2025</option></select>
        <select className="input" defaultValue="All"><option>All Months</option></select>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-primary text-primary-foreground rounded-xl p-3">
          <p className="text-[11px] opacity-80">Total Income</p>
          <p className="font-semibold mt-1">{formatINR(t.income)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">Total Expenses</p>
          <p className="font-semibold mt-1">{formatINR(t.expense)}</p>
        </div>
      </div>
      <div className="bg-primary text-primary-foreground rounded-xl p-3 mb-4">
        <p className="text-[11px] opacity-80">Total Profit</p>
        <p className="font-semibold mt-1 text-lg">{formatINR(t.profit)}</p>
      </div>

      <p className="text-sm font-semibold mb-2">Monthly Summary</p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 text-[11px] font-medium text-muted-foreground px-3 py-2 bg-muted/50">
          <span>Month</span><span className="text-right">Income</span><span className="text-right">Expenses</span><span className="text-right">Profit</span>
        </div>
        {rows.map((r) => (
          <div key={r.m} className="grid grid-cols-4 text-xs px-3 py-2 border-t border-border">
            <span className="font-medium">{r.m}</span>
            <span className="text-right text-primary">{formatINR(r.income)}</span>
            <span className="text-right">{formatINR(r.expense)}</span>
            <span className="text-right font-medium">{formatINR(r.profit)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">No data yet</p>}
      </div>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.8rem;background:var(--color-background);}`}</style>
    </AppShell>
  );
}
