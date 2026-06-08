import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, UserCheck, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lecturer-attendance")({
  head: () => ({ meta: [{ title: "LMS - Lecturer Attendance" }] }),
  component: LecturerAttendanceManagement,
});

function LecturerAttendanceManagement() {
  const user = getCurrentUser();
  const db = useDB();

  if (user?.role !== "super_admin") {
    return <AppShell title="Access Denied" back="/"><div className="p-8 text-center text-red-500 font-bold">Not Authorized</div></AppShell>;
  }

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Access Control: Super Admin only
  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-[#111827]">
        <p className="text-sm font-semibold">Unauthorized access.</p>
      </div>
    );
  }

  async function handleStatusUpdate(lecturerId: string, status: "present" | "absent" | "leave") {
    if (!date) {
      toast.error("Please select a date first.");
      return;
    }
    setBusyId(lecturerId);
    try {
      await actions.updateLecturerAttendance(lecturerId, date, status);
      toast.success(`Attendance marked as ${status} successfully.`);
    } catch (err) {
      toast.error("Failed to update attendance.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Lecturer Attendance" back="/">
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Select Date</h2>
            <p className="text-xs text-gray-500">Pick a date to mark attendance</p>
          </div>
        </div>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Lecturers List
        </h3>

        {db.lecturers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No active lecturers found.
          </div>
        ) : (
          <div className="space-y-3">
            {db.lecturers.map((lec) => {
              // Find if there is an attendance record for this lecturer on the selected date
              const record = db.lecturer_attendance.find(
                (a) => a.lecturerId === lec.id && a.date === date
              );

              return (
                <div
                  key={lec.id}
                  className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0">
                      {lec.role === "super_admin" ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <UserCheck className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-sm text-[#111827] truncate">{lec.name}</p>
                      <p className="text-gray-500 font-medium mt-0.5">
                        Username: <span className="text-gray-800">{lec.username}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStatusUpdate(lec.id, "present")}
                      disabled={busyId === lec.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                        record?.status === "present"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-white text-gray-600 border-[#e5e7eb] hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                      } disabled:opacity-50`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(lec.id, "absent")}
                      disabled={busyId === lec.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                        record?.status === "absent"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-white text-gray-600 border-[#e5e7eb] hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      } disabled:opacity-50`}
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(lec.id, "leave")}
                      disabled={busyId === lec.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                        record?.status === "leave"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                          : "bg-white text-gray-600 border-[#e5e7eb] hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200"
                      } disabled:opacity-50`}
                    >
                      Leave
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
