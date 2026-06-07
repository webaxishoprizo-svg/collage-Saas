import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB } from "@/lib/store";
import { AlertTriangle, Users, GraduationCap, CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Analytics — Attendance System" }] }),
  component: Analytics,
});

function Analytics() {
  const db = useDB();

  // 1. Overall Stats
  const totalStudents = db.workers.length;

  const totalEntries = db.work.length;
  const presentEntries = db.work.filter((e) => e.status === "worked").length;
  const absentEntries = totalEntries - presentEntries;
  const overallPercentage = totalEntries > 0 ? Math.round((presentEntries / totalEntries) * 100) : 100;

  // 2. Low Attendance Students (<75%)
  const lowAttendanceStudents = useMemo(() => {
    return db.workers
      .map((w) => {
        const studentEntries = db.work.filter((e) => e.workerId === w.id);
        const total = studentEntries.length;
        const present = studentEntries.filter((e) => e.status === "worked").length;
        const pct = total > 0 ? Math.round((present / total) * 100) : null;
        return { ...w, pct, total };
      })
      .filter((s) => s.pct !== null && s.pct < 75);
  }, [db.workers, db.work]);

  // 3. Weekly Attendance Trend (Last 4 Weeks)
  const { weeklyPcts, weeklyPresents, weeklyAbsents, maxScale } = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 4 }, () => ({ present: 0, total: 0 }));
    
    db.work.forEach((e) => {
      const entryDate = new Date(e.date);
      const diffMs = now.getTime() - entryDate.getTime();
      const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks >= 0 && diffWeeks < 4) {
        buckets[3 - diffWeeks].total += 1;
        if (e.status === "worked") {
          buckets[3 - diffWeeks].present += 1;
        }
      }
    });

    const weeklyPcts = buckets.map((b) => (b.total > 0 ? Math.round((b.present / b.total) * 100) : 0));
    const weeklyPresents = buckets.map((b) => b.present);
    const weeklyAbsents = buckets.map((b) => b.total - b.present);
    const maxVal = Math.max(...buckets.map(b => b.total), 1);

    return {
      weeklyPcts,
      weeklyPresents,
      weeklyAbsents,
      maxScale: maxVal,
    };
  }, [db.work]);

  return (
    <AppShell title="Analytics">
      <p className="text-xs text-muted-foreground mb-2">Academic Overview</p>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Total Students" value={String(totalStudents)} icon={<GraduationCap className="h-4 w-4 text-primary" />} />
        <StatCard label="Attendance" value={`${overallPercentage}%`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <StatCard 
          label="Low Att. (<75%)" 
          value={String(lowAttendanceStudents.length)} 
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} 
          accent={lowAttendanceStudents.length > 0}
        />
      </div>

      {lowAttendanceStudents.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 text-rose-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
            <p className="text-xs font-bold uppercase tracking-wide text-rose-800">Low Attendance Alerts</p>
          </div>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {lowAttendanceStudents.map((s) => (
              <div key={s.id} className="flex justify-between items-center text-xs border-b border-rose-100 pb-1 last:border-b-0 last:pb-0">
                <span className="font-semibold">{s.name} ({s.rollNumber})</span>
                <span className="bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[10px]">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card title="Attendance Percentage Trend (Last 4 Weeks)">
        <svg viewBox="0 0 300 120" className="w-full h-32">
          {/* Y axis lines */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = 100 - v * 0.8;
            return (
              <g key={v}>
                <line x1="30" x2="300" y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="2 3" />
                <text x="5" y={y + 3} fontSize="8" fill="currentColor" className="text-muted-foreground">{v}%</text>
              </g>
            );
          })}
          {/* Trend Polyline */}
          <polyline
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            points={weeklyPcts.map((v, i) => `${50 + i * 75},${100 - v * 0.8}`).join(" ")}
          />
          {/* Data Points */}
          {weeklyPcts.map((v, i) => (
            <g key={i}>
              <circle cx={50 + i * 75} cy={100 - v * 0.8} r="3.5" fill="var(--color-primary)" />
              <text x={50 + i * 75} y={90 - v * 0.8} fontSize="8" fill="var(--color-primary)" fontWeight="bold" textAnchor="middle">{v}%</text>
            </g>
          ))}
          {/* X axis labels */}
          {["3 Wks Ago", "2 Wks Ago", "Last Week", "This Week"].map((l, i) => (
            <text key={l} x={50 + i * 75} y="115" fontSize="8" fill="currentColor" textAnchor="middle" className="text-muted-foreground">{l}</text>
          ))}
        </svg>
      </Card>

      <Card title="Student Attendance Breakdown (Present vs Absent)">
        <div className="flex justify-end gap-3 text-[10px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-primary rounded-sm" />Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />Absent
          </span>
        </div>
        <svg viewBox="0 0 300 130" className="w-full h-36">
          {/* Y Axis line */}
          <line x1="30" x2="300" y1="110" y2="110" stroke="var(--color-border)" />
          {weeklyPresents.map((p, i) => {
            const x = 40 + i * 65;
            const total = p + weeklyAbsents[i];
            const maxVal = maxScale || 1;
            const h1 = (p / maxVal) * 90;
            const h2 = (weeklyAbsents[i] / maxVal) * 90;

            return (
              <g key={i}>
                {/* Present Bar */}
                <rect x={x} y={110 - h1} width="14" height={h1} fill="var(--color-primary)" rx="2" />
                {/* Absent Bar */}
                <rect x={x + 18} y={110 - h2} width="14" height={h2} fill="#F43F5E" rx="2" />
                
                {/* Data values */}
                {p > 0 && <text x={x + 7} y={104 - h1} fontSize="7" fontWeight="medium" textAnchor="middle" fill="currentColor">{p}</text>}
                {weeklyAbsents[i] > 0 && <text x={x + 25} y={104 - h2} fontSize="7" fontWeight="medium" textAnchor="middle" fill="#F43F5E">{weeklyAbsents[i]}</text>}

                {/* X labels */}
                <text x={x + 16} y="123" fontSize="8" fill="currentColor" textAnchor="middle" className="text-muted-foreground">
                  Wk {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="text-[9px] text-muted-foreground text-center mt-1">Attendance totals grouped by week</p>
      </Card>
    </AppShell>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`bg-card border rounded-xl p-3 flex flex-col justify-between min-h-[76px] transition ${accent ? "border-rose-300 bg-rose-50/20" : "border-border"}`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
        {icon}
      </div>
      <p className={`font-bold text-sm mt-1.5 ${accent ? "text-rose-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 mb-3">
      <p className="text-xs font-semibold text-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}
