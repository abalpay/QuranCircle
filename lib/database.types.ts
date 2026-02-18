export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          deadline: string | null;
          created_by: string | null;
          short_code: string;
          is_archived: boolean;
          archived_at: string | null;
          is_locked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          deadline?: string | null;
          created_by?: string | null;
          short_code: string;
          is_archived?: boolean;
          archived_at?: string | null;
          is_locked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_public?: boolean;
          deadline?: string | null;
          created_by?: string | null;
          short_code?: string;
          is_archived?: boolean;
          archived_at?: string | null;
          is_locked?: boolean;
          created_at?: string;
        };
      };
      khatms: {
        Row: {
          id: string;
          event_id: string;
          khatm_number: number;
          is_archived: boolean;
          is_deleted: boolean;
          archived_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          khatm_number: number;
          is_archived?: boolean;
          is_deleted?: boolean;
          archived_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          khatm_number?: number;
          is_archived?: boolean;
          is_deleted?: boolean;
          archived_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
      };
      juzs: {
        Row: {
          id: string;
          khatm_id: string;
          juz_number: number;
          claimed_by_name: string | null;
          claimed_by_user_id: string | null;
          status: "unclaimed" | "claimed" | "read";
          claimed_at: string | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          khatm_id: string;
          juz_number: number;
          claimed_by_name?: string | null;
          claimed_by_user_id?: string | null;
          status?: "unclaimed" | "claimed" | "read";
          claimed_at?: string | null;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          khatm_id?: string;
          juz_number?: number;
          claimed_by_name?: string | null;
          claimed_by_user_id?: string | null;
          status?: "unclaimed" | "claimed" | "read";
          claimed_at?: string | null;
          read_at?: string | null;
        };
      };
      event_members: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: "creator" | "participant";
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role?: "creator" | "participant";
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          role?: "creator" | "participant";
          created_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Khatm = Database["public"]["Tables"]["khatms"]["Row"];
export type Juz = Database["public"]["Tables"]["juzs"]["Row"];
export type EventMember = Database["public"]["Tables"]["event_members"]["Row"];
export type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"];

export type EventWithKhatms = Event & {
  khatms: (Khatm & {
    juzs: (Juz & { is_mine?: boolean })[];
    claimed_count: number;
    read_count: number;
  })[];
};
