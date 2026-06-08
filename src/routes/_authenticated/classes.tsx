import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { useState, useMemo } from "react";
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
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const groupedClasses = useMemo(() => {
    const groups: Record<string, typeof db.classes> = {};
    db.classes.forEach(c => {
      if (!groups[c.name]) groups[c.name] = [];
      groups[c.name].push(c);
    });
    return Object.entries(groups).map(([name, classes]) => ({ name, classes }));
  }, [db.classes]);


  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    const subjectsArray = subject.split(",").map(s => s.trim()).filter(Boolean);
    
    if (!name.trim() || subjectsArray.length === 0) {
      toast.error("Please fill in both Class Name and at least one Subject.");
      return;
    }

    setBusy(true);
    try {
      if (editingClassId) {
        if (subjectsArray.length > 1) {
          toast.error("You can only edit one subject at a time.");
          setBusy(false);
          return;
        }
        await actions.updateClass(editingClassId, {
          name: name.trim(),
          subject: subjectsArray[0],
        });
        toast.success("Class updated successfully.");
      } else {
        for (const sub of subjectsArray) {
          await actions.addClass({
            name: name.trim(),
            subject: sub,
          });
        }
        toast.success(`Class '${name}' added with ${subjectsArray.length} subject(s).`);
      }
      setEditingClassId(null);
      setName("");
      setSubject("");
    } catch (err) {
      toast.error(editingClassId ? "Failed to update class." : "Failed to add class.");
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
      if (editingClassId === id) {
        setEditingClassId(null);
        setName("");
        setSubject("");
      }
    } catch (err) {
      toast.error("Failed to delete class.");
    }
  }

  return (
    <AppShell title="Manage Classes" back="/">
      {/* Add Class Card */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#2563eb]" /> {editingClassId ? "Edit Class Room" : "Add New Class"}
          </h2>
          {editingClassId && (
            <button
              onClick={() => {
                setEditingClassId(null);
                setName("");
                setSubject("");
              }}
              className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
            >
              Cancel Edit
            </button>
          )}
        </div>
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
            {busy ? "Saving..." : editingClassId ? "Update Class Room" : "Create Class Room"}
          </button>
        </form>
      </div>

      {/* Classes List */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Active Classes ({groupedClasses.length} Groups)
        </h3>

        {groupedClasses.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No classes defined yet. Add a class to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {groupedClasses.map((group) => {
              const groupClassIds = group.classes.map(c => c.id);
              const studentCount = db.students.filter((s) => s.classIds?.some(id => groupClassIds.includes(id))).length;
              const isExpanded = expandedGroup === group.name;

              return (
                <div key={group.name} className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                  <div 
                    onClick={() => setExpandedGroup(isExpanded ? null : group.name)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-1 p-2 bg-blue-50 text-[#2563eb] rounded-lg">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#111827] truncate text-sm">{group.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5 font-medium">
                          {group.classes.length} Subject(s)
                        </p>
                        <span className="inline-block mt-2 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                          {studentCount} {studentCount === 1 ? "student" : "students"} total
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subjects in {group.name}</h4>
                      {group.classes.map(cls => {
                        const lecturer = db.lecturers.find(l => l.classIds?.includes(cls.id));
                        const clsStudentCount = db.students.filter((s) => s.classIds?.includes(cls.id)).length;
                        return (
                          <div key={cls.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{cls.subject}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Lecturer: {lecturer ? <span className="font-semibold text-[#2563eb]">{lecturer.name}</span> : <span className="italic">Unassigned</span>}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">{clsStudentCount} students assigned</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClassId(cls.id);
                                  setName(cls.name);
                                  setSubject(cls.subject);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="p-2 border border-[#e5e7eb] rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition"
                                title="Edit Subject"
                              >
                                <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}
                                className="p-2 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition"
                                title="Delete Subject"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
