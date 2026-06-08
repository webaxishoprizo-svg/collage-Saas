import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, type LMS_DB } from "@/lib/store";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import {
  Users,
  CheckSquare,
  BookOpen,
  DollarSign,
  FileText,
  Percent,
  Plus,
  ArrowRight,
  UserCheck,
  Lock,
  Key,
  UserCircle,
  X,
  GraduationCap,
  Shield,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import type {
  LocalStudent,
  LocalDocument,
  LocalAttendance,
  LocalFee,
  LocalClass,
} from "@/lib/local-db";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "LMS - Home" }] }),
  component: UnifiedIndex,
});

function UnifiedIndex() {
  const user = getCurrentUser();
  const db = useDB();

  // If session is missing, show basic loading
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-[#111827]">
        <p className="text-sm font-semibold">Redirecting...</p>
      </div>
    );
  }

  return user.role === "super_admin" ? (
    <SuperAdminDashboard user={user} db={db} />
  ) : user.role === "teacher" ? (
    <TeacherDashboard user={user} db={db} />
  ) : (
    <StudentDashboard user={user} db={db} />
  );
}

// ================= SUPER ADMIN DASHBOARD =================

function SuperAdminDashboard({ user, db }: { user: AuthUser; db: LMS_DB }) {
  const [newName, setNewName] = useState(user.name);
  const [newUsername, setNewUsername] = useState(user.campusId);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Auto-cleanup expired students on mount
  useEffect(() => {
    import("@/lib/store").then((m) => m.actions.cleanupExpiredStudents());
  }, []);

  // 1. Total Students
  const totalStudents = db.students.length;

  // 2. Avg Attendance %
  const avgAttendance = useMemo(() => {
    const totalRecords = db.attendance.length;
    if (totalRecords === 0) return 0;
    const presentRecords = db.attendance.filter(
      (a: LocalAttendance) => a.status === "present",
    ).length;
    return Math.round((presentRecords / totalRecords) * 100);
  }, [db.attendance]);

  // 3. Pending Fees
  const pendingFees = useMemo(() => {
    return db.fees.reduce((sum: number, f: LocalFee) => sum + (f.pending || 0), 0);
  }, [db.fees]);

  // 4. Documents Count
  const docCount = db.documents.length;

  // Recent activity calculations: combine last marked attendance classes, uploads, marks entered
  const recentActivities = useMemo(() => {
    const list: { type: string; title: string; desc: string; time: string }[] = [];

    // Documents
    db.documents.slice(-2).forEach((doc: LocalDocument) => {
      const clsName =
        db.classes.find((c: LocalClass) => c.id === doc.classId)?.name || "All Classes";
      list.push({
        type: "doc",
        title: `Document Uploaded: ${doc.title}`,
        desc: `Subject: ${doc.subject} | Assigned to: ${clsName}`,
        time: "Recently",
      });
    });

    // Student Additions
    db.students.slice(-2).forEach((s: LocalStudent) => {
      list.push({
        type: "student",
        title: `New Student Added: ${s.name}`,
        desc: `Campus ID: ${s.campusId} | Roll no. created`,
        time: "Recently",
      });
    });

    return list.slice(0, 4);
  }, [db.documents, db.students, db.classes]);

  const profileAction = (
    <button onClick={() => setShowProfileModal(true)} className="p-1 -ml-1 rounded-full bg-gray-50 border border-gray-200 text-[#2563eb] hover:bg-blue-50 transition" title="Teacher Profile & Security">
      <UserCircle className="h-6 w-6" />
    </button>
  );

  return (
    <AppShell title="Lecturer Dashboard" showSignOut leftAction={profileAction}>
      {/* Welcome Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#111827]">Welcome, {user.name}</h2>
        <p className="text-xs text-gray-500">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Students</span>
            <Users className="h-5 w-5 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">{totalStudents}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Enrolled students</p>
          </div>
        </div>

        <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Attendance</span>
            <Percent className="h-5 w-5 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">{avgAttendance}%</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Overall average</p>
          </div>
        </div>

        <Link to="/fees" search={{ filter: 'pending' }} className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between hover:bg-[#eff6ff] transition cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Pending Fees Student</span>
            <DollarSign className="h-5 w-5 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">
              ₹{pendingFees.toLocaleString("en-IN")}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Total balance due</p>
          </div>
        </Link>

        <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Documents</span>
            <FileText className="h-5 w-5 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">{docCount}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Uploaded notes/files</p>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Teacher Modules
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/students"
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#eff6ff] transition"
          >
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-md">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-[#111827]">Students</span>
          </Link>

          <Link
            to="/classes"
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#eff6ff] transition"
          >
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-md">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-[#111827]">Classes & Subjects</span>
          </Link>

          <Link
            to="/attendance"
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#eff6ff] transition"
          >
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-md">
              <CheckSquare className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-[#111827]">Attendance</span>
          </Link>

          <Link
            to="/documents"
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#eff6ff] transition"
          >
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-md">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-[#111827]">Documents</span>
          </Link>

          <Link
            to="/marks"
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#eff6ff] transition"
          >
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-md">
              <Percent className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-[#111827]">Marks</span>
          </Link>

          <Link
            to="/fees"
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#eff6ff] transition"
          >
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-md">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-[#111827]">Fees</span>
          </Link>

          <Link
            to="/reports"
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#eff6ff] transition"
          >
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-md">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-[#111827]">Reports</span>
          </Link>

          {user.role === "super_admin" && (
            <>
              <Link
                to="/lecturers"
                className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition col-span-2 sm:col-span-1"
              >
                <div className="p-2 bg-purple-100 text-purple-700 rounded-md">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-purple-900">Manage Lecturers</span>
              </Link>
              <Link
                to="/lecturer-attendance"
                className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition col-span-2 sm:col-span-1"
              >
                <div className="p-2 bg-purple-100 text-purple-700 rounded-md">
                  <UserCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-purple-900">Lecturer Attendance</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity List */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Recent Activities
        </h3>
        {recentActivities.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No recent activities recorded.
          </div>
        ) : (
          <div className="space-y-3 bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb]">
            {recentActivities.map((act, index) => (
              <div
                key={index}
                className="flex items-start gap-3 text-xs pb-3 last:pb-0 border-b border-[#e5e7eb] last:border-b-0"
              >
                <div className="mt-0.5 p-1 bg-blue-100 text-[#2563eb] rounded">
                  {act.type === "doc" ? (
                    <BookOpen className="h-3 w-3" />
                  ) : (
                    <UserCheck className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#111827] truncate">{act.title}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{act.desc}</p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 font-medium">{act.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teacher Profile & Security Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end justify-center px-4 pb-4">
          <div className="absolute inset-0" onClick={() => setShowProfileModal(false)} />
          <div className="bg-white w-full max-w-[440px] rounded-xl p-5 border border-[#e5e7eb] relative z-50 shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                <h4 className="font-bold text-sm text-[#111827]">Teacher Profile & Security</h4>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword && newPassword.length < 6) {
              import("sonner").then(m => m.toast.error("Password must be at least 6 characters"));
              return;
            }
            if (!newName.trim() || !newUsername.trim()) {
              import("sonner").then(m => m.toast.error("Name and Username are required"));
              return;
            }

            setIsChangingPwd(true);
            try {
              localStorage.setItem("lms_teacher_name", newName.trim());
              localStorage.setItem("lms_teacher_username", newUsername.trim());
              if (newPassword) {
                localStorage.setItem("lms_teacher_password", newPassword);
              }
              
              // Update current user session so UI reflects instantly without full reload
              const { setCurrentUser } = require("@/lib/auth");
              setCurrentUser({ ...user, name: newName.trim(), campusId: newUsername.trim() });
              
              import("sonner").then(m => m.toast.success("Profile updated successfully!"));
              setNewPassword("");
            } catch (err) {
              import("sonner").then(m => m.toast.error("Failed to update profile"));
            } finally {
              setIsChangingPwd(false);
            }
          }}
          className="flex flex-col gap-4"
        >
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Display Name</label>
            <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg p-1 focus-within:border-[#2563eb]">
              <div className="pl-3 text-gray-400">
                <UserCircle className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-sm py-2 px-1 focus:outline-none bg-transparent"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Login Username</label>
            <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg p-1 focus-within:border-[#2563eb]">
              <div className="pl-3 text-gray-400">
                <UserCircle className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full text-sm py-2 px-1 focus:outline-none bg-transparent"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">New Password (Optional)</label>
            <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg p-1 focus-within:border-[#2563eb]">
              <div className="pl-3 text-gray-400">
                <Key className="h-4 w-4" />
              </div>
              <input
                type="password"
                placeholder="Leave blank to keep current..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm py-2 px-1 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPwd}
            className="w-full bg-[#111827] text-white rounded-lg py-3 text-xs font-bold hover:bg-black transition disabled:opacity-50 mt-2"
          >
            {isChangingPwd ? "Saving..." : "Save Profile Changes"}
          </button>
        </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ================= TEACHER DASHBOARD (RESTRICTED) =================

function TeacherDashboard({ user, db }: { user: AuthUser; db: LMS_DB }) {
  const docCount = db.documents.length;
  
  // 2. Avg Attendance %
  const avgAttendance = useMemo(() => {
    const totalRecords = db.attendance.length;
    if (totalRecords === 0) return 0;
    const presentRecords = db.attendance.filter(
      (a: LocalAttendance) => a.status === "present",
    ).length;
    return Math.round((presentRecords / totalRecords) * 100);
  }, [db.attendance]);

  return (
    <AppShell title="Teacher Dashboard">
      <div className="bg-[#f9fafb] min-h-[calc(100vh-130px)] pb-6">
        <div className="bg-white px-5 pt-6 pb-8 rounded-b-3xl shadow-sm border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#eff6ff] rounded-2xl border border-[#dbeafe]">
              <UserCircle className="h-8 w-8 text-[#2563eb]" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">
                Teacher Dashboard
              </p>
              <h2 className="text-2xl font-bold text-[#111827]">
                Welcome, {user.name}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-5 -mt-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Quick Stat 1 */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#e5e7eb] flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Attendance
                </span>
                <CheckSquare className="h-4 w-4 text-[#2563eb]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#111827]">{avgAttendance}%</p>
                <p className="text-[10px] text-gray-500 font-medium">Avg presence</p>
              </div>
            </div>

            {/* Quick Stat 2 */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#e5e7eb] flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Documents
                </span>
                <FileText className="h-4 w-4 text-[#2563eb]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#111827]">{docCount}</p>
                <p className="text-[10px] text-gray-500 font-medium">Files uploaded</p>
              </div>
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3 px-1">
            Teacher Actions
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <Link
              to="/attendance"
              className="bg-white p-4 rounded-2xl shadow-sm border border-[#e5e7eb] flex items-center justify-between group hover:border-[#2563eb] transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-[#2563eb] rounded-xl group-hover:bg-[#2563eb] group-hover:text-white transition">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#111827]">Mark Attendance</h4>
                  <p className="text-xs text-gray-500 font-medium">Daily register</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#2563eb] transition" />
            </Link>

            <Link
              to="/marks"
              className="bg-white p-4 rounded-2xl shadow-sm border border-[#e5e7eb] flex items-center justify-between group hover:border-[#2563eb] transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-[#2563eb] rounded-xl group-hover:bg-[#2563eb] group-hover:text-white transition">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#111827]">Enter Marks</h4>
                  <p className="text-xs text-gray-500 font-medium">Exam & test scores</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#2563eb] transition" />
            </Link>

            <Link
              to="/documents"
              className="bg-white p-4 rounded-2xl shadow-sm border border-[#e5e7eb] flex items-center justify-between group hover:border-[#2563eb] transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-[#2563eb] rounded-xl group-hover:bg-[#2563eb] group-hover:text-white transition">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#111827]">Upload Documents</h4>
                  <p className="text-xs text-gray-500 font-medium">Syllabus & notes</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#2563eb] transition" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ================= STUDENT DASHBOARD =================

function StudentDashboard({ user, db }: { user: AuthUser; db: LMS_DB }) {
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Student active details
  const studentId = user.id;
  const currentStudent = db.students.find((s) => s.id === studentId);

  // Student class metadata
  const classDetails = useMemo(() => {
    if (!currentStudent?.classIds || currentStudent.classIds.length === 0) return null;
    return currentStudent.classIds
      .map((id) => db.classes.find((c) => c.id === id))
      .filter(Boolean) as LocalClass[];
  }, [db.classes, currentStudent?.classIds]);

  // 1. Attendance %
  const attendanceStats = useMemo(() => {
    const studentRecords = db.attendance.filter((a: LocalAttendance) => a.studentId === studentId);
    const total = studentRecords.length;
    if (total === 0) return { pct: 0, present: 0, absent: 0 };
    const present = studentRecords.filter((a: LocalAttendance) => a.status === "present").length;
    const pct = Math.round((present / total) * 100);
    return { pct, present, absent: total - present };
  }, [db.attendance, studentId]);

  // 2. Marks info
  const marksStats = useMemo(() => {
    const studentMarks = db.marks.filter((m) => m.studentId === studentId);
    if (studentMarks.length === 0) return { count: 0, avg: 0 };
    const totalScore = studentMarks.reduce((sum: number, m) => sum + m.marks, 0);
    const totalMax = studentMarks.reduce((sum: number, m) => sum + m.maxMarks, 0);
    const avg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    return { count: studentMarks.length, avg };
  }, [db.marks, studentId]);

  // 3. Document sharing count
  const myDocsCount = useMemo(() => {
    return db.documents.filter(
      (doc: LocalDocument) => doc.classId === "all" || doc.classId === user.classId,
    ).length;
  }, [db.documents, user.classId]);

  // 4. Fees status
  const feeInfo = useMemo(() => {
    const status = db.fees.find((f: LocalFee) => f.studentId === studentId);
    return (
      status || {
        total: 0,
        paid: 0,
        pending: 0,
      }
    );
  }, [db.fees, studentId]);

  return (
    <AppShell title="Student Portal" showSignOut>
      {/* Student Welcome Card */}
      <div className="mb-6 p-5 bg-[#2563eb] text-white rounded-xl shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[10px] bg-blue-700 text-blue-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Student Account
          </span>
          <h2 className="text-2xl font-bold mt-2 truncate">{user.name}</h2>
          <p className="text-xs text-blue-100 mt-1">Campus ID: {user.campusId}</p>
          <div className="h-px bg-blue-400/35 my-3" />
          <p className="text-[#eff6ff] text-xs font-semibold mt-1">
            Class: {classDetails ? classDetails.map((c) => `${c.name} - ${c.subject}`).join(", ") : "Unassigned Class"}
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Attendance card */}
        <Link
          to="/attendance"
          className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Attendance</span>
            <CheckSquare className="h-4 w-4 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">{attendanceStats.pct}%</h3>
            <p className="text-[10px] text-gray-500 mt-1">
              {attendanceStats.present} Present / {attendanceStats.absent} Absent
            </p>
          </div>
        </Link>

        {/* Marks Card */}
        <Link
          to="/marks"
          className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Marks Score</span>
            <Percent className="h-4 w-4 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">
              {marksStats.count > 0 ? `${marksStats.avg}%` : "—"}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">{marksStats.count} subject evaluations</p>
          </div>
        </Link>

        {/* Documents Card */}
        <Link
          to="/documents"
          className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Documents</span>
            <FileText className="h-4 w-4 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">{myDocsCount}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Syllabus & notes files</p>
          </div>
        </Link>

        {/* Fees Status Card */}
        <Link
          to="/fees"
          className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] flex flex-col justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold uppercase">Fees Due</span>
            <DollarSign className="h-4 w-4 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">
              ₹{feeInfo.pending.toLocaleString("en-IN")}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">
              {feeInfo.pending === 0 ? "Fully Paid" : "Payment Pending"}
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Quick Links */}
      <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] mb-6">
        <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-3">
          Quick Navigation
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Link
            to="/attendance"
            className="flex items-center justify-between p-3 bg-white border border-[#e5e7eb] rounded-lg hover:border-[#2563eb] text-gray-700 font-bold"
          >
            <span>My Attendance Log</span>
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>

          <Link
            to="/marks"
            className="flex items-center justify-between p-3 bg-white border border-[#e5e7eb] rounded-lg hover:border-[#2563eb] text-gray-700 font-bold"
          >
            <span>My Academic Marks</span>
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>

          <Link
            to="/documents"
            className="flex items-center justify-between p-3 bg-white border border-[#e5e7eb] rounded-lg hover:border-[#2563eb] text-gray-700 font-bold"
          >
            <span>Study Documents</span>
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>

          <Link
            to="/fees"
            className="flex items-center justify-between p-3 bg-white border border-[#e5e7eb] rounded-lg hover:border-[#2563eb] text-gray-700 font-bold"
          >
            <span>Fee Status Statement</span>
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Profile & Security */}
      <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4 text-gray-500" />
          <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            Profile & Security
          </h3>
        </div>
        
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            if (newPassword.length < 6) {
              import("sonner").then(m => m.toast.error("Password must be at least 6 characters"));
              return;
            }
            setIsChangingPwd(true);
            try {
              const { actions } = await import("@/lib/store");
              await actions.updateStudent(studentId, { password: newPassword });
              import("sonner").then(m => m.toast.success("Password updated successfully!"));
              setNewPassword("");
            } catch (err) {
              import("sonner").then(m => m.toast.error("Failed to update password"));
            } finally {
              setIsChangingPwd(false);
            }
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg p-1 focus-within:border-[#2563eb]">
            <div className="pl-3 text-gray-400">
              <Key className="h-4 w-4" />
            </div>
            <input
              type="password"
              placeholder="Enter new password..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-sm py-2 px-1 focus:outline-none bg-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isChangingPwd || !newPassword}
            className="w-full bg-[#111827] text-white rounded-lg py-2.5 text-xs font-bold hover:bg-black transition disabled:opacity-50"
          >
            {isChangingPwd ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
