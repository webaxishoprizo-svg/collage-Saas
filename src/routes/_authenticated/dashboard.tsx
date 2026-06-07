import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { totals, useDB, formatINR } from "@/lib/store";
import { Bell } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Painter Work" }] }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const t = totals(db);
  const workers = db.workers.length;

  // Aggregate the last 4 weeks of transactions
  const { weeks, expWeeks, scale } = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 4 }, () => ({ income: 0, expense: 0 }));
    db.transactions.forEach((tx) => {
      const diff = Math.floor((now.getTime() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24 * 7));
      if (diff >= 0 && diff < 4) {
        buckets[3 - diff][tx.type === "income" ? "income" : "expense"] += tx.amount;
      }
    });
    const all = buckets.flatMap((b) => [b.income, b.expense]);
    const max = Math.max(...all, 1);
    return {
      weeks: buckets.map((b) => b.income / max),
      expWeeks: buckets.map((b) => b.expense / max),
      scale: max,
    };
  }, [db.transactions]);

  const scaleLabel = (v: number) => `${Math.round(v / 1000)}K`;

  return (
    <AppShell title="Dashboard" action={
      <Link to="/transactions" className="p-1.5 rounded-md hover:bg-accent">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </Link>
    }>
      <p className="text-xs text-muted-foreground mb-2">Overview</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat label="Total Workers" value={String(workers)} />
        <Stat label="Total Income" value={formatINR(t.income)} accent />
        <Stat label="Total Expenses" value={formatINR(t.expense)} />
        <Stat label="Net Profit" value={formatINR(t.profit)} accent />
      </div>

      <Card title="Profit Trend (last 4 weeks)">
        <svg viewBox="0 0 300 120" className="w-full h-32">
          {[0, 30, 60, 90].map((y) => (
            <line key={y} x1="30" x2="300" y1={20 + y / 1.2} y2={20 + y / 1.2} stroke="var(--color-border)" strokeDasharray="2 3" />
          ))}
          <polyline fill="none" stroke="var(--color-primary)" strokeWidth="2.5"
            points={weeks.map((v, i) => `${50 + i * 75},${110 - v * 80}`).join(" ")} />
          {weeks.map((v, i) => (
            <circle key={i} cx={50 + i * 75} cy={110 - v * 80} r="3" fill="var(--color-primary)" />
          ))}
          {["Wk 1", "Wk 2", "Wk 3", "Wk 4"].map((l, i) => (
            <text key={l} x={50 + i * 75} y="118" fontSize="8" fill="currentColor" textAnchor="middle" className="text-muted-foreground">{l}</text>
          ))}
        </svg>
        <p className="text-[10px] text-muted-foreground text-right mt-1">peak ~ {scaleLabel(scale)}</p>
      </Card>

      <Card title="Income vs Expenses">
        <div className="flex justify-end gap-3 text-[10px] text-muted-foreground mb-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-sm" />Income</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-foreground rounded-sm" />Expenses</span>
        </div>
        <svg viewBox="0 0 300 130" className="w-full h-36">
          {weeks.map((v, i) => {
            const x = 35 + i * 65;
            const h1 = v * 90;
            const h2 = expWeeks[i] * 90;
            return (
              <g key={i}>
                <rect x={x} y={110 - h1} width="14" height={h1} fill="var(--color-primary)" rx="2" />
                <rect x={x + 18} y={110 - h2} width="14" height={h2} fill="var(--color-foreground)" rx="2" />
                <text x={x + 16} y="124" fontSize="8" fill="currentColor" textAnchor="middle" className="text-muted-foreground">Wk {i + 1}</text>
              </g>
            );
          })}
        </svg>
      </Card>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-semibold mt-1 ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-3">
      <p className="text-sm font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}
