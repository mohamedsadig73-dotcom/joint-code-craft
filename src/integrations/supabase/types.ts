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
      box_receipts: {
        Row: {
          box_no: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          destination: Database["public"]["Enums"]["box_destination"]
          id: string
          image_path: string | null
          invoice_number: string | null
          item_id: string | null
          notes: string | null
          packing_type: Database["public"]["Enums"]["packing_type"]
          part_no: string
          place: string | null
          qty: number
          receipt_date: string
          serial_no: number
          status: Database["public"]["Enums"]["box_receipt_status"]
          supplier: string
          unit: Database["public"]["Enums"]["box_unit"]
          updated_at: string
        }
        Insert: {
          box_no?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          destination?: Database["public"]["Enums"]["box_destination"]
          id?: string
          image_path?: string | null
          invoice_number?: string | null
          item_id?: string | null
          notes?: string | null
          packing_type?: Database["public"]["Enums"]["packing_type"]
          part_no: string
          place?: string | null
          qty: number
          receipt_date?: string
          serial_no?: number
          status?: Database["public"]["Enums"]["box_receipt_status"]
          supplier: string
          unit?: Database["public"]["Enums"]["box_unit"]
          updated_at?: string
        }
        Update: {
          box_no?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          destination?: Database["public"]["Enums"]["box_destination"]
          id?: string
          image_path?: string | null
          invoice_number?: string | null
          item_id?: string | null
          notes?: string | null
          packing_type?: Database["public"]["Enums"]["packing_type"]
          part_no?: string
          place?: string | null
          qty?: number
          receipt_date?: string
          serial_no?: number
          status?: Database["public"]["Enums"]["box_receipt_status"]
          supplier?: string
          unit?: Database["public"]["Enums"]["box_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_receipts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_receipts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json | null
          description: string | null
          id: string
          log_type: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          description?: string | null
          id?: string
          log_type: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          description?: string | null
          id?: string
          log_type?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_logs_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      container_items: {
        Row: {
          added_at: string
          added_by: string | null
          container_id: string
          id: string
          receipt_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          container_id: string
          id?: string
          receipt_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          container_id?: string
          id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "container_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_items_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "container_summary"
            referencedColumns: ["container_id"]
          },
          {
            foreignKeyName: "container_items_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "shipping_containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "box_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          name_ar: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_ar: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_ar?: string
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
      departments: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name_ar: string
          name_en: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name_ar: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gdpr_requests: {
        Row: {
          created_at: string | null
          data_exported_url: string | null
          due_date: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requester_email: string
          requester_name: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data_exported_url?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          requester_email: string
          requester_name?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data_exported_url?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requester_email?: string
          requester_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_checks: {
        Row: {
          check_point: string
          check_type: string
          corrective_action: string | null
          created_at: string | null
          deviation_notes: string | null
          humidity_reading: number | null
          id: string
          is_compliant: boolean | null
          location_id: string | null
          next_check_due: string | null
          temperature_reading: number | null
          verification_date: string | null
          verified_by: string | null
        }
        Insert: {
          check_point: string
          check_type: string
          corrective_action?: string | null
          created_at?: string | null
          deviation_notes?: string | null
          humidity_reading?: number | null
          id?: string
          is_compliant?: boolean | null
          location_id?: string | null
          next_check_due?: string | null
          temperature_reading?: number | null
          verification_date?: string | null
          verified_by?: string | null
        }
        Update: {
          check_point?: string
          check_type?: string
          corrective_action?: string | null
          created_at?: string | null
          deviation_notes?: string | null
          humidity_reading?: number | null
          id?: string
          is_compliant?: boolean | null
          location_id?: string | null
          next_check_due?: string | null
          temperature_reading?: number | null
          verification_date?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haccp_checks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_checks_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_employees: {
        Row: {
          created_at: string
          employee_name: string
          employee_number: string
          id: string
          job_title: string
          sheet_id: string
          total_days: number
        }
        Insert: {
          created_at?: string
          employee_name: string
          employee_number: string
          id?: string
          job_title: string
          sheet_id: string
          total_days?: number
        }
        Update: {
          created_at?: string
          employee_name?: string
          employee_number?: string
          id?: string
          job_title?: string
          sheet_id?: string
          total_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "holiday_employees_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "holiday_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_sheets: {
        Row: {
          created_at: string
          created_by: string | null
          holiday_name: string
          id: string
          month_year: string | null
          period_end: string
          period_start: string
          updated_at: string
          warehouse_name: string
          warehouse_number: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          holiday_name: string
          id?: string
          month_year?: string | null
          period_end: string
          period_start: string
          updated_at?: string
          warehouse_name: string
          warehouse_number: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          holiday_name?: string
          id?: string
          month_year?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string
          warehouse_name?: string
          warehouse_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_work_records: {
        Row: {
          created_at: string
          employee_names: string | null
          id: string
          notes: string | null
          serial_number: number
          sheet_id: string
          work_date: string
          work_type: string
        }
        Insert: {
          created_at?: string
          employee_names?: string | null
          id?: string
          notes?: string | null
          serial_number: number
          sheet_id: string
          work_date: string
          work_type: string
        }
        Update: {
          created_at?: string
          employee_names?: string | null
          id?: string
          notes?: string | null
          serial_number?: number
          sheet_id?: string
          work_date?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_work_records_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "holiday_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      item_groups: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "item_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      item_image_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          item_id: string
          new_path: string | null
          notes: string | null
          old_path: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          item_id: string
          new_path?: string | null
          notes?: string | null
          old_path?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          item_id?: string
          new_path?: string | null
          notes?: string | null
          old_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_image_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_image_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
        ]
      }
      items_master: {
        Row: {
          avg_cost: number | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          default_supplier: string | null
          default_unit: Database["public"]["Enums"]["box_unit"]
          description: string
          expiry_date: string | null
          group_id: string | null
          id: string
          image_path: string | null
          is_active: boolean
          last_cost: number | null
          max_qty: number | null
          min_qty: number | null
          model_no: string | null
          notes: string | null
          part_no: string
          reorder_qty: number | null
          supplier_id: string | null
          uom_id: string | null
          updated_at: string
        }
        Insert: {
          avg_cost?: number | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          default_supplier?: string | null
          default_unit?: Database["public"]["Enums"]["box_unit"]
          description?: string
          expiry_date?: string | null
          group_id?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          last_cost?: number | null
          max_qty?: number | null
          min_qty?: number | null
          model_no?: string | null
          notes?: string | null
          part_no: string
          reorder_qty?: number | null
          supplier_id?: string | null
          uom_id?: string | null
          updated_at?: string
        }
        Update: {
          avg_cost?: number | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          default_supplier?: string | null
          default_unit?: Database["public"]["Enums"]["box_unit"]
          description?: string
          expiry_date?: string | null
          group_id?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          last_cost?: number | null
          max_qty?: number | null
          min_qty?: number | null
          model_no?: string | null
          notes?: string | null
          part_no?: string
          reorder_qty?: number | null
          supplier_id?: string | null
          uom_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_master_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "item_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_master_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_master_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          created_by: string | null
          current_remaining_balance: number
          days_requested: number
          department: string
          deputy_contact: string | null
          deputy_department: string | null
          deputy_name: string | null
          employee_id: string
          employee_name: string
          employee_signature_date: string | null
          end_date_gregorian: string
          end_date_hijri: string | null
          expected_remaining_balance: number | null
          expected_return_date: string
          hire_date: string
          hr_approved: boolean | null
          hr_approved_by: string | null
          hr_approved_date: string | null
          hr_notes: string | null
          id: string
          job_title: string
          manager_approved: boolean | null
          manager_approved_by: string | null
          manager_approved_date: string | null
          manager_notes: string | null
          months_of_service: number | null
          original_balance: number
          previously_used_days: number
          reason: string | null
          request_status: string | null
          start_date_gregorian: string
          start_date_hijri: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_remaining_balance: number
          days_requested: number
          department: string
          deputy_contact?: string | null
          deputy_department?: string | null
          deputy_name?: string | null
          employee_id: string
          employee_name: string
          employee_signature_date?: string | null
          end_date_gregorian: string
          end_date_hijri?: string | null
          expected_remaining_balance?: number | null
          expected_return_date: string
          hire_date: string
          hr_approved?: boolean | null
          hr_approved_by?: string | null
          hr_approved_date?: string | null
          hr_notes?: string | null
          id?: string
          job_title: string
          manager_approved?: boolean | null
          manager_approved_by?: string | null
          manager_approved_date?: string | null
          manager_notes?: string | null
          months_of_service?: number | null
          original_balance?: number
          previously_used_days?: number
          reason?: string | null
          request_status?: string | null
          start_date_gregorian: string
          start_date_hijri?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_remaining_balance?: number
          days_requested?: number
          department?: string
          deputy_contact?: string | null
          deputy_department?: string | null
          deputy_name?: string | null
          employee_id?: string
          employee_name?: string
          employee_signature_date?: string | null
          end_date_gregorian?: string
          end_date_hijri?: string | null
          expected_remaining_balance?: number | null
          expected_return_date?: string
          hire_date?: string
          hr_approved?: boolean | null
          hr_approved_by?: string | null
          hr_approved_date?: string | null
          hr_notes?: string | null
          id?: string
          job_title?: string
          manager_approved?: boolean | null
          manager_approved_by?: string | null
          manager_approved_date?: string | null
          manager_notes?: string | null
          months_of_service?: number | null
          original_balance?: number
          previously_used_days?: number
          reason?: string | null
          request_status?: string | null
          start_date_gregorian?: string
          start_date_hijri?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_tracking: {
        Row: {
          actual_return_date: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          current_leave_end: string | null
          current_leave_start: string | null
          department: string
          employee_id: string
          employee_name: string
          entitled_days: number
          expected_return_date: string | null
          hire_date: string
          id: string
          job_title: string
          last_leave_end: string | null
          last_leave_start: string | null
          next_leave_due: string | null
          notes: string | null
          remaining_balance: number | null
          travel_date: string | null
          travel_destination: string | null
          updated_at: string
          used_days: number
        }
        Insert: {
          actual_return_date?: string | null
          contract_type: string
          created_at?: string
          created_by?: string | null
          current_leave_end?: string | null
          current_leave_start?: string | null
          department: string
          employee_id: string
          employee_name: string
          entitled_days?: number
          expected_return_date?: string | null
          hire_date: string
          id?: string
          job_title: string
          last_leave_end?: string | null
          last_leave_start?: string | null
          next_leave_due?: string | null
          notes?: string | null
          remaining_balance?: number | null
          travel_date?: string | null
          travel_destination?: string | null
          updated_at?: string
          used_days?: number
        }
        Update: {
          actual_return_date?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          current_leave_end?: string | null
          current_leave_start?: string | null
          department?: string
          employee_id?: string
          employee_name?: string
          entitled_days?: number
          expected_return_date?: string | null
          hire_date?: string
          id?: string
          job_title?: string
          last_leave_end?: string | null
          last_leave_start?: string | null
          next_leave_due?: string | null
          notes?: string | null
          remaining_balance?: number | null
          travel_date?: string | null
          travel_destination?: string | null
          updated_at?: string
          used_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_tracking_created_by_fkey"
            columns: ["created_by"]
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
      master_employees: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          employee_name: string
          employee_number: string
          id: string
          is_active: boolean
          job_title: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          employee_name: string
          employee_number: string
          id?: string
          is_active?: boolean
          job_title?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          employee_name?: string
          employee_number?: string
          id?: string
          is_active?: boolean
          job_title?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      petty_cash_expenses: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cost_center: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          invoice_number: string | null
          item_name: string | null
          notes: string | null
          period_id: string
          quantity: number
          recipient: string | null
          status: string
          total_amount: number | null
          unit_price: number
          updated_at: string
          vendor_name: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cost_center: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          invoice_number?: string | null
          item_name?: string | null
          notes?: string | null
          period_id: string
          quantity?: number
          recipient?: string | null
          status?: string
          total_amount?: number | null
          unit_price: number
          updated_at?: string
          vendor_name: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cost_center?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          invoice_number?: string | null
          item_name?: string | null
          notes?: string | null
          period_id?: string
          quantity?: number
          recipient?: string | null
          status?: string
          total_amount?: number | null
          unit_price?: number
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_expenses_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          balance_disposition: string | null
          budget_limit: number
          carried_from_period_id: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          current_balance: number
          disposition_amount: number | null
          disposition_reference: string | null
          end_date: string | null
          expenses_count: number
          id: string
          location: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_balance: number
          period_number: string
          responsible_person: string
          start_date: string | null
          status: Database["public"]["Enums"]["petty_cash_status"]
          total_expenses: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          balance_disposition?: string | null
          budget_limit?: number
          carried_from_period_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          current_balance?: number
          disposition_amount?: number | null
          disposition_reference?: string | null
          end_date?: string | null
          expenses_count?: number
          id?: string
          location: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_balance?: number
          period_number: string
          responsible_person: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["petty_cash_status"]
          total_expenses?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          balance_disposition?: string | null
          budget_limit?: number
          carried_from_period_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          current_balance?: number
          disposition_amount?: number | null
          disposition_reference?: string | null
          end_date?: string | null
          expenses_count?: number
          id?: string
          location?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_balance?: number
          period_number?: string
          responsible_person?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["petty_cash_status"]
          total_expenses?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_periods_carried_from_period_id_fkey"
            columns: ["carried_from_period_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_periods_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          from_period_id: string | null
          id: string
          notes: string | null
          period_id: string
          reference_number: string | null
          to_period_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          from_period_id?: string | null
          id?: string
          notes?: string | null
          period_id: string
          reference_number?: string | null
          to_period_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          from_period_id?: string | null
          id?: string
          notes?: string | null
          period_id?: string
          reference_number?: string | null
          to_period_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_from_period_id_fkey"
            columns: ["from_period_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_to_period_id_fkey"
            columns: ["to_period_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_periods"
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
          is_active: boolean
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
          is_active?: boolean
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
          is_active?: boolean
          phone?: string | null
          theme_preference?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
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
      shipping_containers: {
        Row: {
          container_no: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          destination: Database["public"]["Enums"]["box_destination"]
          id: string
          notes: string | null
          shipped_date: string | null
          shipping_company: string
          status: Database["public"]["Enums"]["container_status"]
          updated_at: string
        }
        Insert: {
          container_no: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination: Database["public"]["Enums"]["box_destination"]
          id?: string
          notes?: string | null
          shipped_date?: string | null
          shipping_company: string
          status?: Database["public"]["Enums"]["container_status"]
          updated_at?: string
        }
        Update: {
          container_no?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination?: Database["public"]["Enums"]["box_destination"]
          id?: string
          notes?: string | null
          shipped_date?: string | null
          shipping_company?: string
          status?: Database["public"]["Enums"]["container_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_containers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_containers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          avg_cost: number
          id: string
          item_id: string
          last_movement_at: string | null
          qty_on_hand: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          avg_cost?: number
          id?: string
          item_id: string
          last_movement_at?: string | null
          qty_on_hand?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          avg_cost?: number
          id?: string
          item_id?: string
          last_movement_at?: string | null
          qty_on_hand?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movement_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          line_no: number
          line_total: number | null
          movement_id: string
          qty: number
          remarks: string | null
          unit_cost: number
          uom_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          line_no: number
          line_total?: number | null
          movement_id: string
          qty: number
          remarks?: string | null
          unit_cost?: number
          uom_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          line_no?: number
          line_total?: number | null
          movement_id?: string
          qty?: number
          remarks?: string | null
          unit_cost?: number
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movement_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movement_lines_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movement_lines_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          from_warehouse_id: string | null
          id: string
          movement_date: string
          movement_no: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          project_id: string | null
          reference_no: string | null
          status: Database["public"]["Enums"]["stock_movement_status"]
          supplier_id: string | null
          to_warehouse_id: string | null
          total_qty: number
          total_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_date?: string
          movement_no: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          reference_no?: string | null
          status?: Database["public"]["Enums"]["stock_movement_status"]
          supplier_id?: string | null
          to_warehouse_id?: string | null
          total_qty?: number
          total_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_date?: string
          movement_no?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          reference_no?: string | null
          status?: Database["public"]["Enums"]["stock_movement_status"]
          supplier_id?: string | null
          to_warehouse_id?: string | null
          total_qty?: number
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          notes: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      units_of_measure: {
        Row: {
          base_unit_id: string | null
          code: string
          conversion_factor: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          base_unit_id?: string | null
          code: string
          conversion_factor?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          base_unit_id?: string | null
          code?: string
          conversion_factor?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_of_measure_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      update_logs: {
        Row: {
          app_version: string | null
          attempted_url: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          phase: string
          platform: string
          shell_version: string | null
          status: string
          target_version: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          attempted_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          phase: string
          platform?: string
          shell_version?: string | null
          status: string
          target_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          attempted_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          phase?: string
          platform?: string
          shell_version?: string | null
          status?: string
          target_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "update_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_verified_at: string | null
          method: string | null
          totp_secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_2fa_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          type: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          type?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          location: string | null
          manager_id: string | null
          name_ar: string
          name_en: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          name_ar: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wms_3pl_tenants: {
        Row: {
          address: string | null
          billing_cycle: string | null
          contact_person: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          phone: string | null
          storage_allocation: number | null
          tenant_code: string
          tenant_name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          billing_cycle?: string | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          storage_allocation?: number | null
          tenant_code: string
          tenant_name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          billing_cycle?: string | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          storage_allocation?: number | null
          tenant_code?: string
          tenant_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_3pl_tenants_created_by_fkey"
            columns: ["created_by"]
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
      wms_ecommerce_orders: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          external_order_id: string
          id: string
          order_date: string | null
          order_number: string | null
          outbound_order_id: string | null
          platform_id: string | null
          shipping_address: string | null
          status: string | null
          sync_status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          external_order_id: string
          id?: string
          order_date?: string | null
          order_number?: string | null
          outbound_order_id?: string | null
          platform_id?: string | null
          shipping_address?: string | null
          status?: string | null
          sync_status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          external_order_id?: string
          id?: string
          order_date?: string | null
          order_number?: string | null
          outbound_order_id?: string | null
          platform_id?: string | null
          shipping_address?: string | null
          status?: string | null
          sync_status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_ecommerce_orders_outbound_order_id_fkey"
            columns: ["outbound_order_id"]
            isOneToOne: false
            referencedRelation: "wms_outbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_ecommerce_orders_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "wms_ecommerce_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_ecommerce_platforms: {
        Row: {
          api_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_connected: boolean | null
          last_sync_at: string | null
          orders_pending: number | null
          platform_name: string
          platform_type: string
          settings: Json | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          api_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_sync_at?: string | null
          orders_pending?: number | null
          platform_name: string
          platform_type: string
          settings?: Json | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_sync_at?: string | null
          orders_pending?: number | null
          platform_name?: string
          platform_type?: string
          settings?: Json | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_ecommerce_platforms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      wms_invoice_lines: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "wms_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "wms_3pl_tenants"
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
      wms_mes_work_orders: {
        Row: {
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          product_id: string | null
          production_line: string | null
          quantity_completed: number | null
          quantity_in_progress: number | null
          quantity_ordered: number
          quantity_rejected: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          work_order_number: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          product_id?: string | null
          production_line?: string | null
          quantity_completed?: number | null
          quantity_in_progress?: number | null
          quantity_ordered: number
          quantity_rejected?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          work_order_number: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          product_id?: string | null
          production_line?: string | null
          quantity_completed?: number | null
          quantity_in_progress?: number | null
          quantity_ordered?: number
          quantity_rejected?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_mes_work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_mes_work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
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
      wms_temperature_logs: {
        Row: {
          humidity: number | null
          id: string
          recorded_at: string | null
          status: string | null
          temperature: number
          zone_id: string
        }
        Insert: {
          humidity?: number | null
          id?: string
          recorded_at?: string | null
          status?: string | null
          temperature: number
          zone_id: string
        }
        Update: {
          humidity?: number | null
          id?: string
          recorded_at?: string | null
          status?: string | null
          temperature?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_temperature_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "wms_temperature_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_temperature_zones: {
        Row: {
          created_at: string | null
          current_humidity: number | null
          current_temp: number | null
          humidity_max: number | null
          humidity_min: number | null
          id: string
          is_active: boolean | null
          last_reading_at: string | null
          location_id: string | null
          notes: string | null
          sensor_id: string | null
          status: string | null
          target_temp_max: number | null
          target_temp_min: number | null
          updated_at: string | null
          zone_code: string
          zone_name: string
        }
        Insert: {
          created_at?: string | null
          current_humidity?: number | null
          current_temp?: number | null
          humidity_max?: number | null
          humidity_min?: number | null
          id?: string
          is_active?: boolean | null
          last_reading_at?: string | null
          location_id?: string | null
          notes?: string | null
          sensor_id?: string | null
          status?: string | null
          target_temp_max?: number | null
          target_temp_min?: number | null
          updated_at?: string | null
          zone_code: string
          zone_name: string
        }
        Update: {
          created_at?: string | null
          current_humidity?: number | null
          current_temp?: number | null
          humidity_max?: number | null
          humidity_min?: number | null
          id?: string
          is_active?: boolean | null
          last_reading_at?: string | null
          location_id?: string | null
          notes?: string | null
          sensor_id?: string | null
          status?: string | null
          target_temp_max?: number | null
          target_temp_min?: number | null
          updated_at?: string | null
          zone_code?: string
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_temperature_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
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
      wms_wip_items: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          product_id: string | null
          quantity: number
          stage: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity: number
          stage?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          stage?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_wip_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "wms_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_wip_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_wip_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "wms_mes_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      box_summary: {
        Row: {
          box_no: string | null
          date: string | null
          destination: Database["public"]["Enums"]["box_destination"] | null
          items_count: number | null
          suppliers: string | null
          total_qty: number | null
        }
        Relationships: []
      }
      container_summary: {
        Row: {
          boxes_count: number | null
          container_id: string | null
          container_no: string | null
          created_at: string | null
          destination: Database["public"]["Enums"]["box_destination"] | null
          loose_count: number | null
          shipped_date: string | null
          shipping_company: string | null
          status: Database["public"]["Enums"]["container_status"] | null
          suppliers: string | null
          total_qty: number | null
        }
        Relationships: []
      }
      user_2fa_status: {
        Row: {
          created_at: string | null
          id: string | null
          is_enabled: boolean | null
          last_verified_at: string | null
          method: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_2fa_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_admin_office_notifications: { Args: never; Returns: undefined }
      check_maintenance_notifications: { Args: never; Returns: undefined }
      check_user_has_linked_data: {
        Args: { target_user_id: string }
        Returns: Json
      }
      cleanup_old_deleted_box_receipts: { Args: never; Returns: undefined }
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
      deactivate_user: { Args: { target_user_id: string }; Returns: boolean }
      generate_archive_number: { Args: never; Returns: string }
      generate_cycle_count_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_maintenance_schedule: {
        Args: { _item_id: string; _year: number }
        Returns: undefined
      }
      generate_petty_cash_period_number: { Args: never; Returns: string }
      generate_stock_movement_no: {
        Args: { _type: Database["public"]["Enums"]["stock_movement_type"] }
        Returns: string
      }
      generate_verification_code: {
        Args: { _type?: string; _user_id: string }
        Returns: string
      }
      generate_wms_order_number: { Args: { prefix: string }; Returns: string }
      generate_work_order_number: { Args: never; Returns: string }
      get_decrypted_totp_secret: { Args: { _user_id: string }; Returns: string }
      hard_delete_user: { Args: { target_user_id: string }; Returns: Json }
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
      log_failed_login_attempt:
        | {
            Args: {
              _email: string
              _error_message: string
              _ip_address?: string
              _user_agent?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _email: string
              _error_message: string
              _ip_address?: string
              _user_agent?: string
            }
            Returns: string
          }
      reactivate_user: { Args: { target_user_id: string }; Returns: boolean }
      verify_backup_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      verify_code: {
        Args: { _code: string; _type?: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      box_destination: "morocco" | "uzbekistan" | "unspecified"
      box_receipt_status: "received" | "sorted" | "packed" | "shipped"
      box_unit:
        | "PCS"
        | "SET"
        | "BOX"
        | "KG"
        | "MTR"
        | "LTR"
        | "PAIR"
        | "ROLL"
        | "KIT"
        | "BAG"
        | "CTN"
        | "DRUM"
        | "PACK"
        | "BTL"
        | "M2"
        | "M3"
      container_status: "preparing" | "sealed" | "shipped" | "delivered"
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
      packing_type: "boxed" | "loose"
      petty_cash_status: "open" | "closed" | "pending_approval" | "rejected"
      stock_movement_status: "draft" | "posted" | "cancelled"
      stock_movement_type: "receipt" | "issue" | "transfer"
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
      box_destination: ["morocco", "uzbekistan", "unspecified"],
      box_receipt_status: ["received", "sorted", "packed", "shipped"],
      box_unit: [
        "PCS",
        "SET",
        "BOX",
        "KG",
        "MTR",
        "LTR",
        "PAIR",
        "ROLL",
        "KIT",
        "BAG",
        "CTN",
        "DRUM",
        "PACK",
        "BTL",
        "M2",
        "M3",
      ],
      container_status: ["preparing", "sealed", "shipped", "delivered"],
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
      packing_type: ["boxed", "loose"],
      petty_cash_status: ["open", "closed", "pending_approval", "rejected"],
      stock_movement_status: ["draft", "posted", "cancelled"],
      stock_movement_type: ["receipt", "issue", "transfer"],
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
