import Dexie, { type Table } from "dexie";

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

class LecturerManagementDB extends Dexie {
  students!: Table<LocalStudent, string>;
  classes!: Table<LocalClass, string>;
  attendance!: Table<LocalAttendance, string>;
  documents!: Table<LocalDocument, string>;
  marks!: Table<LocalMark, string>;
  fees!: Table<LocalFee, string>;
  lecturers!: Table<LocalLecturer, string>;
  lecturer_attendance!: Table<LocalLecturerAttendance, string>;
  notifications!: Table<LocalNotification, string>;

  constructor() {
    super("lms-local-db-v7");
    this.version(7).stores({
      students: "id, campusId, *classIds",
      classes: "id",
      attendance: "id, studentId, classId, date",
      documents: "id, classId",
      marks: "id, studentId",
      fees: "studentId",
      lecturers: "id, username",
      lecturer_attendance: "id, lecturerId, date",
      notifications: "id, recipientId, classId, read",
    });
  }
}

export const localDB = new LecturerManagementDB();

export async function clearLocalData() {
  await localDB.transaction(
    "rw",
    [
      localDB.students,
      localDB.classes,
      localDB.attendance,
      localDB.documents,
      localDB.marks,
      localDB.fees,
      localDB.lecturers,
      localDB.lecturer_attendance,
      localDB.notifications,
    ],
    async () => {
      await Promise.all([
        localDB.students.clear(),
        localDB.classes.clear(),
        localDB.attendance.clear(),
        localDB.documents.clear(),
        localDB.marks.clear(),
        localDB.fees.clear(),
        localDB.lecturers.clear(),
        localDB.lecturer_attendance.clear(),
        localDB.notifications.clear(),
      ]);
    },
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}
