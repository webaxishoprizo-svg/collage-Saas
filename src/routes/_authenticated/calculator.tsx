import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { totals, useDB, useHydrated, formatINR } from "@/lib/store";
import { Plus, Minus, Calendar } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/calculator")({
  head: () => ({ meta: [{ title: "Calculator — PWMS" }] }),
  component: CalcPage,
});

const KEYS = ["7","8","9","C","4","5","6","+","1","2","3","-","0","00",".","="];

function CalcPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const t = hydrated ? totals(db) : { income: 0, expense: 0, profit: 0 };
  const [expr, setExpr] = useState("");
  const [display, setDisplay] = useState("0");

  const press = (k: string) => {
    if (k === "C") { setExpr(""); setDisplay("0"); return; }
    if (k === "=") {
      try {
        const safe = expr.replace(/[^0-9+\-*/.()]/g, "");
        // eslint-disable-next-line no-new-func
        const v = Function(`"use strict";return (${safe || "0"})`)();
        setDisplay(String(v));
        setExpr(String(v));
      } catch { setDisplay("Err"); }
      return;
    }
    const next = expr + k;
    setExpr(next);
    setDisplay(next);
  };

  return (
    <AppShell title="Calculator" action={<Calendar className="h-5 w-5 text-muted-foreground" />}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Income" value={formatINR(t.income)} tone="primary" />
        <StatCard label="Expenses" value={formatINR(t.expense)} tone="muted" />
        <StatCard label="Profit" value={formatINR(t.profit)} tone="muted" />
      </div>

      <select className="input mb-3" defaultValue="This Month">
        <option>This Month</option><option>Last Month</option><option>This Year</option>
      </select>

      <div className="bg-card border border-border rounded-xl px-4 py-6 text-right text-3xl font-semibold mb-3 min-h-[68px] tabular-nums break-all">
        {display}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {KEYS.map((k) => {
          const isOp = "+-=".includes(k);
          const isEq = k === "=";
          const isC = k === "C";
          return (
            <button
              key={k}
              onClick={() => press(k)}
              className={`h-14 rounded-lg text-lg font-medium border ${
                isEq ? "bg-primary text-primary-foreground border-primary" :
                isC ? "bg-foreground text-background border-foreground" :
                isOp ? "bg-accent text-primary border-border" :
                "bg-card border-border"
              }`}
            >
              {k}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/payments/add" className="flex items-center justify-center gap-2 border border-primary text-primary rounded-lg py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Income
        </Link>
        <Link to="/work/add" className="flex items-center justify-center gap-2 border border-border text-foreground rounded-lg py-2.5 text-sm font-medium">
          <Minus className="h-4 w-4" /> Add Expense
        </Link>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.6rem 0.8rem;font-size:0.85rem;background:var(--color-background);}`}</style>
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "muted" }) {
  return (
    <div className={`rounded-xl p-3 ${tone === "primary" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
      <p className={`text-[11px] ${tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</p>
      <p className="font-semibold text-sm mt-0.5 truncate">{value}</p>
    </div>
  );
}
