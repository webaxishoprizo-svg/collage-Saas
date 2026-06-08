
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

  // Try lecturer
  const { data: lecturerData, error: lecErr } = await supabase.from("lecturers").select("*").ilike("username", normId).maybeSingle();
  if (lecturerData) {
    if (lecturerData.password !== normPass) {
      throw new Error("Incorrect password for lecturer account.");
    }
    const teacherUser: AuthUser = {
      id: lecturerData.id,
      role: lecturerData.role as "super_admin" | "teacher",
      name: lecturerData.name,
      campusId: lecturerData.username,
    };
    setCurrentUser(teacherUser);
    return teacherUser;
  }

  // Try student
  const { data: studentData, error: stuErr } = await supabase.from("students").select("*").ilike("campus_id", normId).maybeSingle();
  if (studentData) {
    if (studentData.duration_months !== null) {
      const enrollDate = new Date(studentData.enrollment_date);
      if (!isNaN(enrollDate.getTime())) {
        const expirationDate = new Date(enrollDate);
        expirationDate.setMonth(expirationDate.getMonth() + studentData.duration_months);
        if (new Date() > expirationDate) {
          import("@/lib/store").then(m => m.actions.deleteStudent(studentData.id));
          throw new Error("Your enrollment period has expired. Please contact administration.");
        }
      }
    }

    if (studentData.password !== normPass) {
      throw new Error("Incorrect password for student account.");
    }
    const studentUser: AuthUser = {
      id: studentData.id,
      role: "student",
      name: studentData.name,
      campusId: studentData.campus_id,
    };
    setCurrentUser(studentUser);
    return studentUser;
  }

  throw new Error("Invalid username/ID or password.");
}

export function logout(): void {
  setCurrentUser(null);
}
