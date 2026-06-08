import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, BookOpen, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "LMS - Manage Classes" }] }),
  component: ClassesManagement,
});

function ClassesManagement() {
  const user = getCurrentUser();
  const db = useDB();

  if (user?.role !== "super_admin") {
    return <AppShell title="Access Denied" back="/"><div className="p-8 text-center text-red-500 font-bold">Not Authorized</div></AppShell>;
  }

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);


  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    const subjectsArray = subject.split(",").map(s => s.trim()).filter(Boolean);
    
    if (!name.trim() || subjectsArray.length === 0) {
      toast.error("Please fill in both Class Name and at least one Subject.");
      return;
    }

    setBusy(true);
    try {
      for (const sub of subjectsArray) {
        await actions.addClass({
          name: name.trim(),
          subject: sub,
        });
      }
      toast.success(`Class '${name}' added with ${subjectsArray.length} subject(s).`);
      setName("");
      setSubject("");
    } catch (err) {
      toast.error("Failed to add class.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteClass(id: string) {
    if (
      !confirm("Are you sure you want to delete this class? Assigned students will be unassigned.")
    ) {
      return;
    }

    try {
      await actions.deleteClass(id);
      toast.success("Class deleted successfully.");
    } catch (err) {
      toast.error("Failed to delete class.");
    }
  }

  return (
    <AppShell title="Manage Classes" back="/">
      {/* Add Class Card */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#2563eb]" /> Add New Class
        </h2>
        <form onSubmit={handleAddClass} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Class Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. B.Sc Computer Science - Year 3"
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Name(s)</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Database Systems, Web Development (comma separated)"
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#2563eb] text-white rounded-lg py-2.5 text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {busy ? "Saving..." : "Create Class Room"}
          </button>
        </form>
      </div>

      {/* Classes List */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Active Classes ({db.classes.length})
        </h3>

        {db.classes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No classes defined yet. Add a class to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {db.classes.map((cls) => {
              // Count assigned students
              const studentCount = db.students.filter((s) => s.classIds?.includes(cls.id)).length;

              return (
                <div
                  key={cls.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm hover:border-blue-100 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1 p-2 bg-blue-50 text-[#2563eb] rounded-lg">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#111827] truncate text-sm">{cls.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5 font-medium">
                        Subject: <span className="text-[#2563eb]">{cls.subject}</span>
                      </p>
                      <span className="inline-block mt-2 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                        {studentCount} {studentCount === 1 ? "student" : "students"} assigned
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteClass(cls.id)}
                    className="p-2.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition shrink-0 ml-3"
                    title="Delete Class"
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
