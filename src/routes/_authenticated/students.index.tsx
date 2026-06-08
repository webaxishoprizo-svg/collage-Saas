import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { useState, useMemo } from "react";
import { Plus, Search, User, Edit2, Trash2, FilterX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/students/")({
  head: () => ({ meta: [{ title: "LMS - Manage Students" }] }),
  component: StudentsManagement,
});

function StudentsManagement() {
  const user = getCurrentUser();
  const db = useDB();

  if (user?.role !== "super_admin") {
    return <AppShell title="Access Denied" back="/"><div className="p-8 text-center text-red-500 font-bold">Not Authorized</div></AppShell>;
  }
  const [query, setQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return db.students.filter((s) => {
      const matchesQuery =
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.campusId.toLowerCase().includes(query.toLowerCase());
      const matchesClass = selectedClassId ? s.classIds?.includes(selectedClassId) : true;
      return matchesQuery && matchesClass;
    });
  }, [db.students, query, selectedClassId]);


  async function handleDeleteStudent(id: string, name: string) {
    if (
      !confirm(
        `Are you sure you want to delete student '${name}'? This will delete all their marks, attendance, and fee history.`,
      )
    ) {
      return;
    }

    try {
      await actions.deleteStudent(id);
      toast.success(`Student '${name}' deleted successfully.`);
    } catch (err) {
      toast.error("Failed to delete student.");
    }
  }

  return (
    <AppShell
      title="Manage Students"
      back="/"
      action={
        <Link
          to="/students/add"
          className="p-1.5 rounded-lg text-white bg-[#2563eb] hover:bg-blue-700 font-bold text-xs flex items-center gap-1 shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Student
        </Link>
      }
    >
      {/* Search and Filters */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student name or ID..."
            className="w-full border border-[#e5e7eb] rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:border-[#2563eb]"
          />
        </div>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="border border-[#e5e7eb] rounded-lg px-2 py-2 text-xs bg-white focus:outline-none max-w-[140px]"
        >
          <option value="">All Classes</option>
          {db.classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        {selectedClassId && (
          <button
            onClick={() => setSelectedClassId("")}
            className="p-2 border border-[#e5e7eb] rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100"
            title="Clear Filter"
          >
            <FilterX className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Student List */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Students Enrolled ({filteredStudents.length})
        </h3>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            {query || selectedClassId
              ? "No students match your filters."
              : "No students added yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((stu) => {
              // Calculate personal attendance details

              // Calculate personal attendance details
              const studentAttendance = db.attendance.filter((a) => a.studentId === stu.id);
              const totalClasses = studentAttendance.length;
              const presentClasses = studentAttendance.filter((a) => a.status === "present").length;
              const attendancePct =
                totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : null;

              return (
                <div
                  key={stu.id}
                  className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-sm text-[#111827] truncate">{stu.name}</p>
                      <p className="text-gray-500 font-medium mt-0.5">
                        Campus ID: <span className="text-gray-800">{stu.campusId}</span>
                      </p>
                      <p className="text-gray-500 mt-0.5">
                        Classes:{" "}
                        <span className="text-gray-800">
                          {stu.classIds && stu.classIds.length > 0
                            ? stu.classIds
                                .map((id) => db.classes.find((c) => c.id === id)?.name)
                                .filter(Boolean)
                                .join(", ")
                            : "Unassigned"}
                        </span>
                      </p>
                      {stu.durationMonths && (
                        <p className="text-orange-600 mt-0.5 font-semibold text-[10px] uppercase">
                          {stu.durationMonths}-Month Course (Started {new Date(stu.enrollmentDate).toLocaleDateString()})
                        </p>
                      )}
                      {attendancePct !== null ? (
                        <span
                          className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            attendancePct >= 75
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {attendancePct}% Attendance
                        </span>
                      ) : (
                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          No Attendance Data
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Link
                      to="/students/add"
                      search={{ id: stu.id }}
                      className="p-2 border border-[#e5e7eb] rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition"
                      title="Edit Student"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteStudent(stu.id, stu.name)}
                      className="p-2 border border-red-100 rounded-lg bg-white text-red-500 hover:bg-red-50 transition"
                      title="Delete Student"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
