import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions, type LMS_DB } from "@/lib/store";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Check, X, Calendar, UserCheck, BarChart, Download, Upload } from "lucide-react";
import type { LocalStudent, LocalClass, LocalAttendance } from "@/lib/store";
import * as xlsx from "xlsx";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "LMS - Attendance" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const user = getCurrentUser();
  const db = useDB();

  if (!user) {
    return null;
  }

  return user.role === "teacher" || user.role === "super_admin" ? (
    <TeacherAttendance db={db} />
  ) : (
    <StudentAttendance user={user} db={db} />
  );
}

// ================= TEACHER ATTENDANCE MARKING =================

function TeacherAttendance({ db }: { db: LMS_DB }) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent">>({});
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get students in selected class
  const classStudents = useMemo(() => {
    if (!classId) return [];
    return db.students.filter((s: LocalStudent) => s.classIds?.includes(classId));
  }, [db.students, classId]);

  // Load existing attendance if already marked for this class/date
  useEffect(() => {
    if (!classId || !date) {
      setAttendanceMap({});
      return;
    }

    const classRecords = db.attendance.filter(
      (a: LocalAttendance) => a.classId === classId && a.date === date,
    );

    const map: Record<string, "present" | "absent"> = {};
    if (classRecords.length > 0) {
      classRecords.forEach((rec: LocalAttendance) => {
        map[rec.studentId] = rec.status;
      });
    } else {
      // Default to all present initially
      classStudents.forEach((stu: LocalStudent) => {
        map[stu.id] = "present";
      });
    }
    setAttendanceMap(map);
  }, [classId, date, classStudents, db.attendance]);

  const toggleStatus = (studentId: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  };

  const markAllPresent = () => {
    const map: Record<string, "present" | "absent"> = {};
    classStudents.forEach((stu: LocalStudent) => {
      map[stu.id] = "present";
    });
    setAttendanceMap(map);
    toast.success("All set to Present");
  };

  async function handleSave() {
    if (!classId) return;

    setBusy(true);
    try {
      const records = classStudents.map((stu: LocalStudent) => ({
        studentId: stu.id,
        status: attendanceMap[stu.id] || "present",
      }));

      await actions.saveAttendance(classId, date, records);
      toast.success("Attendance saved successfully!");
    } catch (err) {
      toast.error("Failed to save attendance.");
    } finally {
      setBusy(false);
    }
  }

  function handleExportExcel() {
    if (!classId) return;

    const classRecords = db.attendance.filter((a: LocalAttendance) => a.classId === classId);
    const uniqueDates = Array.from(new Set(classRecords.map((a: LocalAttendance) => a.date))).sort();

    const data = classStudents.map((stu: LocalStudent) => {
      const row: any = {
        "Campus ID": stu.campusId,
        "Student Name": stu.name,
      };
      
      uniqueDates.forEach((d) => {
        const record = classRecords.find((a: LocalAttendance) => a.studentId === stu.id && a.date === d);
        row[d] = record ? (record.status === "present" ? "P" : "A") : "-";
      });
      return row;
    });

    if (data.length === 0) {
      toast.error("No students to export.");
      return;
    }

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Attendance");
    const safeSubject = activeClassSubject ? activeClassSubject.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'class';
    xlsx.writeFile(wb, `attendance_${safeSubject}.xlsx`);
    toast.success("Excel downloaded.");
  }

  function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !classId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);

        for (const row of data as any[]) {
          const campusId = row["Campus ID"];
          if (!campusId) continue;
          
          const student = db.students.find((s: LocalStudent) => s.campusId.toLowerCase() === String(campusId).toLowerCase());
          if (!student) continue;
          
          const rowDate = row["Date"];
          const rowStatus = row["Status"];
          if (rowDate && rowStatus) {
             const cleanStatus = String(rowStatus).toLowerCase().startsWith("p") ? "present" : "absent";
             await actions.saveAttendance(classId, rowDate, [{ studentId: student.id, status: cleanStatus }]);
          } else {
             for (const key of Object.keys(row)) {
               if (key === "Campus ID" || key === "Student Name") continue;
               const dateStr = key;
               const cellVal = String(row[key]).toLowerCase();
               if (cellVal === "p" || cellVal === "present") {
                 await actions.saveAttendance(classId, dateStr, [{ studentId: student.id, status: "present" }]);
               } else if (cellVal === "a" || cellVal === "absent") {
                 await actions.saveAttendance(classId, dateStr, [{ studentId: student.id, status: "absent" }]);
               }
             }
          }
        }
        toast.success(`Imported attendance records successfully!`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel file.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  }

  // Get current class details
  const activeClassSubject = useMemo(() => {
    const cls = db.classes.find((c: LocalClass) => c.id === classId);
    return cls ? cls.subject : "";
  }, [db.classes, classId]);

  return (
    <AppShell title="Mark Attendance" back="/">
      {/* Configuration Header Card */}
      <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Select Class Section
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none"
            >
              <option value="">-- Choose Class --</option>
              {db.classes.map((cls: LocalClass) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.subject})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              {classId && classStudents.length > 0 && (
                <button
                  onClick={markAllPresent}
                  className="w-full bg-[#eff6ff] text-[#2563eb] border border-blue-200 rounded-lg py-2.5 text-xs font-bold hover:bg-blue-100 transition"
                >
                  Mark All Present
                </button>
              )}
            </div>
          </div>
          
          {classId && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleExportExcel}
                className="flex-1 bg-white text-gray-700 border border-gray-200 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 text-emerald-600" /> Export Excel
              </button>
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImportExcel} 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-white text-gray-700 border border-gray-200 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <Upload className="h-4 w-4 text-blue-600" /> Import Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Students Marking Section */}
      {classId && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider">
                Students List ({classStudents.length})
              </h3>
              {activeClassSubject && (
                <p className="text-xs text-gray-500 font-medium">
                  Subject: <span className="text-[#2563eb]">{activeClassSubject}</span>
                </p>
              )}
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400 bg-white">
              No students are assigned to this class. Register students to record attendance.
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {classStudents.map((stu: LocalStudent) => {
                const status = attendanceMap[stu.id] || "present";
                const isPresent = status === "present";

                return (
                  <div
                    key={stu.id}
                    onClick={() => toggleStatus(stu.id)}
                    className="bg-white p-3 rounded-xl border border-[#e5e7eb] flex items-center justify-between cursor-pointer hover:bg-gray-50 transition select-none"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-[#111827] truncate">{stu.name}</p>
                      <p className="text-gray-400 text-[10px]">ID: {stu.campusId}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          isPresent
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {isPresent ? "Present" : "Absent"}
                      </span>
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center border transition ${
                          isPresent
                            ? "bg-emerald-500 border-emerald-600 text-white"
                            : "bg-rose-500 border-rose-600 text-white"
                        }`}
                      >
                        {isPresent ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleSave}
                disabled={busy}
                className="w-full bg-[#2563eb] text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50 mt-6 shadow-sm"
              >
                <UserCheck className="h-4 w-4" />
                {busy ? "Saving Records..." : "Save Attendance Logs"}
              </button>
            </div>
          )}
        </div>
      )}

      {!classId && (
        <div className="text-center py-16 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
          Please select a classroom above to mark student attendance.
        </div>
      )}
    </AppShell>
  );
}

// ================= STUDENT ATTENDANCE LOG =================

function StudentAttendance({ user, db }: { user: AuthUser; db: LMS_DB }) {
  const studentId = user.id;

  // Filter attendance logs for this student
  const logs = useMemo(() => {
    return db.attendance
      .filter((a: LocalAttendance) => a.studentId === studentId)
      .sort((a: LocalAttendance, b: LocalAttendance) => b.date.localeCompare(a.date));
  }, [db.attendance, studentId]);

  // Overall calculations
  const stats = useMemo(() => {
    const total = logs.length;
    if (total === 0) return { pct: 100, present: 0, absent: 0 };
    const present = logs.filter((a: LocalAttendance) => a.status === "present").length;
    const pct = Math.round((present / total) * 100);
    return { pct, present, absent: total - present };
  }, [logs]);

  return (
    <AppShell title="My Attendance Tracker" back="/">
      {/* Stats summary card */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <BarChart className="h-4 w-4 text-[#2563eb]" /> Academic Attendance Summary
        </h3>

        <div className="flex items-center gap-6">
          <div className="relative shrink-0 flex items-center justify-center h-20 w-20 rounded-full border-4 border-gray-100 bg-white shadow-inner">
            <div className="text-center">
              <span className="text-xl font-extrabold text-[#2563eb]">{stats.pct}%</span>
              <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Present</p>
            </div>
          </div>

          <div className="flex-1 space-y-1.5 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="text-gray-500">Conducted Classes:</span>
              <span className="text-gray-800">{logs.length}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-emerald-600">Attended Days:</span>
              <span className="text-emerald-700">{stats.present}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-rose-600">Absences Recorded:</span>
              <span className="text-rose-700">{stats.absent}</span>
            </div>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full mt-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              stats.pct >= 75 ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <p className="text-[9px] text-gray-400 font-medium mt-1.5">
          * Minimally 75% attendance is required to qualify for exams.
        </p>
      </div>

      {/* Attendance timeline logs */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-[#2563eb]" /> Class Log Timeline
        </h3>

        {logs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No attendance logs found for your profile yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log: LocalAttendance) => {
              const activeClass = db.classes.find((c: LocalClass) => c.id === log.classId);
              const isPresent = log.status === "present";
              const formattedDate = new Date(log.date).toLocaleDateString("en-IN", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={log.id}
                  className="bg-white p-3.5 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827]">{formattedDate}</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                      Subject:{" "}
                      <span className="text-gray-700">
                        {activeClass ? activeClass.subject : "Class Session"}
                      </span>
                    </p>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                      isPresent
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isPresent ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {isPresent ? "Present" : "Absent"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
