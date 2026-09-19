/**
 * Hand-written mirror of the Supabase schema (migrations under supabase/migrations).
 * Regenerate with `supabase gen types typescript` once the project is linked;
 * kept manual for now so the app typechecks without a live project.
 */

export type CourseStatus = "draft" | "published";
export type EnrollmentStatus = "active";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          slug: string;
          description: string | null;
          cover_url: string | null;
          status: CourseStatus;
          price: number;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          slug: string;
          description?: string | null;
          cover_url?: string | null;
          status?: CourseStatus;
          price?: number;
          embedding?: number[] | null;
        };
        Update: {
          title?: string;
          slug?: string;
          description?: string | null;
          cover_url?: string | null;
          status?: CourseStatus;
          price?: number;
          embedding?: number[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "courses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          position: number;
        };
        Update: { title?: string; position?: number };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          position: number;
        };
        Update: { title?: string; position?: number };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_contents: {
        Row: {
          lesson_id: string;
          body_md: string | null;
          youtube_url: string | null;
          updated_at: string;
        };
        Insert: {
          lesson_id: string;
          body_md?: string | null;
          youtube_url?: string | null;
        };
        Update: { body_md?: string | null; youtube_url?: string | null };
        Relationships: [
          {
            foreignKeyName: "lesson_contents_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: true;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          status: EnrollmentStatus;
          enrolled_at: string;
        };
        Insert: { id?: string; user_id: string; course_id: string };
        Update: { status?: EnrollmentStatus };
        Relationships: [
          {
            foreignKeyName: "enrollments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          rating: number;
          body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          rating: number;
          body?: string | null;
        };
        Update: { rating?: number; body?: string | null };
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      course_ratings: {
        Row: {
          course_id: string;
          avg_rating: number | null;
          review_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      match_courses: {
        Args: {
          query_embedding: number[];
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          price: number;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [key: string]: never;
    };
    CompositeTypes: {
      [key: string]: never;
    };
  };
}
