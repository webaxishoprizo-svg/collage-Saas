import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, UserCheck, Shield, Trash2, Key } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lecturers")({
  head: () => ({ meta: [{ title: "LMS - Manage Lecturers" }] }),
  component: LecturersManagement,
});

function LecturersManagement() {
  const user = getCurrentUser();
  const db = useDB();

  if (user?.role !== "super_admin") {
    return <AppShell title="Access Denied" back="/"><div className="p-8 text-center text-red-500 font-bold">Not Authorized</div></AppShell>;
  }

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "super_admin">("teacher");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingLecturerId, setEditingLecturerId] = useState<string | null>(null);

  // Access Control: Super Admin only
  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-[#111827]">
        <p className="text-sm font-semibold">Unauthorized access.</p>
      </div>
    );
  }

  async function handleAddLecturer(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) {
      toast.error("Please fill in Name, Username, and Password.");
      return;
    }

    // Check unique username
    const exists = db.lecturers.some((l) => l.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      toast.error(`A lecturer with username '${username}' already exists.`);
      return;
    }

    setBusy(true);
    try {
      if (editingLecturerId) {
        await actions.updateLecturer(editingLecturerId, {
          name: name.trim(),
          username: username.trim(),
          password: password.trim(),
          role,
          classIds: selectedClasses,
        });
        toast.success(`Lecturer '${name}' updated successfully.`);
      } else {
        await actions.addLecturer({
          name: name.trim(),
          username: username.trim(),
          password: password.trim(),
          role,
          classIds: selectedClasses,
        });
        toast.success(`Lecturer '${name}' added successfully.`);
      }
      setEditingLecturerId(null);
      setName("");
      setUsername("");
      setPassword("");
      setRole("teacher");
      setSelectedClasses([]);
    } catch (err) {
      toast.error(editingLecturerId ? "Failed to update lecturer." : "Failed to add lecturer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteLecturer(id: string, name: string) {
    if (id === user!.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Are you sure you want to delete lecturer '${name}'?`)) {
      return;
    }

    try {
      await actions.deleteLecturer(id);
      toast.success("Lecturer deleted successfully.");
      if (editingLecturerId === id) {
        setEditingLecturerId(null);
        setName("");
        setUsername("");
        setPassword("");
        setSelectedClasses([]);
      }
    } catch (err) {
      toast.error("Failed to delete lecturer.");
    }
  }

  return (
    <AppShell title="Manage Lecturers" back="/">
      {/* Add Lecturer Card */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#2563eb]" /> {editingLecturerId ? "Edit Lecturer Account" : "Create Lecturer Account"}
          </h2>
          {editingLecturerId && (
            <button
              onClick={() => {
                setEditingLecturerId(null);
                setName("");
                setUsername("");
                setPassword("");
                setRole("teacher");
                setSelectedClasses([]);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
            >
              Cancel Edit
            </button>
          )}
        </div>
        <form onSubmit={handleAddLecturer} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Robert Vance"
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. robertvance"
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. securepass123"
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563eb]"
            >
              <option value="teacher">Lecturer (Can manage students, marks, attendance)</option>
              <option value="super_admin">Super Admin (Can also manage lecturers)</option>
            </select>
          </div>

          {db.classes.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Assign Classes</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-[#e5e7eb] rounded-lg p-3 bg-white">
                {db.classes.map(cls => (
                  <label key={cls.id} className="flex items-center gap-2 text-xs text-gray-700">
                    <input 
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedClasses([...selectedClasses, cls.id]);
                        else setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                      }}
                      className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                    />
                    {cls.name} <span className="text-gray-400">({cls.subject})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#2563eb] text-white rounded-lg py-2 text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 mt-2"
          >
            {busy ? "Saving..." : editingLecturerId ? "Update Account" : "Create Account"}
          </button>
        </form>
      </div>

      {/* Existing Lecturers */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Active Accounts ({db.lecturers.length})
        </h3>

        {db.lecturers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No active accounts.
          </div>
        ) : (
          <div className="space-y-3">
            {db.lecturers.map((lec) => (
              <div
                key={lec.id}
                className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm"
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
                    <p className="text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                      <Key className="h-3 w-3" /> Password: <span className="text-gray-800">{lec.password}</span>
                    </p>
                    <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${lec.role === "super_admin" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-blue-50 text-[#2563eb] border border-blue-200"}`}>
                      {lec.role === "super_admin" ? "Super Admin" : "Lecturer"}
                    </span>
                    {lec.classIds && lec.classIds.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Classes: <span className="font-semibold text-gray-700">
                          {Array.from(new Set(lec.classIds.map(id => db.classes.find(c => c.id === id)?.name).filter(Boolean))).join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => {
                      setEditingLecturerId(lec.id);
                      setName(lec.name);
                      setUsername(lec.username);
                      setPassword(lec.password || "");
                      setRole(lec.role);
                      setSelectedClasses(lec.classIds || []);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2 border border-[#e5e7eb] rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition"
                    title="Edit Account"
                  >
                    <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button
                    onClick={() => handleDeleteLecturer(lec.id, lec.name)}
                    className="p-2 border border-red-100 rounded-lg bg-white text-red-500 hover:bg-red-50 transition"
                    title="Delete Account"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
