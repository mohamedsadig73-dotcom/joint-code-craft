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
      wms_cross_dock: {
        Row: {
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          cross_dock_number: string
          dock_location_id: string | null
          id: string
          inbound_order_id: string | null
          notes: string | null
          outbound_order_id: string | null
          priority: string | null
          scheduled_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          cross_dock_number: string
          dock_location_id?: string | null
          id?: string
          inbound_order_id?: string | null
          notes?: string | null
          outbound_order_id?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          cross_dock_number?: string
          dock_location_id?: string | null
          id?: string
          inbound_order_id?: string | null
          notes?: string | null
          outbound_order_id?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_cross_dock_dock_location_id_fkey"
            columns: ["dock_location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cross_dock_inbound_order_id_fkey"
            columns: ["inbound_order_id"]
            isOneToOne: false
            referencedRelation: "wms_inbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cross_dock_outbound_order_id_fkey"
            columns: ["outbound_order_id"]
            isOneToOne: false
            referencedRelation: "wms_outbound_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_cross_dock_lines: {
        Row: {
          created_at: string | null
          cross_dock_id: string
          id: string
          inbound_line_id: string | null
          lot_number: string | null
          outbound_line_id: string | null
          product_id: string
          quantity: number
          serial_number: string | null
          status: string | null
          transferred_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cross_dock_id: string
          id?: string
          inbound_line_id?: string | null
          lot_number?: string | null
          outbound_line_id?: string | null
          product_id: string
          quantity: number
          serial_number?: string | null
          status?: string | null
          transferred_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cross_dock_id?: string
          id?: string
          inbound_line_id?: string | null
          lot_number?: string | null
          outbound_line_id?: string | null
          product_id?: string
          quantity?: number
          serial_number?: string | null
          status?: string | null
          transferred_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_cross_dock_lines_cross_dock_id_fkey"
            columns: ["cross_dock_id"]
            isOneToOne: false
            referencedRelation: "wms_cross_dock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cross_dock_lines_inbound_line_id_fkey"
            columns: ["inbound_line_id"]
            isOneToOne: false
            referencedRelation: "wms_inbound_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cross_dock_lines_outbound_line_id_fkey"
            columns: ["outbound_line_id"]
            isOneToOne: false
            referencedRelation: "wms_outbound_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cross_dock_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_cycle_counts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          count_number: string
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          product_id: string | null
          status: string | null
          system_quantity: number | null
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          count_number: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id?: string | null
          status?: string | null
          system_quantity?: number | null
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          count_number?: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id?: string | null
          status?: string | null
          system_quantity?: number | null
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_cycle_counts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cycle_counts_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cycle_counts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_cycle_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_inbound_lines: {
        Row: {
          created_at: string | null
          expected_quantity: number
          expiry_date: string | null
          id: string
          inbound_order_id: string
          location_id: string | null
          lot_number: string | null
          notes: string | null
          product_id: string
          received_quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expected_quantity: number
          expiry_date?: string | null
          id?: string
          inbound_order_id: string
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          product_id: string
          received_quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expected_quantity?: number
          expiry_date?: string | null
          id?: string
          inbound_order_id?: string
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          product_id?: string
          received_quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_inbound_lines_inbound_order_id_fkey"
            columns: ["inbound_order_id"]
            isOneToOne: false
            referencedRelation: "wms_inbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_inbound_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_inbound_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_inbound_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_number: string
          received_by: string | null
          received_date: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["wms_order_status"]
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          received_by?: string | null
          received_date?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["wms_order_status"]
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          received_by?: string | null
          received_date?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["wms_order_status"]
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_inbound_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_inbound_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_inbound_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "wms_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_inventory: {
        Row: {
          available_quantity: number | null
          cost_per_unit: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          last_counted_at: string | null
          location_id: string
          lot_number: string | null
          manufacturing_date: string | null
          product_id: string
          quantity: number
          received_date: string | null
          reserved_quantity: number | null
          serial_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          available_quantity?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_at?: string | null
          location_id: string
          lot_number?: string | null
          manufacturing_date?: string | null
          product_id: string
          quantity?: number
          received_date?: string | null
          reserved_quantity?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          available_quantity?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_at?: string | null
          location_id?: string
          lot_number?: string | null
          manufacturing_date?: string | null
          product_id?: string
          quantity?: number
          received_date?: string | null
          reserved_quantity?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_locations: {
        Row: {
          aisle: string | null
          bin: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          location_type: string
          max_volume: number | null
          max_weight: number | null
          notes: string | null
          rack: string | null
          shelf: string | null
          temperature_zone: string | null
          updated_at: string | null
          zone: string
        }
        Insert: {
          aisle?: string | null
          bin?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string
          max_volume?: number | null
          max_weight?: number | null
          notes?: string | null
          rack?: string | null
          shelf?: string | null
          temperature_zone?: string | null
          updated_at?: string | null
          zone: string
        }
        Update: {
          aisle?: string | null
          bin?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string
          max_volume?: number | null
          max_weight?: number | null
          notes?: string | null
          rack?: string | null
          shelf?: string | null
          temperature_zone?: string | null
          updated_at?: string | null
          zone?: string
        }
        Relationships: []
      }
      wms_outbound_lines: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          lot_number: string | null
          notes: string | null
          outbound_order_id: string
          packed_quantity: number | null
          picked_quantity: number | null
          product_id: string
          requested_quantity: number
          serial_number: string | null
          shipped_quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          outbound_order_id: string
          packed_quantity?: number | null
          picked_quantity?: number | null
          product_id: string
          requested_quantity: number
          serial_number?: string | null
          shipped_quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          outbound_order_id?: string
          packed_quantity?: number | null
          picked_quantity?: number | null
          product_id?: string
          requested_quantity?: number
          serial_number?: string | null
          shipped_quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_outbound_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_outbound_lines_outbound_order_id_fkey"
            columns: ["outbound_order_id"]
            isOneToOne: false
            referencedRelation: "wms_outbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_outbound_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_outbound_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          customer_reference: string | null
          expected_ship_date: string | null
          id: string
          notes: string | null
          order_number: string
          packed_by: string | null
          picked_by: string | null
          priority: string | null
          shipped_by: string | null
          shipped_date: string | null
          shipping_address: string | null
          status: Database["public"]["Enums"]["wms_order_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_reference?: string | null
          expected_ship_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          packed_by?: string | null
          picked_by?: string | null
          priority?: string | null
          shipped_by?: string | null
          shipped_date?: string | null
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["wms_order_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_reference?: string | null
          expected_ship_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          packed_by?: string | null
          picked_by?: string | null
          priority?: string | null
          shipped_by?: string | null
          shipped_date?: string | null
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["wms_order_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_outbound_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_outbound_orders_packed_by_fkey"
            columns: ["packed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_outbound_orders_picked_by_fkey"
            columns: ["picked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_outbound_orders_shipped_by_fkey"
            columns: ["shipped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_products: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          name_en: string | null
          picking_strategy: string | null
          reorder_point: number | null
          requires_expiry_tracking: boolean | null
          requires_lot_tracking: boolean | null
          requires_serial_tracking: boolean | null
          shelf_life_days: number | null
          sku: string
          storage_conditions: string | null
          unit_of_measure: string
          updated_at: string | null
          volume: number | null
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          name_en?: string | null
          picking_strategy?: string | null
          reorder_point?: number | null
          requires_expiry_tracking?: boolean | null
          requires_lot_tracking?: boolean | null
          requires_serial_tracking?: boolean | null
          shelf_life_days?: number | null
          sku: string
          storage_conditions?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          volume?: number | null
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          name_en?: string | null
          picking_strategy?: string | null
          reorder_point?: number | null
          requires_expiry_tracking?: boolean | null
          requires_lot_tracking?: boolean | null
          requires_serial_tracking?: boolean | null
          shelf_life_days?: number | null
          sku?: string
          storage_conditions?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          volume?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_rma: {
        Row: {
          approved_by: string | null
          approved_date: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          id: string
          notes: string | null
          order_type: string
          original_order_id: string | null
          reason: string
          reason_category: string | null
          received_by: string | null
          received_date: string | null
          refund_amount: number | null
          requested_date: string
          rma_number: string
          status: string
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_date?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          order_type: string
          original_order_id?: string | null
          reason: string
          reason_category?: string | null
          received_by?: string | null
          received_date?: string | null
          refund_amount?: number | null
          requested_date?: string
          rma_number: string
          status?: string
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_date?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          original_order_id?: string | null
          reason?: string
          reason_category?: string | null
          received_by?: string | null
          received_date?: string | null
          refund_amount?: number | null
          requested_date?: string
          rma_number?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_rma_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "wms_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_rma_lines: {
        Row: {
          condition: string | null
          created_at: string | null
          disposition: string | null
          id: string
          location_id: string | null
          lot_number: string | null
          notes: string | null
          product_id: string
          quantity: number
          received_quantity: number | null
          rma_id: string
          serial_number: string | null
          updated_at: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          disposition?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          product_id: string
          quantity: number
          received_quantity?: number | null
          rma_id: string
          serial_number?: string | null
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          disposition?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          product_id?: string
          quantity?: number
          received_quantity?: number | null
          rma_id?: string
          serial_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_rma_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_rma_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_rma_lines_rma_id_fkey"
            columns: ["rma_id"]
            isOneToOne: false
            referencedRelation: "wms_rma"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_serial_numbers: {
        Row: {
          cost: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          inbound_order_id: string | null
          location_id: string | null
          lot_number: string | null
          notes: string | null
          outbound_order_id: string | null
          product_id: string
          received_date: string | null
          rma_id: string | null
          serial_number: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inbound_order_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          outbound_order_id?: string | null
          product_id: string
          received_date?: string | null
          rma_id?: string | null
          serial_number: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inbound_order_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          outbound_order_id?: string | null
          product_id?: string
          received_date?: string | null
          rma_id?: string | null
          serial_number?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_serial_numbers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_serial_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_suppliers: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_transactions: {
        Row: {
          created_at: string | null
          from_location_id: string | null
          id: string
          lot_number: string | null
          performed_at: string | null
          performed_by: string | null
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          serial_number: string | null
          to_location_id: string | null
          transaction_type: Database["public"]["Enums"]["wms_transaction_type"]
        }
        Insert: {
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          lot_number?: string | null
          performed_at?: string | null
          performed_by?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          serial_number?: string | null
          to_location_id?: string | null
          transaction_type: Database["public"]["Enums"]["wms_transaction_type"]
        }
        Update: {
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          lot_number?: string | null
          performed_at?: string | null
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          serial_number?: string | null
          to_location_id?: string | null
          transaction_type?: Database["public"]["Enums"]["wms_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wms_transactions_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_transactions_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
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
      generate_cycle_count_number: { Args: never; Returns: string }
      generate_maintenance_schedule: {
        Args: { _item_id: string; _year: number }
        Returns: undefined
      }
      generate_wms_order_number: { Args: { prefix: string }; Returns: string }
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
      wms_order_status:
        | "draft"
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
      wms_transaction_type:
        | "receive"
        | "putaway"
        | "pick"
        | "pack"
        | "ship"
        | "transfer"
        | "adjustment"
        | "cycle_count"
        | "return"
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
      wms_order_status: [
        "draft",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      wms_transaction_type: [
        "receive",
        "putaway",
        "pick",
        "pack",
        "ship",
        "transfer",
        "adjustment",
        "cycle_count",
        "return",
      ],
    },
  },
} as const
