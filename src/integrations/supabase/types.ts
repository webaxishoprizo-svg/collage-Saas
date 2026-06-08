export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          name: string;
          subject: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          name: string;
          campus_id: string;
          password: string | null;
          class_ids: string[];
          enrollment_date: string;
          duration_months: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          campus_id: string;
          password?: string | null;
          class_ids?: string[];
          enrollment_date?: string;
          duration_months?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          campus_id?: string;
          password?: string | null;
          class_ids?: string[];
          enrollment_date?: string;
          duration_months?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          student_id: string | null;
          class_id: string | null;
          date: string;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          student_id?: string | null;
          class_id?: string | null;
          date: string;
          status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          class_id?: string | null;
          date?: string;
          status?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      marks: {
        Row: {
          id: string;
          student_id: string | null;
          subject: string;
          marks: number;
          max_marks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          subject: string;
          marks: number;
          max_marks: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          subject?: string;
          marks?: number;
          max_marks?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      fees: {
        Row: {
          student_id: string;
          total: number | null;
          paid: number | null;
          pending: number | null;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          total?: number | null;
          paid?: number | null;
          pending?: number | null;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          total?: number | null;
          paid?: number | null;
          pending?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          title: string;
          file_url: string;
          class_id: string;
          subject: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          file_url: string;
          class_id: string;
          subject: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          file_url?: string;
          class_id?: string;
          subject?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      lecturers: {
        Row: {
          id: string;
          username: string;
          password?: string;
          name: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password?: string;
          name: string;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password?: string;
          name?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lecturer_attendance: {
        Row: {
          id: string;
          lecturer_id: string;
          date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lecturer_id: string;
          date: string;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lecturer_id?: string;
          date?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          class_id?: string | null;
          title: string;
          message: string;
          type: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          class_id?: string | null;
          title: string;
          message: string;
          type: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          class_id?: string | null;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
