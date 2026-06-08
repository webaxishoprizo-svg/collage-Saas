import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "./queryClient";

// ---- Types ----
export type LocalStudent = {
  id: string;
  name: string;
  campusId: string;
  password?: string;
  classIds: string[]; // Replaces classId, allows multiple subjects
  enrollmentDate: string; // ISO date of enrollment
  durationMonths: number | null; // e.g. 3, 6, or null for unlimited
  created_at: string;
  updated_at: string;
};

export type LocalLecturer = {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: "super_admin" | "teacher";
  classIds?: string[]; // Array of class IDs assigned to this lecturer
  created_at: string;
  updated_at: string;
};

export type LocalLecturerAttendance = {
  id: string; // lecturerId + "_" + date
  lecturerId: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "leave";
  created_at: string;
};

export type LocalNotification = {
  id: string;
  recipientId: string; // Student ID or "all" for class-wide
  classId?: string; // If applicable
  title: string;
  message: string;
  type: "mark" | "document" | "general";
  read: boolean;
  created_at: string;
};

export type LocalClass = {
  id: string;
  name: string; // e.g. "Computer Science 101"
  subject: string; // e.g. "Programming"
  created_at: string;
  updated_at: string;
};

export type LocalAttendance = {
  id: string; // studentId + "_" + date + "_" + classId
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent";
  created_at: string;
};

export type LocalDocument = {
  id: string;
  title: string;
  fileUrl: string; // Base64 data URL or external mockup link
  classId: string; // Class ID or "all"
  subject: string; // Subject label for filtering
  created_at: string;
};

export type LocalMark = {
  id: string;
  studentId: string;
  subject: string;
  marks: number;
  maxMarks: number;
  created_at: string;
};

export type LocalFee = {
  studentId: string; // Primary key
  total: number;
  paid: number;
  pending: number; // total - paid
  updated_at: string;
};

export type LMS_DB = {
  students: LocalStudent[];
  classes: LocalClass[];
  attendance: LocalAttendance[];
  documents: LocalDocument[];
  marks: LocalMark[];
  fees: LocalFee[];
  lecturers: LocalLecturer[];
  lecturer_attendance: LocalLecturerAttendance[];
  notifications: LocalNotification[];
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

// ---- Helpers ----

const EMPTY_DB: LMS_DB = {
  students: [],
  classes: [],
  attendance: [],
  documents: [],
  marks: [],
  fees: [],
  lecturers: [],
  lecturer_attendance: [],
  notifications: [],
};

// Map snake_case to camelCase
function mapRecord(table: string, rec: any) {
  if (!rec) return null;
  const base = { ...rec };
  switch(table) {
    case 'classes': return { ...base, classId: rec.class_id || rec.id, campusId: rec.campus_id || "" };
    case 'students': return { ...base, classIds: rec.class_ids || [], enrollmentDate: rec.enrollment_date || nowIso(), durationMonths: rec.duration_months, campusId: rec.campus_id };
    case 'attendance': return { ...base, studentId: rec.student_id, classId: rec.class_id };
    case 'documents': return { ...base, classId: rec.class_id, fileUrl: rec.file_url };
    case 'marks': return { ...base, studentId: rec.student_id, maxMarks: rec.max_marks };
    case 'fees': return { ...base, studentId: rec.student_id };
    case 'lecturers': return { ...base, classIds: rec.class_ids || [] };
    case 'lecturer_attendance': return { ...base, lecturerId: rec.lecturer_id };
    case 'notifications': return { ...base, recipientId: rec.recipient_id, classId: rec.class_id };
    default: return base;
  }
}

// ---- Data Fetching ----

async function fetchAllData(): Promise<LMS_DB> {
  const [
    { data: remoteStudents },
    { data: remoteClasses },
    { data: remoteAttendance },
    { data: remoteDocs },
    { data: remoteMarks },
    { data: remoteFees },
    { data: remoteLecturers },
    { data: remoteLecturerAttendance },
    { data: remoteNotifications },
  ] = await Promise.all([
    supabase.from("students").select("*"),
    supabase.from("classes").select("*"),
    supabase.from("attendance").select("*"),
    supabase.from("documents").select("*"),
    supabase.from("marks").select("*"),
    supabase.from("fees").select("*"),
    supabase.from("lecturers").select("*"),
    supabase.from("lecturer_attendance").select("*"),
    supabase.from("notifications").select("*"),
  ]);

  return {
    students: (remoteStudents || []).map(s => mapRecord("students", s)) as LocalStudent[],
    classes: (remoteClasses || []).map(c => mapRecord("classes", c)) as LocalClass[],
    attendance: (remoteAttendance || []).map(a => mapRecord("attendance", a)) as LocalAttendance[],
    documents: (remoteDocs || []).map(d => mapRecord("documents", d)) as LocalDocument[],
    marks: (remoteMarks || []).map(m => mapRecord("marks", m)) as LocalMark[],
    fees: (remoteFees || []).map(f => mapRecord("fees", f)) as LocalFee[],
    lecturers: (remoteLecturers || []).map(l => mapRecord("lecturers", l)) as LocalLecturer[],
    lecturer_attendance: (remoteLecturerAttendance || []).map(la => mapRecord("lecturer_attendance", la)) as LocalLecturerAttendance[],
    notifications: (remoteNotifications || []).map(n => mapRecord("notifications", n)) as LocalNotification[],
  };
}

let isRealtimeSubscribed = false;

function setupRealtimeSubscriptions() {
  if (isRealtimeSubscribed) return;
  isRealtimeSubscribed = true;

  const tables = [
    "students", "classes", "attendance", "documents", 
    "marks", "fees", "lecturers", "lecturer_attendance", "notifications"
  ];

  const channel = supabase.channel('schema-db-changes');

  tables.forEach(table => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      async () => {
        // Just invalidate the query cache and let it refetch
        // or mutate the specific cache record if we want to be highly optimized.
        // For simplicity and correctness across tabs:
        await queryClient.invalidateQueries({ queryKey: ['lms_db'] });
      }
    );
  });

  channel.subscribe();
}

// ---- Hooks ----

export function useDB(): LMS_DB {
  const { data } = useQuery({
    queryKey: ['lms_db'],
    queryFn: async () => {
      const result = await fetchAllData();
      setupRealtimeSubscriptions();
      return result;
    },
    staleTime: Infinity, // Rely on realtime invalidation
  });

  return data ?? EMPTY_DB;
}

export function useDBStatus() {
  const { isLoading, isError } = useQuery({
    queryKey: ['lms_db'],
    queryFn: fetchAllData,
    staleTime: Infinity,
  });
  return { isLoading, isError };
}

export function useSyncStatus() {
  return { online: true, syncing: false, pendingCount: 0 };
}
export function useHydrated() {
  return true;
}
export function formatINR(n: number) {
  return "₹" + (n || 0).toLocaleString("en-IN");
}
export function dayName(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "long" });
}

// ---- Database Actions ----

function triggerUpdate() {
  queryClient.invalidateQueries({ queryKey: ['lms_db'] });
}

export const actions = {
  // Students
  async addStudent(s: Omit<LocalStudent, "id" | "created_at" | "updated_at">) {
    const id = newId();
    await supabase.from("students").insert({ 
      id, 
      name: s.name, 
      campus_id: s.campusId, 
      password: s.password, 
      class_ids: s.classIds,
      enrollment_date: s.enrollmentDate,
      duration_months: s.durationMonths
    });
    await supabase.from("fees").insert({ student_id: id, total: 0, paid: 0, pending: 0 });
    triggerUpdate();
    return id;
  },

  async updateStudent(
    id: string,
    s: Partial<Omit<LocalStudent, "id" | "created_at" | "updated_at">>,
  ) {
    await supabase.from("students").update({
      name: s.name,
      campus_id: s.campusId,
      password: s.password,
      class_ids: s.classIds,
      enrollment_date: s.enrollmentDate,
      duration_months: s.durationMonths,
      updated_at: nowIso()
    }).eq("id", id);
    triggerUpdate();
  },

  async deleteStudent(id: string) {
    await supabase.from("students").delete().eq("id", id);
    triggerUpdate();
  },

  async cleanupExpiredStudents() {
    const { data: students } = await supabase.from("students").select("*");
    if (!students) return;

    const now = new Date();
    for (const student of students) {
      if (student.duration_months === null) continue;

      const enrollDate = new Date(student.enrollment_date);
      if (isNaN(enrollDate.getTime())) continue;

      const expirationDate = new Date(enrollDate);
      expirationDate.setMonth(expirationDate.getMonth() + student.duration_months);

      if (now > expirationDate) {
        console.log(`Auto-deleting expired student: ${student.name} (${student.campus_id})`);
        await this.deleteStudent(student.id);
      }
    }
  },

  // Classes
  async addClass(c: Omit<LocalClass, "id" | "created_at" | "updated_at">) {
    const id = newId();
    await supabase.from("classes").insert({ id, name: c.name, subject: c.subject });
    triggerUpdate();
    return id;
  },

  async updateClass(id: string, updates: Partial<LocalClass>) {
    await supabase.from("classes").update({ ...updates, updated_at: nowIso() }).eq("id", id);
    triggerUpdate();
  },

  async deleteClass(id: string) {
    await supabase.from("classes").delete().eq("id", id);
    triggerUpdate();
  },

  // Attendance
  async saveAttendance(
    classId: string,
    date: string,
    records: { studentId: string; status: "present" | "absent" }[],
  ) {
    for (const r of records) {
      const id = `${r.studentId}_${date}_${classId}`;
      await supabase.from("attendance").upsert({
        id,
        student_id: r.studentId,
        class_id: classId,
        date,
        status: r.status
      });
    }
    triggerUpdate();
  },

  // Documents
  async addDocument(d: Omit<LocalDocument, "id" | "created_at">) {
    const id = newId();
    const notifId = newId();
    
    await supabase.from("notifications").insert({ id: notifId, recipient_id: "all", class_id: d.classId, title: "New Document Uploaded", message: `${d.subject}: ${d.title}`, type: "document", read: false });
    await supabase.from("documents").insert({ id, title: d.title, file_url: d.fileUrl, class_id: d.classId, subject: d.subject });
    triggerUpdate();
    return id;
  },

  async deleteDocument(id: string) {
    await supabase.from("documents").delete().eq("id", id);
    triggerUpdate();
  },

  // Marks
  async addMarks(m: Omit<LocalMark, "id" | "created_at">) {
    const id = newId();
    const notifId = newId();
    
    await supabase.from("notifications").insert({ id: notifId, recipient_id: m.studentId, title: "New Marks Posted", message: `You scored ${m.marks}/${m.maxMarks} in ${m.subject}`, type: "mark", read: false });
    await supabase.from("marks").insert({ id, student_id: m.studentId, subject: m.subject, marks: m.marks, max_marks: m.maxMarks });
    triggerUpdate();
    return id;
  },

  async deleteMarks(id: string) {
    await supabase.from("marks").delete().eq("id", id);
    triggerUpdate();
  },

  // Fees
  async updateFees(studentId: string, total: number, paid: number) {
    const pending = Math.max(0, total - paid);
    await supabase.from("fees").update({ total, paid, pending, updated_at: nowIso() }).eq("student_id", studentId);
    triggerUpdate();
  },

  // Lecturers
  async addLecturer(l: Omit<LocalLecturer, "id" | "created_at" | "updated_at">) {
    const id = newId();
    await supabase.from("lecturers").insert({ id, username: l.username, password: l.password, name: l.name, role: l.role, class_ids: l.classIds || [] } as any);
    triggerUpdate();
  },

  async updateLecturer(id: string, updates: Partial<LocalLecturer>) {
    const dbUpdates: any = { ...updates, updated_at: nowIso() };
    if (updates.classIds !== undefined) {
      dbUpdates.class_ids = updates.classIds;
      delete dbUpdates.classIds;
    }
    await supabase.from("lecturers").update(dbUpdates).eq("id", id);
    triggerUpdate();
  },

  async deleteLecturer(id: string) {
    await supabase.from("lecturers").delete().eq("id", id);
    triggerUpdate();
  },

  // Lecturer Attendance
  async updateLecturerAttendance(lecturerId: string, date: string, status: "present" | "absent" | "leave") {
    const id = `${lecturerId}_${date}`;
    await supabase.from("lecturer_attendance").upsert({ id, lecturer_id: lecturerId, date, status });

    const { data: lecturer } = await supabase.from("lecturers").select("name").eq("id", lecturerId).single();
    if (lecturer) {
      const notifId = newId();
      await supabase.from("notifications").insert({ id: notifId, recipient_id: "super_admin", title: "Lecturer Attendance Updated", message: `${lecturer.name} was marked as ${status} on ${date}.`, type: "general", read: false });
    }
    triggerUpdate();
  },

  // Notifications
  async markNotificationRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    triggerUpdate();
  },

  async markAllNotificationsRead(user: { id: string; role: string }) {
    await supabase.from("notifications").update({ read: true }).or(`recipient_id.eq.${user.id},recipient_id.eq.all${user.role === 'super_admin' ? ',recipient_id.eq.super_admin' : ''}`).eq("read", false);
    triggerUpdate();
  },
};
