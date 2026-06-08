import { localDB } from "./local-db";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  id: string;
  role: "super_admin" | "teacher" | "student";
  name: string;
  campusId: string;
  classId?: string | null;
};

const SESSION_KEY = "lms_auth_session";

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function login(
  campusId: string,
  password: string,
): Promise<AuthUser> {
  const normId = campusId.trim();
  const normPass = password.trim();

  // Check local database for lecturer/admin
  let lecturer = await localDB.lecturers.where("username").equalsIgnoreCase(normId).first();
  if (!lecturer && navigator.onLine) {
    const { data } = await supabase.from("lecturers").select("*").ilike("username", normId).maybeSingle();
    if (data) {
      lecturer = {
        id: data.id,
        name: data.name,
        username: data.username,
        password: data.password || "",
        role: data.role as "super_admin" | "teacher",
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      // Try to save it locally for future offline logins
      await localDB.lecturers.put(lecturer);
    }
  }
  if (lecturer) {
    if (lecturer.password !== normPass) {
      throw new Error("Incorrect password for lecturer account.");
    }
    const teacherUser: AuthUser = {
      id: lecturer.id,
      role: lecturer.role,
      name: lecturer.name,
      campusId: lecturer.username,
    };
    setCurrentUser(teacherUser);
    return teacherUser;
  }

  // Check Dexie database for student
  let student = await localDB.students.where("campusId").equalsIgnoreCase(normId).first();
  if (!student && navigator.onLine) {
    const { data } = await supabase.from("students").select("*").ilike("campus_id", normId).maybeSingle();
    if (data) {
      student = {
        id: data.id,
        name: data.name,
        campusId: data.campus_id,
        password: data.password || "",
        classIds: data.class_ids || [],
        enrollmentDate: data.enrollment_date,
        durationMonths: data.duration_months,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      // Try to save it locally
      await localDB.students.put(student);
    }
  }
  if (student) {
    // Check expiration
    if (student.durationMonths !== null) {
      const enrollDate = new Date(student.enrollmentDate);
      if (!isNaN(enrollDate.getTime())) {
        const expirationDate = new Date(enrollDate);
        expirationDate.setMonth(expirationDate.getMonth() + student.durationMonths);
        if (new Date() > expirationDate) {
          // Delete expired student
          import("@/lib/store").then(m => m.actions.deleteStudent(student.id));
          throw new Error("Your enrollment period has expired. Please contact administration.");
        }
      }
    }

    if (student.password !== normPass) {
      throw new Error("Incorrect password for student account.");
    }
    const studentUser: AuthUser = {
      id: student.id,
      role: "student",
      name: student.name,
      campusId: student.campusId,
    };
    setCurrentUser(studentUser);
    return studentUser;
  }

  throw new Error("Invalid username/ID or password.");
}

export function logout(): void {
  setCurrentUser(null);
}
