import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions, type LMS_DB } from "@/lib/store";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, Filter } from "lucide-react";
import type { LocalDocument, LocalClass } from "@/lib/local-db";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "LMS - Study Materials" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const user = getCurrentUser();
  const db = useDB();

  if (!user) {
    return null;
  }

  return user.role === "teacher" || user.role === "super_admin" ? (
    <TeacherDocuments db={db} />
  ) : (
    <StudentDocuments user={user} db={db} />
  );
}

// ================= TEACHER DOCUMENT UPLOAD & MANAGE =================

function TeacherDocuments({ db }: { db: LMS_DB }) {
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  // File Upload base64 encoding handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!title) {
      // Auto fill title with file name without extension
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !classId || !subject.trim()) {
      toast.error("Please fill in Title, Subject, and assign a Class.");
      return;
    }

    // Default sample data URL if file wasn't picked
    const finalFileUrl =
      fileBase64 ||
      `data:text/plain;base64,${btoa(`Simulated lecture notes for ${title} under subject ${subject}`)}`;

    setBusy(true);
    try {
      await actions.addDocument({
        title: title.trim(),
        fileUrl: finalFileUrl,
        classId,
        subject: subject.trim(),
      });
      toast.success("Document uploaded and shared successfully.");
      setTitle("");
      setClassId("");
      setSubject("");
      setFileBase64("");
      setFileName("");
      // Reset input element
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      toast.error("Failed to upload document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete document '${name}'?`)) {
      return;
    }

    try {
      await actions.deleteDocument(id);
      toast.success("Document removed.");
    } catch (err) {
      toast.error("Failed to delete document.");
    }
  }

  return (
    <AppShell title="Study Materials" back="/">
      {/* Upload document form */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-[#2563eb]" /> Share Study Document
        </h2>

        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Document File (PDF / Image / TXT)
            </label>
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              accept="image/*,application/pdf,text/plain"
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-200 file:text-xs file:font-semibold file:bg-white file:text-[#2563eb] hover:file:bg-gray-50 file:cursor-pointer"
            />
            {fileName && (
              <p className="text-[10px] text-[#2563eb] mt-1 font-medium truncate">
                Selected: {fileName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Document Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lecture Notes 1 - Introduction"
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Subject label
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics"
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Assign to Class
              </label>
              <select
                value={classId}
                required
                onChange={(e) => setClassId(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
              >
                <option value="">-- Choose Target --</option>
                <option value="all">All Students</option>
                {db.classes.map((cls: LocalClass) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#2563eb] text-white rounded-lg py-2.5 text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 mt-2"
          >
            {busy ? "Uploading Study Document..." : "Upload & Share"}
          </button>
        </form>
      </div>

      {/* Shared Files List */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Shared Documents ({db.documents.length})
        </h3>

        {db.documents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No study documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {db.documents.map((doc: LocalDocument) => {
              const targetClass = db.classes.find((c: LocalClass) => c.id === doc.classId);
              return (
                <div
                  key={doc.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-blue-50 text-[#2563eb] rounded-lg shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-[#111827] text-sm truncate">{doc.title}</p>
                      <p className="text-gray-500 font-medium mt-0.5">
                        Subject: <span className="text-[#2563eb]">{doc.subject}</span>
                      </p>
                      <span className="inline-block mt-1.5 text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                        Shared with:{" "}
                        {doc.classId === "all" ? "All Students" : targetClass?.name || "Class"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <a
                      href={doc.fileUrl}
                      download={doc.title}
                      className="p-2.5 rounded-lg border border-[#e5e7eb] hover:bg-gray-50 text-gray-600 transition"
                      title="Download File"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-2.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition"
                      title="Delete File"
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
    </AppShell>
  );
}

// ================= STUDENT DOCUMENT VIEWER =================

function StudentDocuments({ user, db }: { user: AuthUser; db: LMS_DB }) {
  const [filterSubject, setFilterSubject] = useState("");

  // Filter study files matching the student class or assigned to all
  const filteredDocs = useMemo(() => {
    return db.documents.filter((doc: LocalDocument) => {
      const isAssigned = doc.classId === "all" || doc.classId === user.classId;
      const matchesSubject = filterSubject
        ? doc.subject.toLowerCase() === filterSubject.toLowerCase()
        : true;
      return isAssigned && matchesSubject;
    });
  }, [db.documents, user.classId, filterSubject]);

  // Unique list of subjects for filter
  const subjectsList = useMemo(() => {
    const list = db.documents
      .filter((doc: LocalDocument) => doc.classId === "all" || doc.classId === user.classId)
      .map((doc: LocalDocument) => doc.subject);
    return Array.from(new Set(list)) as string[];
  }, [db.documents, user.classId]);

  return (
    <AppShell title="Class Documents" back="/">
      {/* Filtering Options */}
      <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] mb-5 shadow-sm">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-[#2563eb]" /> Filter by Course Subject
        </label>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none"
        >
          <option value="">All Subjects</option>
          {subjectsList.map((sub, idx) => (
            <option key={idx} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>

      {/* Documents Grid */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Syllabus & Material Notes ({filteredDocs.length})
        </h3>

        {filteredDocs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No study materials posted under your assigned classes yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc: LocalDocument) => (
              <div
                key={doc.id}
                className="bg-white p-4 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm hover:border-blue-100 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-blue-50 text-[#2563eb] rounded-lg shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-[#111827] text-sm truncate">{doc.title}</p>
                    <p className="text-gray-500 font-medium mt-0.5">
                      Subject Focus: <span className="text-[#2563eb]">{doc.subject}</span>
                    </p>
                    <span className="inline-block mt-1.5 text-[8px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Study Notes
                    </span>
                  </div>
                </div>

                <a
                  href={doc.fileUrl}
                  download={doc.title}
                  className="p-3 bg-[#eff6ff] border border-blue-200 text-[#2563eb] rounded-lg hover:bg-blue-100 transition shrink-0 ml-3"
                  title="Download File"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
