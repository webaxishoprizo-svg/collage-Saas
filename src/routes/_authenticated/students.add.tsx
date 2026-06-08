import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus, Save } from "lucide-react";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/students/add")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "LMS - Student Details" }] }),
  component: AddEditStudentPage,
});

function AddEditStudentPage() {
  const user = getCurrentUser();
  const db = useDB();
  const nav = useNavigate();

  if (user?.role !== "super_admin") {
    return <AppShell title="Access Denied" back="/"><div className="p-8 text-center text-red-500 font-bold">Not Authorized</div></AppShell>;
  }
  const { id } = Route.useSearch();

  const [name, setName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [durationMonths, setDurationMonths] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Find student if we are editing
  const editingStudent = id ? db.students.find((s) => s.id === id) : null;

  useEffect(() => {
    if (editingStudent) {
      setName(editingStudent.name);
      setCampusId(editingStudent.campusId);
      setClassIds(editingStudent.classIds || []);
      setDurationMonths(editingStudent.durationMonths || null);
    }
  }, [editingStudent]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanCampusId = campusId.trim();

    if (!cleanName || !cleanCampusId) {
      toast.error("Please fill in Name and Campus ID.");
      return;
    }

    // Unique Campus ID Check
    const exists = db.students.some(
      (s) => s.campusId.toLowerCase() === cleanCampusId.toLowerCase() && s.id !== id,
    );
    if (exists) {
      toast.error(`A student with Campus ID '${cleanCampusId}' already exists.`);
      return;
    }

    setBusy(true);
    try {
      if (editingStudent && id) {
        await actions.updateStudent(id, {
          name: cleanName,
          campusId: cleanCampusId,
          classIds: classIds,
          durationMonths: durationMonths,
        });
        toast.success("Student updated successfully.");
      } else {
        await actions.addStudent({
          name: cleanName,
          campusId: cleanCampusId,
          password: "password", // Default password
          classIds: classIds,
          enrollmentDate: new Date().toISOString(),
          durationMonths: durationMonths,
        });
        toast.success("Student added successfully.");
      }
      nav({ to: "/students" });
    } catch (err) {
      toast.error("Failed to save student details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={editingStudent ? "Edit Student Details" : "Register Student"} back="/students">
      <div className="bg-white p-5 rounded-xl border border-[#e5e7eb] shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-5 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#2563eb]" />{" "}
          {editingStudent ? "Modify Student Profile" : "Register New Student Account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Smith"
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Campus ID (Unique)
            </label>
            <input
              type="text"
              required
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              placeholder="e.g. CS104"
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          {editingStudent && id && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-orange-900">Account Password</p>
                <p className="text-xs text-orange-700 mt-0.5">Reset this student's password to the default "password"</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Reset password to 'password'?")) {
                    setBusy(true);
                    try {
                      await actions.updateStudent(id, { password: "password" });
                      toast.success("Password reset to default!");
                    } catch (err) {
                      toast.error("Failed to reset password.");
                    } finally {
                      setBusy(false);
                    }
                  }
                }}
                className="px-3 py-1.5 bg-white border border-orange-300 text-orange-700 text-xs font-bold rounded hover:bg-orange-100 transition"
              >
                Reset Password
              </button>
            </div>
          )}

          {!editingStudent && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2">
              <span className="text-xs font-bold text-blue-900 mt-0.5">ℹ️</span>
              <p className="text-xs text-blue-800">
                The student's initial password will automatically be set to <strong>password</strong>. They can change this later from their dashboard.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Assign Classroom / Subject Focus (Select multiple)
            </label>
            <div className="border border-[#e5e7eb] rounded-lg p-2 max-h-40 overflow-y-auto bg-white space-y-1">
              {db.classes.length === 0 ? (
                <p className="text-xs text-gray-400 p-2 text-center">No classes created yet.</p>
              ) : (
                db.classes.map((cls) => (
                  <label key={cls.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={classIds.includes(cls.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setClassIds([...classIds, cls.id]);
                        } else {
                          setClassIds(classIds.filter((id) => id !== cls.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{cls.name} ({cls.subject})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Enrollment Duration (Auto-Delete after expiry)
            </label>
            <select
              value={durationMonths === null ? "" : durationMonths.toString()}
              onChange={(e) => setDurationMonths(e.target.value === "" ? null : parseInt(e.target.value))}
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
            >
              <option value="">Unlimited (No expiry)</option>
              <option value="3">3 Months Course</option>
              <option value="6">6 Months Course</option>
              <option value="12">12 Months (1 Year) Course</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#2563eb] text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50 mt-6"
          >
            <Save className="h-4 w-4" />
            {busy
              ? "Saving details..."
              : editingStudent
                ? "Save Changes"
                : "Create Student Account"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
