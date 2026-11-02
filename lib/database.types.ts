export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_members: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          deadline: string | null;
          description: string | null;
          id: string;
          is_archived: boolean;
          is_public: boolean;
          name: string;
          open_next_khatm: boolean;
          short_code: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description?: string | null;
          id?: string;
          is_archived?: boolean;
          is_public?: boolean;
          name: string;
          open_next_khatm?: boolean;
          short_code: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description?: string | null;
          id?: string;
          is_archived?: boolean;
          is_public?: boolean;
          name?: string;
          open_next_khatm?: boolean;
          short_code?: string;
        };
        Relationships: [];
      };
      juzs: {
        Row: {
          claimed_at: string | null;
          claimed_by_name: string | null;
          claimed_by_user_id: string | null;
          id: string;
          juz_number: number;
          khatm_id: string;
          read_at: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          claimed_at?: string | null;
          claimed_by_name?: string | null;
          claimed_by_user_id?: string | null;
          id?: string;
          juz_number: number;
          khatm_id: string;
          read_at?: string | null;
          status?: string;
        };
        Update: {
          claimed_at?: string | null;
          claimed_by_name?: string | null;
          claimed_by_user_id?: string | null;
          id?: string;
          juz_number?: number;
          khatm_id?: string;
          read_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "juzs_khatm_id_fkey";
            columns: ["khatm_id"];
            isOneToOne: false;
            referencedRelation: "khatms";
            referencedColumns: ["id"];
          },
        ];
      };
      khatms: {
        Row: {
          archived_at: string | null;
          completed_at: string | null;
          completion_source: string | null;
          created_at: string;
          deleted_at: string | null;
          event_id: string;
          id: string;
          is_archived: boolean;
          is_deleted: boolean;
          khatm_number: number;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          completed_at?: string | null;
          completion_source?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          event_id: string;
          id?: string;
          is_archived?: boolean;
          is_deleted?: boolean;
          khatm_number: number;
        };
        Update: {
          archived_at?: string | null;
          completed_at?: string | null;
          completion_source?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string;
          id?: string;
          is_archived?: boolean;
          is_deleted?: boolean;
          khatm_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "khatms_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_juz_batch: {
        Args: {
          p_claimer_name: string;
          p_juz_numbers: number[];
          p_khatm_id: string;
          p_short_code: string;
        };
        Returns: Json;
      };
      cleanup_current_user_data: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      complete_khatm: {
        Args: { p_khatm_id: string; p_short_code: string };
        Returns: Json;
      };
      create_event_with_initial_khatm: {
        Args: {
          p_description: string;
          p_is_public: boolean;
          p_name: string;
          p_short_code: string;
        };
        Returns: {
          event_id: string;
          short_code: string;
        }[];
      };
      current_auth_is_non_anonymous: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      delete_event_by_shortcode: {
        Args: { p_short_code: string };
        Returns: boolean;
      };
      ensure_event_membership: {
        Args: { p_short_code: string };
        Returns: boolean;
      };
      get_community_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          khatms_completed: number;
          total_circles: number;
          total_juz_claimed: number;
        }[];
      };
      get_event_snapshot_by_shortcode: {
        Args: {
          p_before_khatm_number?: number;
          p_khatm_limit?: number;
          p_short_code: string;
        };
        Returns: Json;
      };
      list_my_circles_with_progress: {
        Args: Record<PropertyKey, never>;
        Returns: {
          archived_at: string;
          claimed: number;
          created_at: string;
          description: string;
          has_khatm_ready_to_complete: boolean;
          id: string;
          is_archived: boolean;
          is_public: boolean;
          last_activity_at: string;
          my_claimed: number;
          my_read: number;
          name: string;
          relation: string;
          short_code: string;
          total: number;
        }[];
      };
      list_public_events_for_sitemap: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          short_code: string;
        }[];
      };
      list_public_events_with_progress: {
        Args: {
          p_before_created_at?: string;
          p_before_id?: string;
          p_limit?: number;
        };
        Returns: {
          claimed: number;
          created_at: string;
          deadline: string;
          description: string;
          id: string;
          is_public: boolean;
          name: string;
          short_code: string;
          total: number;
        }[];
      };
      list_user_events_with_progress: {
        Args: Record<PropertyKey, never>;
        Returns: {
          claimed: number;
          created_at: string;
          deadline: string;
          description: string;
          id: string;
          is_archived: boolean;
          is_public: boolean;
          name: string;
          short_code: string;
          total: number;
        }[];
      };
      mark_juz_read: {
        Args: { p_juz_id: string; p_short_code: string };
        Returns: boolean;
      };
      mark_juz_read_with_completion: {
        Args: { p_juz_id: string; p_short_code: string };
        Returns: Json;
      };
      merge_anonymous_identity: {
        Args: { p_source_user_id: string };
        Returns: Json;
      };
      merge_anonymous_identity_for_target: {
        Args: { p_source_user_id: string; p_target_user_id: string };
        Returns: Json;
      };
      set_event_archive: {
        Args: { p_is_archived: boolean; p_short_code: string };
        Returns: boolean;
      };
      set_open_next_khatm: {
        Args: { p_open: boolean; p_short_code: string };
        Returns: Json;
      };
      unclaim_juz: {
        Args: { p_juz_id: string; p_short_code: string };
        Returns: boolean;
      };
      unmark_juz_read: {
        Args: { p_juz_id: string; p_short_code: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
