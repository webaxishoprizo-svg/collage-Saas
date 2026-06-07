import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB } from "@/lib/store";
import { useState, useMemo } from "react";
import { Download, Calendar, BookOpen, Clock, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Attendance Reports — Attendance System" }] }),
  component: ReportsPage,
});

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

function ReportsPage() {
  const db = useDB();

  const [classId, setClassId] = useState("");
  const [reportType, setReportType] = useState<"daily" | "monthly" | "subject">("daily");

  // Filter States
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth());
  const [monthlyYear, setMonthlyYear] = useState(CURRENT_YEAR);
  const [subjectName, setSubjectName] = useState("");

  // Get all unique subjects in the selected class or database
  const subjectList = useMemo(() => {
    const entries = classId ? db.work.filter((e) => e.classId === classId) : db.work;
    return Array.from(new Set(entries.map((e) => e.site).filter(Boolean)));
  }, [db.work, classId]);

  // Set default subject if subject name is empty and subject list is populated
  useMemo(() => {
    if (subjectList.length > 0 && !subjectName) {
      setSubjectName(subjectList[0]);
    }
  }, [subjectList, subjectName]);

  // Set default class if not set
  useMemo(() => {
    if (db.clients.length > 0 && !classId) {
      setClassId(db.clients[0].id);
    }
  }, [db.clients, classId]);

  // Generate Report Rows
  const reportData = useMemo(() => {
    if (!classId) return [];

    const classStudents = db.workers.filter((w) => w.classId === classId);
    
    if (reportType === "daily") {
      const dailyEntries = db.work.filter((e) => e.classId === classId && e.date === dailyDate);
      return classStudents.map((s) => {
        const entry = dailyEntries.find((e) => e.workerId === s.id);
        return {
          id: s.id,
          rollNumber: s.rollNumber,
          name: s.name,
          status: entry ? (entry.status === "worked" ? "Present" : "Absent") : "No Record",
          topicCovered: entry?.notes || "—",
        };
      });
    }

    let filteredEntries = db.work.filter((e) => e.classId === classId);

    if (reportType === "monthly") {
      filteredEntries = filteredEntries.filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === monthlyMonth && d.getFullYear() === monthlyYear;
      });
    } else if (reportType === "subject") {
      filteredEntries = filteredEntries.filter((e) => e.site === subjectName);
    }

    return classStudents.map((s) => {
      const studentEntries = filteredEntries.filter((e) => e.workerId === s.id);
      const total = studentEntries.length;
      const present = studentEntries.filter((e) => e.status === "worked").length;
      const absent = total - present;
      const pct = total > 0 ? Math.round((present / total) * 100) : 100;

      return {
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        totalClasses: total,
        present,
        absent,
        pct,
      };
    });
  }, [db.workers, db.work, classId, reportType, dailyDate, monthlyMonth, monthlyYear, subjectName]);

  const handleExport = () => {
    if (!classId) {
      toast.error("Select a class first");
      return;
    }
    if (reportData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const selectedClass = db.clients.find((c) => c.id === classId);
    const className = selectedClass ? selectedClass.name : "Class";
    let filename = `${className}_Attendance`;

    let finalExcelData: any[] = [];

    if (reportType === "daily") {
      filename += `_Daily_${dailyDate}`;
      finalExcelData = reportData.map((r: any) => ({
        "Roll Number": r.rollNumber,
        "Student Name": r.name,
        "Date": dailyDate,
        "Status": r.status,
        "Topic Covered": r.topicCovered,
      }));
    } else {
      const typeLabel = reportType === "monthly" ? `${MONTHS[monthlyMonth]}_${monthlyYear}` : `Subject_${subjectName}`;
      filename += `_${typeLabel}`;
      
      finalExcelData = reportData.map((r: any) => ({
        "Roll Number": r.rollNumber,
        "Student Name": r.name,
        "Total Classes": r.totalClasses,
        "Present": r.present,
        "Absent": r.absent,
        "Attendance %": `${r.pct}%`,
      }));
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(finalExcelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      
      // Auto-fit columns
      const maxColWidth = finalExcelData.reduce((acc, row) => {
        Object.keys(row).forEach((key, colIdx) => {
          const val = String(row[key] ?? "");
          acc[colIdx] = Math.max(acc[colIdx] || 0, key.length, val.length);
        });
        return acc;
      }, [] as number[]);
      worksheet["!cols"] = maxColWidth.map((w) => ({ w: w + 3 }));

      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success("Excel report exported successfully");
    } catch (err) {
      toast.error("Export failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <AppShell title="Reports">
      {/* 1. Selector Bars */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="input"
        >
          <option value="">Select Class</option>
          {db.clients.map((c) => (
            <option key={c.id} value={c.id}>
              Class: {c.name}
            </option>
          ))}
        </select>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as any)}
          className="input"
        >
          <option value="daily">Daily Attendance</option>
          <option value="monthly">Monthly Attendance</option>
          <option value="subject">Subject-wise Report</option>
        </select>
      </div>

      {/* 2. Sub-filters based on type */}
      <div className="bg-card border border-border rounded-xl p-3 mb-4 space-y-3">
        {reportType === "daily" && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground w-20">Select Date:</span>
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="input-sub flex-1"
            />
          </div>
        )}

        {reportType === "monthly" && (
          <div className="flex gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-2" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                className="input-sub"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(Number(e.target.value))}
                className="input-sub"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {reportType === "subject" && (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground w-24">Select Subject:</span>
            {subjectList.length > 0 ? (
              <select
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="input-sub flex-1"
              >
                {subjectList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-muted-foreground italic flex-1">No subjects conducted yet</span>
            )}
          </div>
        )}
      </div>

      {/* 3. Export action */}
      {classId && reportData.length > 0 && (
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold mb-4 hover:bg-emerald-700 transition"
        >
          <FileSpreadsheet className="h-4.5 w-4.5" /> Export to Excel (.xlsx)
        </button>
      )}

      {/* 4. Report List / Table */}
      <h3 className="text-xs font-semibold text-muted-foreground mb-2">Report Summary</h3>
      
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {reportType === "daily" ? (
          <>
            <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground px-3 py-2.5 bg-muted/40 uppercase tracking-wide">
              <span className="col-span-3">Roll No.</span>
              <span className="col-span-6">Name</span>
              <span className="col-span-3 text-right">Status</span>
            </div>
            <div className="divide-y divide-border/60 max-h-[320px] overflow-y-auto">
              {reportData.map((r: any) => (
                <div key={r.id} className="grid grid-cols-12 text-xs px-3 py-2.5 items-center">
                  <span className="col-span-3 font-medium text-muted-foreground">{r.rollNumber || "—"}</span>
                  <span className="col-span-6 font-semibold text-foreground truncate">{r.name}</span>
                  <span className="col-span-3 text-right">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        r.status === "Present"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : r.status === "Absent"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground px-3 py-2.5 bg-muted/40 uppercase tracking-wide">
              <span className="col-span-2">Roll No.</span>
              <span className="col-span-5">Name</span>
              <span className="col-span-3 text-right">Held/Pres</span>
              <span className="col-span-2 text-right">Pct %</span>
            </div>
            <div className="divide-y divide-border/60 max-h-[320px] overflow-y-auto">
              {reportData.map((r: any) => (
                <div key={r.id} className="grid grid-cols-12 text-xs px-3 py-2.5 items-center">
                  <span className="col-span-2 font-medium text-muted-foreground truncate">{r.rollNumber || "—"}</span>
                  <span className="col-span-5 font-semibold text-foreground truncate">{r.name}</span>
                  <span className="col-span-3 text-right text-muted-foreground">
                    {r.totalClasses} / <span className="text-foreground font-semibold">{r.present}</span>
                  </span>
                  <span className={`col-span-2 text-right font-bold ${r.pct >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                    {r.pct}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {reportData.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-10">No records found for this selection.</p>
        )}
      </div>

      <style>{`
        .input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.6rem 0.8rem;font-size:0.85rem;background:var(--color-background);outline-offset:-1px;}
        .input-sub{width:100%;border:1px solid var(--color-border);border-radius:0.375rem;padding:0.4rem 0.6rem;font-size:0.8rem;background:var(--color-background);outline-offset:-1px;}
        .input:focus, .input-sub:focus{outline:2px solid var(--color-primary);outline-offset:-1px;}
      `}</style>
    </AppShell>
  );
}
