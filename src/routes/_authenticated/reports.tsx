import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, formatINR } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { FileDown, Calendar, Award, DollarSign, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "LMS - Generate Reports" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const user = getCurrentUser();
  const db = useDB();

  if (user?.role !== "super_admin") {
    return <AppShell title="Access Denied" back="/"><div className="p-8 text-center text-red-500 font-bold">Not Authorized</div></AppShell>;
  }
  const [activeTab, setActiveTab] = useState<"attendance" | "marks" | "fees">("attendance");

  // Helper calculation for each student
  const studentReportsData = useMemo(() => {
    return db.students.map((stu) => {
      // 1. Attendance stats
      const studentAttendance = db.attendance.filter((a) => a.studentId === stu.id);
      const totalClasses = studentAttendance.length;
      const present = studentAttendance.filter((a) => a.status === "present").length;
      const absent = totalClasses - present;
      const attendancePct =
        totalClasses > 0 ? `${Math.round((present / totalClasses) * 100)}%` : "0%";

      // 2. Marks stats
      const studentMarks = db.marks.filter((m) => m.studentId === stu.id);
      const marksStr =
        studentMarks.map((m) => `${m.subject}: ${m.marks}/${m.maxMarks}`).join(", ") ||
        "No evaluations entered";

      // 3. Fee status
      const fee = db.fees.find((f) => f.studentId === stu.id) || {
        total: 0,
        paid: 0,
        pending: 0,
      };

      const totalAmount = fee.total || 0;
      const paidAmount = fee.paid || 0;
      const pendingAmount = fee.pending || 0;

      const feeStatus =
        totalAmount === 0
          ? "No structure"
          : pendingAmount === 0
            ? "Fully Paid"
            : `Pending: ₹${pendingAmount.toLocaleString("en-IN")}`;

      return {
        id: stu.id,
        name: stu.name,
        rollNumber: stu.campusId,
        totalClasses,
        present,
        absent,
        attendancePct,
        marks: marksStr,
        feeStatus,
        feeTotal: totalAmount,
        feePaid: paidAmount,
        feePending: pendingAmount,
      };
    });
  }, [db.students, db.attendance, db.marks, db.fees]);


  // Export to Excel function using SheetJS (xlsx)
  const handleExportToExcel = () => {
    if (studentReportsData.length === 0) {
      toast.error("No student data available to export.");
      return;
    }

    try {
      // Build rows mapping precisely to export columns
      const rows = studentReportsData.map((s) => ({
        "Student Name": s.name,
        "Roll Number": s.rollNumber,
        "Total Classes": s.totalClasses,
        Present: s.present,
        Absent: s.absent,
        "Attendance %": s.attendancePct,
        Marks: s.marks,
        "Fee status": s.feeStatus,
      }));

      // Create Worksheet and Workbook
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Summary Report");

      // Write File
      XLSX.writeFile(workbook, "LMS_Student_Summary_Report.xlsx");
      toast.success("Excel sheet exported successfully!");
    } catch (err) {
      toast.error("Failed to generate Excel report.");
    }
  };

  return (
    <AppShell title="Academic Reports" back="/">
      {/* Export to Excel Section at Top */}
      <div className="bg-[#eff6ff] border border-blue-200 p-5 rounded-xl mb-6 shadow-sm flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#2563eb] flex items-center gap-1.5 uppercase">
            <FileText className="h-4 w-4" /> Export Report Sheet
          </h2>
          <p className="text-gray-500 text-[10px] mt-0.5 font-medium leading-relaxed">
            Download comprehensive student register list with roll numbers, attendance, marks, and
            fees status.
          </p>
        </div>
        <button
          onClick={handleExportToExcel}
          className="bg-[#2563eb] text-white hover:bg-blue-700 text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 shrink-0 shadow-sm transition"
        >
          <FileDown className="h-4 w-4" /> Export to Excel
        </button>
      </div>

      {/* Reports Segment Selector */}
      <div className="grid grid-cols-3 p-1 bg-gray-100 rounded-lg mb-5 text-center text-xs font-semibold">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`py-2 rounded-md transition ${
            activeTab === "attendance" ? "bg-white text-[#2563eb] shadow-xs" : "text-gray-500"
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab("marks")}
          className={`py-2 rounded-md transition ${
            activeTab === "marks" ? "bg-white text-[#2563eb] shadow-xs" : "text-gray-500"
          }`}
        >
          Grades
        </button>
        <button
          onClick={() => setActiveTab("fees")}
          className={`py-2 rounded-md transition ${
            activeTab === "fees" ? "bg-white text-[#2563eb] shadow-xs" : "text-gray-500"
          }`}
        >
          Financials
        </button>
      </div>

      {/* Report Listings */}
      <div>
        {activeTab === "attendance" && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#2563eb]" /> Student Attendance Register
            </h3>

            <div className="space-y-2.5">
              {studentReportsData.map((s) => (
                <div
                  key={s.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-sm text-[#111827]">{s.name}</p>
                    <p className="text-gray-400 font-semibold mt-0.5">ID: {s.rollNumber}</p>
                    <p className="text-gray-500 font-medium mt-1">
                      Present: <span className="text-emerald-600 font-bold">{s.present}</span> /
                      Absent: <span className="text-rose-600 font-bold">{s.absent}</span> (Total
                      conduct: {s.totalClasses})
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-[#2563eb]">{s.attendancePct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "marks" && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#2563eb]" /> Student Academic Scores
            </h3>

            <div className="space-y-2.5">
              {studentReportsData.map((s) => (
                <div
                  key={s.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm text-xs"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <div>
                      <p className="font-bold text-sm text-[#111827]">{s.name}</p>
                      <p className="text-gray-400 font-semibold mt-0.5">ID: {s.rollNumber}</p>
                    </div>
                  </div>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    Courses: <span className="text-gray-800 font-bold">{s.marks}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "fees" && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-[#2563eb]" /> Student Fee Balances
            </h3>

            <div className="space-y-2.5">
              {studentReportsData.map((s) => (
                <div
                  key={s.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-sm text-[#111827]">{s.name}</p>
                    <p className="text-gray-400 font-semibold mt-0.5">ID: {s.rollNumber}</p>
                    <div className="flex gap-3 text-[10px] text-gray-500 mt-2 font-medium">
                      <span>Total: {formatINR(s.feeTotal)}</span>
                      <span className="text-emerald-600">Paid: {formatINR(s.feePaid)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        s.feePending === 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {s.feePending === 0 ? "Cleared" : `Pending ${formatINR(s.feePending)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
