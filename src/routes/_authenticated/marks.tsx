import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions, type LMS_DB } from "@/lib/store";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Percent, Trash2, Award, BookOpen, Upload } from "lucide-react";
import type { LocalStudent, LocalMark, LocalClass, LocalLecturer } from "@/lib/store";
import * as xlsx from "xlsx";

export const Route = createFileRoute("/_authenticated/marks")({
  head: () => ({ meta: [{ title: "LMS - Student Marks" }] }),
  component: MarksPage,
});

function MarksPage() {
  const user = getCurrentUser();
  const db = useDB();

  if (!user) {
    return null;
  }

  return user.role === "teacher" || user.role === "super_admin" ? (
    <TeacherMarks db={db} user={user} />
  ) : (
    <StudentMarks user={user} db={db} />
  );
}

// ================= TEACHER MARKS MANAGEMENT =================

function TeacherMarks({ db, user }: { db: LMS_DB; user: AuthUser }) {
  const [studentId, setStudentId] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLecturer = db.lecturers.find((l) => l.id === user.id);
  const isSuperAdmin = user.role === "super_admin";
  
  const availableClasses = useMemo(() => {
    if (isSuperAdmin) return db.classes;
    const assignedIds = currentLecturer?.classIds || [];
    return db.classes.filter(c => assignedIds.includes(c.id));
  }, [isSuperAdmin, db.classes, currentLecturer]);

  const uniqueClassNames = useMemo(() => {
    return Array.from(new Set(availableClasses.map(c => c.name).filter(Boolean)));
  }, [availableClasses]);

  // Auto-select class if only one
  useEffect(() => {
    if (uniqueClassNames.length === 1 && selectedClassName !== uniqueClassNames[0]) {
      setSelectedClassName(uniqueClassNames[0]);
    }
  }, [uniqueClassNames, selectedClassName]);

  const availableSubjects = useMemo(() => {
    if (!selectedClassName) return [];
    return availableClasses.filter(c => c.name === selectedClassName).map(c => c.subject);
  }, [availableClasses, selectedClassName]);

  // Auto-select subject if only one
  useEffect(() => {
    if (availableSubjects.length === 1 && selectedSubject !== availableSubjects[0]) {
      setSelectedSubject(availableSubjects[0]);
    } else if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject("");
    }
  }, [availableSubjects, selectedSubject]);

  const filteredStudents = useMemo(() => {
    return db.students.filter(stu => {
      if (!selectedClassName) return false; // Require a class to be selected
      return stu.classIds && stu.classIds.some(id => db.classes.find(c => c.id === id)?.name === selectedClassName);
    });
  }, [db.students, selectedClassName, db.classes]);

  async function handleAddMarks(e: React.FormEvent) {
    e.preventDefault();
    const cleanSubject = selectedSubject.trim();
    const scoreNum = Number(score);
    const maxNum = Number(maxScore);

    if (!studentId || !selectedClassName || !cleanSubject || isNaN(scoreNum) || isNaN(maxNum)) {
      toast.error("Please provide valid student, class, subject, and scores.");
      return;
    }

    if (scoreNum < 0 || maxNum <= 0 || scoreNum > maxNum) {
      toast.error("Marks scored must be between 0 and maximum marks.");
      return;
    }

    setBusy(true);
    try {
      await actions.addMarks({
        studentId,
        subject: cleanSubject,
        marks: scoreNum,
        maxMarks: maxNum,
      });
      toast.success("Marks added successfully.");
      setScore("");
    } catch (err) {
      toast.error("Failed to save student marks.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMarks(id: string) {
    if (!confirm("Are you sure you want to delete this mark entry?")) {
      return;
    }

    try {
      await actions.deleteMarks(id);
      toast.success("Marks entry deleted.");
    } catch (err) {
      toast.error("Failed to delete marks.");
    }
  }

  function handleImportMarks(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setBusy(true);
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);

        let importedCount = 0;

        for (const row of data as any[]) {
          const campusId = row["Campus ID"];
          const subjectStr = row["Subject"];
          const marksStr = row["Marks Obtained"];
          const maxMarksStr = row["Maximum Marks"];

          if (!campusId || !subjectStr || marksStr == null || maxMarksStr == null) continue;
          
          const student = db.students.find((s: LocalStudent) => s.campusId.toLowerCase() === String(campusId).toLowerCase());
          if (!student) continue;

          const marksObtainedNum = Number(marksStr);
          const maxNum = Number(maxMarksStr);

          if (!isNaN(marksObtainedNum) && !isNaN(maxNum) && maxNum > 0) {
            await actions.addMarks({
              studentId: student.id,
              subject: String(subjectStr),
              marks: marksObtainedNum,
              maxMarks: maxNum
            });
            importedCount++;
          }
        }
        
        if (importedCount > 0) {
          toast.success(`Successfully imported ${importedCount} mark entries!`);
        } else {
          toast.error("No valid entries found in the file.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel file.");
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  }

  return (
    <AppShell title="Student Marks" back="/">
      {/* Add Marks Form Card */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#2563eb]" /> Add Student Score
        </h2>

        <form onSubmit={handleAddMarks} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Class</label>
            {uniqueClassNames.length === 1 ? (
              <div className="w-full border border-gray-100 bg-gray-50 text-gray-500 rounded-lg px-3 py-2.5 text-xs font-medium mb-3">
                {uniqueClassNames[0]}
              </div>
            ) : (
              <select
                required
                value={selectedClassName}
                onChange={(e) => {
                  setSelectedClassName(e.target.value);
                  setStudentId("");
                }}
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none mb-3"
              >
                <option value="">-- Choose Class --</option>
                {uniqueClassNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>

          {selectedClassName && availableSubjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Subject</label>
              {availableSubjects.length === 1 ? (
                <div className="w-full border border-gray-100 bg-gray-50 text-gray-500 rounded-lg px-3 py-2.5 text-xs font-medium mb-3">
                  {availableSubjects[0]}
                </div>
              ) : (
                <select
                  required
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none mb-3"
                >
                  <option value="">-- Choose Subject --</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Student</label>
            <select
              value={studentId}
              required
              disabled={!selectedClassName || !selectedSubject}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none disabled:opacity-50"
            >
              <option value="">{selectedClassName && selectedSubject ? "-- Choose Student --" : "-- Select Class & Subject First --"}</option>
              {filteredStudents.map((stu: LocalStudent) => {
                return (
                  <option key={stu.id} value={stu.id}>
                    {stu.name} (ID: {stu.campusId})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Marks Obtained
              </label>
              <input
                type="number"
                required
                min="0"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 85"
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Maximum Marks
              </label>
              <input
                type="number"
                required
                min="1"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                placeholder="e.g. 100"
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#2563eb] text-white rounded-lg py-2.5 text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 mt-2"
          >
            {busy ? "Saving Score..." : "Record Score"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportMarks} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white text-gray-700 border border-gray-200 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
          >
            <Upload className="h-4 w-4 text-blue-600" /> Upload Bulk Marks (Excel)
          </button>
        </div>
      </div>

      {/* Marks Entries Listing */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Recorded Evaluations ({db.marks.length})
        </h3>

        {db.marks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No marks recorded yet. Add scores above.
          </div>
        ) : (
          <div className="space-y-3">
            {db.marks.map((entry: LocalMark) => {
              const student = db.students.find((s: LocalStudent) => s.id === entry.studentId);
              const pct = Math.round((entry.marks / entry.maxMarks) * 100);

              return (
                <div
                  key={entry.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-blue-50 text-[#2563eb] rounded-lg shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-[#111827] truncate">
                        {student ? student.name : "Unknown Student"}
                      </p>
                      <p className="text-gray-500 font-semibold mt-0.5">
                        Subject: <span className="text-[#2563eb]">{entry.subject}</span>
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        Score: <span className="text-gray-800 font-bold">{entry.marks}</span> /{" "}
                        {entry.maxMarks} ({pct}%)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMarks(entry.id)}
                    className="p-2 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition shrink-0 ml-3"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ================= STUDENT MARKS VIEWER =================

function StudentMarks({ user, db }: { user: AuthUser; db: LMS_DB }) {
  const studentId = user.id;

  // Filter marks for active student
  const myMarks = useMemo(() => {
    return db.marks.filter((m: LocalMark) => m.studentId === studentId);
  }, [db.marks, studentId]);

  // Overall calculations
  const stats = useMemo(() => {
    if (myMarks.length === 0) return { score: 0, max: 0, pct: 0 };
    const score = myMarks.reduce((sum: number, m: LocalMark) => sum + m.marks, 0);
    const max = myMarks.reduce((sum: number, m: LocalMark) => sum + m.maxMarks, 0);
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    return { score, max, pct };
  }, [myMarks]);

  return (
    <AppShell title="My Marks Sheet" back="/">
      {/* Overall Score Summary */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Award className="h-4 w-4 text-[#2563eb]" /> Academic Performance
        </h3>

        {myMarks.length === 0 ? (
          <p className="text-xs text-gray-400">No evaluations published yet.</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 flex items-center justify-center h-20 w-20 rounded-full border-4 border-blue-50 bg-white">
              <div className="text-center">
                <span className="text-xl font-extrabold text-[#2563eb]">{stats.pct}%</span>
                <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">
                  Overall
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-500">Evaluations:</span>
                <span className="text-gray-800">{myMarks.length} courses</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-500">Total Marks Scored:</span>
                <span className="text-[#2563eb] font-bold">
                  {stats.score} / {stats.max}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-500">Passing Status:</span>
                <span
                  className={
                    stats.pct >= 40 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"
                  }
                >
                  {stats.pct >= 40 ? "Pass (Satisfactory)" : "Needs Attention"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Course specific grades list */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-[#2563eb]" /> Course Grades Breakdown
        </h3>

        {myMarks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No subject grades published yet. Check back later.
          </div>
        ) : (
          <div className="space-y-3">
            {myMarks.map((entry: LocalMark) => {
              const scorePct = Math.round((entry.marks / entry.maxMarks) * 100);

              return (
                <div
                  key={entry.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm hover:border-blue-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#111827]">{entry.subject}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Marks obtained:{" "}
                        <span className="font-bold text-gray-800">{entry.marks}</span> /{" "}
                        {entry.maxMarks}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          scorePct >= 75
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : scorePct >= 40
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {scorePct}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal mini progress bar */}
                  <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        scorePct >= 75
                          ? "bg-emerald-500"
                          : scorePct >= 40
                            ? "bg-[#2563eb]"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
