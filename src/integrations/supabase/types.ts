export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      archive_files: {
        Row: {
          archive_number: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          archive_number: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          archive_number?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      declaration_deletion_log: {
        Row: {
          archive_number: string | null
          declaration_id: string
          declaration_status:
            | Database["public"]["Enums"]["declaration_status"]
            | null
          declaration_type:
            | Database["public"]["Enums"]["declaration_type"]
            | null
          deleted_at: string
          deleted_by: string
          id: string
          notes: string | null
          sender_username: string | null
        }
        Insert: {
          archive_number?: string | null
          declaration_id: string
          declaration_status?:
            | Database["public"]["Enums"]["declaration_status"]
            | null
          declaration_type?:
            | Database["public"]["Enums"]["declaration_type"]
            | null
          deleted_at?: string
          deleted_by: string
          id?: string
          notes?: string | null
          sender_username?: string | null
        }
        Update: {
          archive_number?: string | null
          declaration_id?: string
          declaration_status?:
            | Database["public"]["Enums"]["declaration_status"]
            | null
          declaration_type?:
            | Database["public"]["Enums"]["declaration_type"]
            | null
          deleted_at?: string
          deleted_by?: string
          id?: string
          notes?: string | null
          sender_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "declaration_deletion_log_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      declaration_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          declaration_id: string
          id: string
          new_status: Database["public"]["Enums"]["declaration_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["declaration_status"] | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          declaration_id: string
          id?: string
          new_status: Database["public"]["Enums"]["declaration_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["declaration_status"] | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          declaration_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["declaration_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["declaration_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "declaration_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declaration_status_history_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      declarations: {
        Row: {
          archive_file_id: string | null
          archive_number: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          notes: string | null
          phone: string | null
          sender_id: string
          status: Database["public"]["Enums"]["declaration_status"]
          type: Database["public"]["Enums"]["declaration_type"]
          updated_at: string
        }
        Insert: {
          archive_file_id?: string | null
          archive_number?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id: string
          notes?: string | null
          phone?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["declaration_status"]
          type: Database["public"]["Enums"]["declaration_type"]
          updated_at?: string
        }
        Update: {
          archive_file_id?: string | null
          archive_number?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["declaration_status"]
          type?: Database["public"]["Enums"]["declaration_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "declarations_archive_file_id_fkey"
            columns: ["archive_file_id"]
            isOneToOne: false
            referencedRelation: "archive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declarations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declarations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_assets: {
        Row: {
          active: boolean | null
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          location: string
          name: string
          notes: string | null
          purchase_date: string | null
          site: string | null
          type: Database["public"]["Enums"]["maintenance_asset_type"]
          updated_at: string | null
          warranty_expiry: string | null
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location: string
          name: string
          notes?: string | null
          purchase_date?: string | null
          site?: string | null
          type: Database["public"]["Enums"]["maintenance_asset_type"]
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string
          name?: string
          notes?: string | null
          purchase_date?: string | null
          site?: string | null
          type?: Database["public"]["Enums"]["maintenance_asset_type"]
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Relationships: []
      }
      maintenance_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          schedule_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          schedule_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          schedule_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_attachments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_items: {
        Row: {
          active: boolean | null
          asset_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_cost: number | null
          frequency: Database["public"]["Enums"]["maintenance_frequency"]
          id: string
          last_maintenance_date: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          reminder_days: number | null
          start_date: string
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          active?: boolean | null
          asset_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          frequency: Database["public"]["Enums"]["maintenance_frequency"]
          id?: string
          last_maintenance_date?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          reminder_days?: number | null
          start_date?: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          active?: boolean | null
          asset_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          frequency?: Database["public"]["Enums"]["maintenance_frequency"]
          id?: string
          last_maintenance_date?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          reminder_days?: number | null
          start_date?: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedule: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          created_at: string | null
          executed_date: string | null
          id: string
          maintenance_item_id: string
          month: number
          notes: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at: string | null
          year: number
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          created_at?: string | null
          executed_date?: string | null
          id?: string
          maintenance_item_id: string
          month: number
          notes?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string | null
          year: number
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          created_at?: string | null
          executed_date?: string | null
          id?: string
          maintenance_item_id?: string
          month?: number
          notes?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedule_maintenance_item_id_fkey"
            columns: ["maintenance_item_id"]
            isOneToOne: false
            referencedRelation: "maintenance_items"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_vendors: {
        Row: {
          active: boolean | null
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          declaration_id: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          declaration_id: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          declaration_id?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          calendar_preference: string | null
          created_at: string
          email: string
          id: string
          phone: string | null
          theme_preference: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          calendar_preference?: string | null
          created_at?: string
          email: string
          id: string
          phone?: string | null
          theme_preference?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          calendar_preference?: string | null
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          theme_preference?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      rate_limit_tracking: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_admin_office_notifications: { Args: never; Returns: undefined }
      check_maintenance_notifications: { Args: never; Returns: undefined }
      cleanup_old_deleted_declarations: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_maintenance_notification: {
        Args: {
          _message: string
          _notification_type: string
          _schedule_id: string
        }
        Returns: undefined
      }
      generate_archive_number: { Args: never; Returns: string }
      generate_maintenance_schedule: {
        Args: { _item_id: string; _year: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _new_values?: Json
          _old_values?: Json
          _record_id: string
          _table_name: string
        }
        Returns: string
      }
      log_failed_login_attempt: {
        Args: {
          _email: string
          _error_message: string
          _ip_address?: string
          _user_agent?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      declaration_status:
        | "draft"
        | "pending_warehouse_signature"
        | "warehouse_signed"
        | "sent_to_admin_office"
        | "received_by_admin_office"
        | "returned_to_warehouse"
        | "archived"
        | "rejected"
      declaration_type: "دخول" | "خروج"
      maintenance_asset_type:
        | "electrical"
        | "plumbing"
        | "hvac"
        | "safety"
        | "equipment"
        | "building"
        | "other"
      maintenance_frequency:
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "ad_hoc"
      maintenance_status: "pending" | "done" | "not_required" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "user"],
      declaration_status: [
        "draft",
        "pending_warehouse_signature",
        "warehouse_signed",
        "sent_to_admin_office",
        "received_by_admin_office",
        "returned_to_warehouse",
        "archived",
        "rejected",
      ],
      declaration_type: ["دخول", "خروج"],
      maintenance_asset_type: [
        "electrical",
        "plumbing",
        "hvac",
        "safety",
        "equipment",
        "building",
        "other",
      ],
      maintenance_frequency: [
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
        "ad_hoc",
      ],
      maintenance_status: ["pending", "done", "not_required", "overdue"],
    },
  },
} as const
