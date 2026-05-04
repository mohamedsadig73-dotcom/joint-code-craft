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
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
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
      box_dispatch_items: {
        Row: {
          created_at: string
          dispatch_id: string
          id: string
          notes: string | null
          qty_dispatched: number
          receipt_id: string
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          id?: string
          notes?: string | null
          qty_dispatched: number
          receipt_id: string
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          id?: string
          notes?: string | null
          qty_dispatched?: number
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_dispatch_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "box_dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_dispatch_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "box_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      box_dispatches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          department_name: string
          destination: Database["public"]["Enums"]["box_destination"]
          dispatch_date: string
          dispatch_no: string
          id: string
          notes: string | null
          serial_no: number
          shipping_company: string | null
          signer_name: string
          signer_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          department_name: string
          destination?: Database["public"]["Enums"]["box_destination"]
          dispatch_date?: string
          dispatch_no: string
          id?: string
          notes?: string | null
          serial_no?: number
          shipping_company?: string | null
          signer_name: string
          signer_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          department_name?: string
          destination?: Database["public"]["Enums"]["box_destination"]
          dispatch_date?: string
          dispatch_no?: string
          id?: string
          notes?: string | null
          serial_no?: number
          shipping_company?: string | null
          signer_name?: string
          signer_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_dispatches_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
          inv_transaction_id: string | null
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
          inv_transaction_id?: string | null
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
          inv_transaction_id?: string | null
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
            foreignKeyName: "box_receipts_inv_transaction_id_fkey"
            columns: ["inv_transaction_id"]
            isOneToOne: false
            referencedRelation: "inv_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_receipts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "box_receipts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "box_receipts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_receipts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
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
      inv_custody: {
        Row: {
          id: string
          item_id: string
          last_movement_at: string | null
          party_name: string
          party_ref: string | null
          party_type: Database["public"]["Enums"]["inv_party_type"]
          qty: number
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          last_movement_at?: string | null
          party_name: string
          party_ref?: string | null
          party_type: Database["public"]["Enums"]["inv_party_type"]
          qty?: number
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          last_movement_at?: string | null
          party_name?: string
          party_ref?: string | null
          party_type?: Database["public"]["Enums"]["inv_party_type"]
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_custody_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_custody_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_custody_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_custody_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
          },
        ]
      }
      inv_locations: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          notes: string | null
          parent_id: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock: {
        Row: {
          id: string
          item_id: string
          last_movement_at: string | null
          location_id: string | null
          qty: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          item_id: string
          last_movement_at?: string | null
          location_id?: string | null
          qty?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          item_id?: string
          last_movement_at?: string | null
          location_id?: string | null
          qty?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_transaction_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          line_no: number
          notes: string | null
          qty: number
          transaction_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          line_no?: number
          notes?: string | null
          qty: number
          transaction_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          line_no?: number
          notes?: string | null
          qty?: number
          transaction_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_transaction_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_transaction_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_transaction_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_transaction_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inv_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "inv_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          declaration_id: string | null
          deleted_at: string | null
          from_location_id: string | null
          from_warehouse_id: string | null
          id: string
          linked_box_receipt_id: string | null
          notes: string | null
          party_name: string | null
          party_ref: string | null
          party_type: Database["public"]["Enums"]["inv_party_type"] | null
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["inv_txn_status"]
          to_location_id: string | null
          to_warehouse_id: string | null
          txn_date: string
          txn_no: string
          txn_type: Database["public"]["Enums"]["inv_txn_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          declaration_id?: string | null
          deleted_at?: string | null
          from_location_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          linked_box_receipt_id?: string | null
          notes?: string | null
          party_name?: string | null
          party_ref?: string | null
          party_type?: Database["public"]["Enums"]["inv_party_type"] | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["inv_txn_status"]
          to_location_id?: string | null
          to_warehouse_id?: string | null
          txn_date?: string
          txn_no: string
          txn_type: Database["public"]["Enums"]["inv_txn_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          declaration_id?: string | null
          deleted_at?: string | null
          from_location_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          linked_box_receipt_id?: string | null
          notes?: string | null
          party_name?: string | null
          party_ref?: string | null
          party_type?: Database["public"]["Enums"]["inv_party_type"] | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["inv_txn_status"]
          to_location_id?: string | null
          to_warehouse_id?: string | null
          txn_date?: string
          txn_no?: string
          txn_type?: Database["public"]["Enums"]["inv_txn_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_transactions_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_transactions_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_transactions_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_transactions_linked_box_receipt_id_fkey"
            columns: ["linked_box_receipt_id"]
            isOneToOne: false
            referencedRelation: "box_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_transactions_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_transactions_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_image_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_image_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_image_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
          },
        ]
      }
      item_suppliers: {
        Row: {
          created_at: string
          id: string
          is_preferred: boolean
          item_id: string
          notes: string | null
          purchase_price: number
          supplier_id: string
          supplier_item_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id: string
          notes?: string | null
          purchase_price?: number
          supplier_id: string
          supplier_item_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id?: string
          notes?: string | null
          purchase_price?: number
          supplier_id?: string
          supplier_item_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_suppliers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_suppliers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_suppliers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_suppliers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      item_warehouses: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          item_id: string
          max_qty: number | null
          min_qty: number | null
          notes: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          item_id: string
          max_qty?: number | null
          min_qty?: number | null
          notes?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          item_id?: string
          max_qty?: number | null
          min_qty?: number | null
          notes?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_warehouses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_warehouses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_warehouses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_warehouses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      items_master: {
        Row: {
          approval_status: Database["public"]["Enums"]["item_approval_status"]
          approved_at: string | null
          approved_by: string | null
          avg_cost: number | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          condition: string
          created_at: string
          created_by: string | null
          default_supplier: string | null
          default_unit: Database["public"]["Enums"]["box_unit"]
          description: string
          expiry_date: string | null
          group_id: string | null
          has_expiry: boolean
          id: string
          image_path: string | null
          is_active: boolean
          item_type: string
          last_cost: number | null
          max_qty: number | null
          min_qty: number | null
          model_no: string | null
          name_ar: string | null
          name_en: string | null
          notes: string | null
          part_no: string
          plate_no: string | null
          rejection_reason: string | null
          reorder_qty: number | null
          supplier_id: string | null
          uom_id: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["item_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          avg_cost?: number | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          condition?: string
          created_at?: string
          created_by?: string | null
          default_supplier?: string | null
          default_unit?: Database["public"]["Enums"]["box_unit"]
          description?: string
          expiry_date?: string | null
          group_id?: string | null
          has_expiry?: boolean
          id?: string
          image_path?: string | null
          is_active?: boolean
          item_type?: string
          last_cost?: number | null
          max_qty?: number | null
          min_qty?: number | null
          model_no?: string | null
          name_ar?: string | null
          name_en?: string | null
          notes?: string | null
          part_no: string
          plate_no?: string | null
          rejection_reason?: string | null
          reorder_qty?: number | null
          supplier_id?: string | null
          uom_id?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["item_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          avg_cost?: number | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          condition?: string
          created_at?: string
          created_by?: string | null
          default_supplier?: string | null
          default_unit?: Database["public"]["Enums"]["box_unit"]
          description?: string
          expiry_date?: string | null
          group_id?: string | null
          has_expiry?: boolean
          id?: string
          image_path?: string | null
          is_active?: boolean
          item_type?: string
          last_cost?: number | null
          max_qty?: number | null
          min_qty?: number | null
          model_no?: string | null
          name_ar?: string | null
          name_en?: string | null
          notes?: string | null
          part_no?: string
          plate_no?: string | null
          rejection_reason?: string | null
          reorder_qty?: number | null
          supplier_id?: string | null
          uom_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_master_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      receiving_staff: {
        Row: {
          authorized_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_no: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          notes: string | null
          personal_id: string | null
          phone: string | null
          serial: number
          updated_at: string
        }
        Insert: {
          authorized_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_no?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          notes?: string | null
          personal_id?: string | null
          phone?: string | null
          serial?: never
          updated_at?: string
        }
        Update: {
          authorized_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_no?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          notes?: string | null
          personal_id?: string | null
          phone?: string | null
          serial?: never
          updated_at?: string
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
      stock_count_lines: {
        Row: {
          count_id: string
          counted_at: string | null
          counted_by: string | null
          counted_qty: number
          created_at: string
          expected_qty: number
          id: string
          item_id: string
          line_no: number
          location_id: string | null
          remarks: string | null
          unit_cost: number
          variance_qty: number | null
        }
        Insert: {
          count_id: string
          counted_at?: string | null
          counted_by?: string | null
          counted_qty?: number
          created_at?: string
          expected_qty?: number
          id?: string
          item_id: string
          line_no?: number
          location_id?: string | null
          remarks?: string | null
          unit_cost?: number
          variance_qty?: number | null
        }
        Update: {
          count_id?: string
          counted_at?: string | null
          counted_by?: string | null
          counted_qty?: number
          created_at?: string
          expected_qty?: number
          id?: string
          item_id?: string
          line_no?: number
          location_id?: string | null
          remarks?: string | null
          unit_cost?: number
          variance_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_lines_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_low_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_count_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          count_date: string
          count_no: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          status: Database["public"]["Enums"]["stock_count_status"]
          total_variance_qty: number | null
          total_variance_value: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          count_date?: string
          count_no?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: Database["public"]["Enums"]["stock_count_status"]
          total_variance_qty?: number | null
          total_variance_value?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          count_date?: string
          count_no?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: Database["public"]["Enums"]["stock_count_status"]
          total_variance_qty?: number | null
          total_variance_value?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_imports: {
        Row: {
          created_at: string
          created_by: string | null
          errors: Json
          file_name: string | null
          id: string
          rows_inserted: number
          rows_skipped: number
          rows_total: number
          rows_updated: number
          supplier_id: string | null
          supplier_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          errors?: Json
          file_name?: string | null
          id?: string
          rows_inserted?: number
          rows_skipped?: number
          rows_total?: number
          rows_updated?: number
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          errors?: Json
          file_name?: string | null
          id?: string
          rows_inserted?: number
          rows_skipped?: number
          rows_total?: number
          rows_updated?: number
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Relationships: []
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
      inv_low_stock: {
        Row: {
          description: string | null
          item_id: string | null
          min_qty: number | null
          part_no: string | null
          total_qty: number | null
        }
        Relationships: []
      }
      inv_stock_summary: {
        Row: {
          description: string | null
          item_id: string | null
          last_movement_at: string | null
          location_code: string | null
          location_id: string | null
          min_qty: number | null
          part_no: string | null
          qty: number | null
          unit: Database["public"]["Enums"]["box_unit"] | null
          warehouse_code: string | null
          warehouse_id: string | null
          warehouse_name_ar: string | null
          warehouse_name_en: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
      v_low_stock_alerts: {
        Row: {
          alert_level: string | null
          description: string | null
          item_id: string | null
          max_qty: number | null
          min_qty: number | null
          name_ar: string | null
          part_no: string | null
          qty_on_hand: number | null
          reorder_qty: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_dispatch_quantities: {
        Args: { p_dispatch_id: string }
        Returns: undefined
      }
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
      generate_declaration_id: {
        Args: { _type: Database["public"]["Enums"]["declaration_type"] }
        Returns: string
      }
      generate_inv_txn_no: {
        Args: { _type: Database["public"]["Enums"]["inv_txn_type"] }
        Returns: string
      }
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
      post_stock_count: { Args: { p_count_id: string }; Returns: string }
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
      app_role: "admin" | "manager" | "user" | "storekeeper" | "viewer"
      box_destination: "morocco" | "uzbekistan" | "unspecified"
      box_receipt_status:
        | "received"
        | "sorted"
        | "packed"
        | "shipped"
        | "dispatched"
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
      inv_party_type: "employee" | "department" | "supplier" | "external"
      inv_txn_status: "draft" | "posted" | "cancelled"
      inv_txn_type: "in" | "out" | "transfer" | "return"
      item_approval_status: "draft" | "pending" | "approved" | "rejected"
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
      stock_count_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "posted"
        | "cancelled"
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
      app_role: ["admin", "manager", "user", "storekeeper", "viewer"],
      box_destination: ["morocco", "uzbekistan", "unspecified"],
      box_receipt_status: [
        "received",
        "sorted",
        "packed",
        "shipped",
        "dispatched",
      ],
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
      inv_party_type: ["employee", "department", "supplier", "external"],
      inv_txn_status: ["draft", "posted", "cancelled"],
      inv_txn_type: ["in", "out", "transfer", "return"],
      item_approval_status: ["draft", "pending", "approved", "rejected"],
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
      stock_count_status: [
        "draft",
        "in_progress",
        "submitted",
        "posted",
        "cancelled",
      ],
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
