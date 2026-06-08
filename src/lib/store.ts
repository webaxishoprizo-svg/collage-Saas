import { useLiveQuery } from "dexie-react-hooks";
import {
  localDB,
  newId,
  nowIso,
  type LocalStudent,
  type LocalClass,
  type LocalAttendance,
  type LocalDocument,
  type LocalMark,
  type LocalFee,
  type LocalLecturer,
  type LocalLecturerAttendance,
  type LocalNotification,
} from "./local-db";

// ---- Seeding Mock Data ----

export async function seedInitialDataIfEmpty() {
  // Mock data seeding removed for production.
  // Data will be synced with Supabase.
}

import { supabase } from "@/integrations/supabase/client";

// ---- Live Queries Hook ----

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

// Simple global lock to prevent multiple simultaneous initial syncs
let isSyncing = false;
let hasSyncedOnce = false;

export function useDB(): LMS_DB {
  const data = useLiveQuery(async () => {
    // Pull from Supabase on first load
    if (!hasSyncedOnce && !isSyncing) {
      isSyncing = true;
      try {
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

        await localDB.transaction("rw", [
          localDB.students, localDB.classes, localDB.attendance, 
          localDB.documents, localDB.marks, localDB.fees,
          localDB.lecturers, localDB.lecturer_attendance, localDB.notifications
        ], async () => {
          if (remoteClasses) await localDB.classes.bulkPut(remoteClasses.map((c: any) => ({ ...c, classId: c.class_id || c.id, campusId: c.campus_id || "" })));
          if (remoteStudents) await localDB.students.bulkPut(remoteStudents.map((s: any) => ({ ...s, classIds: s.class_ids || [], enrollmentDate: s.enrollment_date || nowIso(), durationMonths: s.duration_months, campusId: s.campus_id })));
          if (remoteAttendance) await localDB.attendance.bulkPut(remoteAttendance.map((a: any) => ({ ...a, studentId: a.student_id, classId: a.class_id })));
          if (remoteDocs) await localDB.documents.bulkPut(remoteDocs.map((d: any) => ({ ...d, classId: d.class_id, fileUrl: d.file_url })));
          if (remoteMarks) await localDB.marks.bulkPut(remoteMarks.map((m: any) => ({ ...m, studentId: m.student_id, maxMarks: m.max_marks })));
          if (remoteFees) await localDB.fees.bulkPut(remoteFees.map((f: any) => ({ ...f, studentId: f.student_id })));
          if (remoteLecturers) await localDB.lecturers.bulkPut(remoteLecturers.map((l: any) => ({ ...l })));
          if (remoteLecturerAttendance) await localDB.lecturer_attendance.bulkPut(remoteLecturerAttendance.map((la: any) => ({ ...la, lecturerId: la.lecturer_id })));
          if (remoteNotifications) await localDB.notifications.bulkPut(remoteNotifications.map((n: any) => ({ ...n, recipientId: n.recipient_id, classId: n.class_id })));
        });
        hasSyncedOnce = true;
      } catch (err) {
        console.error("Failed to sync from Supabase:", err);
      } finally {
        isSyncing = false;
      }
    }

    const [students, classes, attendance, documents, marks, fees, lecturers, lecturer_attendance, notifications] = await Promise.all([
      localDB.students.toArray(),
      localDB.classes.toArray(),
      localDB.attendance.toArray(),
      localDB.documents.toArray(),
      localDB.marks.toArray(),
      localDB.fees.toArray(),
      localDB.lecturers.toArray(),
      localDB.lecturer_attendance.toArray(),
      localDB.notifications.toArray(),
    ]);

    return {
      students,
      classes,
      attendance,
      documents,
      marks,
      fees,
      lecturers,
      lecturer_attendance,
      notifications,
    };
  }, []);

  return data ?? EMPTY_DB;
}

export function useDBStatus() {
  return { isLoading: false as const, isError: false as const };
}

// ---- Database Actions ----

export const actions = {
  // Students
  async addStudent(s: Omit<LocalStudent, "id" | "created_at" | "updated_at">) {
    const id = newId();
    const student: LocalStudent = {
      ...s,
      id,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    await localDB.students.put(student);
    
    // Push to Supabase
    supabase.from("students").insert({ 
      id, 
      name: s.name, 
      campus_id: s.campusId, 
      password: s.password, 
      class_ids: s.classIds,
      enrollment_date: s.enrollmentDate,
      duration_months: s.durationMonths
    }).then();

    // Initialize blank Fee record
    await localDB.fees.put({
      studentId: id,
      total: 0,
      paid: 0,
      pending: 0,
      updated_at: nowIso(),
    });
    supabase.from("fees").insert({ student_id: id, total: 0, paid: 0, pending: 0 }).then();

    return id;
  },

  async updateStudent(
    id: string,
    s: Partial<Omit<LocalStudent, "id" | "created_at" | "updated_at">>,
  ) {
    const existing = await localDB.students.get(id);
    if (!existing) throw new Error("Student not found");
    const updated: LocalStudent = {
      ...existing,
      ...s,
      updated_at: nowIso(),
    };
    await localDB.students.put(updated);
    
    // Push to Supabase
    supabase.from("students").update({
      name: updated.name,
      campus_id: updated.campusId,
      password: updated.password,
      class_ids: updated.classIds,
      enrollment_date: updated.enrollmentDate,
      duration_months: updated.durationMonths,
      updated_at: updated.updated_at
    }).eq("id", id).then();
  },

  async deleteStudent(id: string) {
    await localDB.students.delete(id);
    supabase.from("students").delete().eq("id", id).then();

    // Cascade delete marks, attendance, fees
    await localDB.fees.delete(id);
    const atts = await localDB.attendance.where("studentId").equals(id).toArray();
    await Promise.all(atts.map((a) => localDB.attendance.delete(a.id)));
    const mrks = await localDB.marks.where("studentId").equals(id).toArray();
    await Promise.all(mrks.map((m) => localDB.marks.delete(m.id)));
  },

  async cleanupExpiredStudents() {
    const students = await localDB.students.toArray();
    const now = new Date();

    for (const student of students) {
      if (student.durationMonths === null) continue; // Unlimited

      const enrollDate = new Date(student.enrollmentDate);
      if (isNaN(enrollDate.getTime())) continue;

      const expirationDate = new Date(enrollDate);
      expirationDate.setMonth(expirationDate.getMonth() + student.durationMonths);

      if (now > expirationDate) {
        console.log(`Auto-deleting expired student: ${student.name} (${student.campusId})`);
        await this.deleteStudent(student.id);
      }
    }
  },

  // Classes
  async addClass(c: Omit<LocalClass, "id" | "created_at" | "updated_at">) {
    const id = newId();
    const newClass: LocalClass = {
      ...c,
      id,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    await localDB.classes.put(newClass);
    supabase.from("classes").insert({ id, name: c.name, subject: c.subject }).then();
    return id;
  },

  async updateClass(id: string, c: Partial<Omit<LocalClass, "id" | "created_at" | "updated_at">>) {
    const existing = await localDB.classes.get(id);
    if (!existing) throw new Error("Class not found");
    const updated: LocalClass = {
      ...existing,
      ...c,
      updated_at: nowIso(),
    };
    await localDB.classes.put(updated);
    supabase.from("classes").update({ name: updated.name, subject: updated.subject, updated_at: updated.updated_at }).eq("id", id).then();
  },

  async deleteClass(id: string) {
    await localDB.classes.delete(id);
    supabase.from("classes").delete().eq("id", id).then();

    // Unassign students from this class
    const stus = await localDB.students.where("classIds").equals(id).toArray();
    await Promise.all(
      stus.map((s) => localDB.students.update(s.id, { classIds: s.classIds.filter(cid => cid !== id), updated_at: nowIso() })),
    );
    // Clean up class attendance
    const atts = await localDB.attendance.where("classId").equals(id).toArray();
    await Promise.all(atts.map((a) => localDB.attendance.delete(a.id)));
  },

  // Attendance
  async saveAttendance(
    classId: string,
    date: string,
    records: { studentId: string; status: "present" | "absent" }[],
  ) {
    for (const r of records) {
      const id = `${r.studentId}_${date}_${classId}`;
      const record: LocalAttendance = {
        id,
        studentId: r.studentId,
        classId,
        date,
        status: r.status,
        created_at: nowIso(),
      };
      await localDB.attendance.put(record);
      supabase.from("attendance").upsert({
        id,
        student_id: r.studentId,
        class_id: classId,
        date,
        status: r.status
      }).then();
    }
  },

  // Documents
  async addDocument(d: Omit<LocalDocument, "id" | "created_at">) {
    const id = newId();
    const doc: LocalDocument = {
      ...d,
      id,
      created_at: nowIso(),
    };
    await localDB.documents.put(doc);
    
    // Generate Notification
    const notifId = newId();
    await localDB.notifications.put({
      id: notifId,
      recipientId: "all", // Or target specific class logic if needed
      classId: d.classId,
      title: "New Document Uploaded",
      message: `${d.subject}: ${d.title}`,
      type: "document",
      read: false,
      created_at: nowIso(),
    });
    supabase.from("notifications").insert({ id: notifId, recipient_id: "all", class_id: d.classId, title: "New Document Uploaded", message: `${d.subject}: ${d.title}`, type: "document", read: false }).then();

    supabase.from("documents").insert({ id, title: d.title, file_url: d.fileUrl, class_id: d.classId, subject: d.subject }).then();
    return id;
  },

  async deleteDocument(id: string) {
    await localDB.documents.delete(id);
    supabase.from("documents").delete().eq("id", id).then();
  },

  // Marks
  async addMarks(m: Omit<LocalMark, "id" | "created_at">) {
    const id = newId();
    const mark: LocalMark = {
      ...m,
      id,
      created_at: nowIso(),
    };
    await localDB.marks.put(mark);

    // Generate Notification
    const notifId = newId();
    await localDB.notifications.put({
      id: notifId,
      recipientId: m.studentId,
      title: "New Marks Posted",
      message: `You scored ${m.marks}/${m.maxMarks} in ${m.subject}`,
      type: "mark",
      read: false,
      created_at: nowIso(),
    });
    supabase.from("notifications").insert({ id: notifId, recipient_id: m.studentId, title: "New Marks Posted", message: `You scored ${m.marks}/${m.maxMarks} in ${m.subject}`, type: "mark", read: false }).then();

    supabase.from("marks").insert({ id, student_id: m.studentId, subject: m.subject, marks: m.marks, max_marks: m.maxMarks }).then();
    return id;
  },

  async deleteMarks(id: string) {
    await localDB.marks.delete(id);
    supabase.from("marks").delete().eq("id", id).then();
  },

  // Fees
  async updateFees(studentId: string, total: number, paid: number) {
    const pending = Math.max(0, total - paid);
    await localDB.fees.put({
      studentId,
      total,
      paid,
      pending,
      updated_at: nowIso(),
    });
    supabase.from("fees").update({ total, paid, pending, updated_at: nowIso() }).eq("student_id", studentId).then();
  },

  // Lecturers
  async addLecturer(l: Omit<LocalLecturer, "id" | "created_at" | "updated_at">) {
    const id = newId();
    await localDB.lecturers.put({
      id,
      ...l,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    supabase.from("lecturers").insert({ id, username: l.username, password: l.password, name: l.name, role: l.role }).then();
  },

  async updateLecturer(id: string, updates: Partial<LocalLecturer>) {
    await localDB.lecturers.update(id, { ...updates, updated_at: nowIso() });
    supabase.from("lecturers").update({ ...updates, updated_at: nowIso() }).eq("id", id).then();
  },

  async deleteLecturer(id: string) {
    await localDB.lecturers.delete(id);
    supabase.from("lecturers").delete().eq("id", id).then();
  },

  // Lecturer Attendance
  async updateLecturerAttendance(lecturerId: string, date: string, status: "present" | "absent" | "leave") {
    const id = `${lecturerId}_${date}`;
    const record: LocalLecturerAttendance = {
      id,
      lecturerId,
      date,
      status,
      created_at: nowIso(),
    };
    await localDB.lecturer_attendance.put(record);
    supabase.from("lecturer_attendance").upsert({ id, lecturer_id: lecturerId, date, status }).then();

    // Notification for Super Admin
    const lecturer = await localDB.lecturers.get(lecturerId);
    if (lecturer) {
      const notifId = newId();
      await localDB.notifications.put({
        id: notifId,
        recipientId: "super_admin",
        title: "Lecturer Attendance Updated",
        message: `${lecturer.name} was marked as ${status} on ${date}.`,
        type: "general",
        read: false,
        created_at: nowIso(),
      });
      supabase.from("notifications").insert({ id: notifId, recipient_id: "super_admin", title: "Lecturer Attendance Updated", message: `${lecturer.name} was marked as ${status} on ${date}.`, type: "general", read: false }).then();
    }
  },

  // Notifications
  async markNotificationRead(id: string) {
    await localDB.notifications.update(id, { read: true });
    supabase.from("notifications").update({ read: true }).eq("id", id).then();
  },

  async markAllNotificationsRead(user: { id: string; role: string }) {
    const notifs = await localDB.notifications.toArray();
    const updates = notifs
      .filter((n) => !n.read && (n.recipientId === user.id || n.recipientId === "all" || (user.role === "super_admin" && n.recipientId === "super_admin")))
      .map((n) => {
        localDB.notifications.update(n.id, { read: true });
        return supabase.from("notifications").update({ read: true }).eq("id", n.id);
      });
    await Promise.all(updates);
  },
};

export function useSyncStatus() {
  // Simulated sync status since it is offline first
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
