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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advances: {
        Row: {
          amount: number
          application_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          payment_date: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["advance_status"]
        }
        Insert: {
          amount: number
          application_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["advance_status"]
        }
        Update: {
          amount?: number
          application_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["advance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "advances_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          application_id: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          application_id?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_id: string
          approval_notes: string | null
          approved_amount: number | null
          archive_number: string | null
          budget_id: string | null
          conference_location: string
          conference_name: string
          conference_url: string | null
          created_at: string
          id: string
          paper_title: string | null
          purpose: string
          rejection_reason: string | null
          report_deadline: string | null
          requested_amount: number
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          travel_end_date: string
          travel_start_date: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          approval_notes?: string | null
          approved_amount?: number | null
          archive_number?: string | null
          budget_id?: string | null
          conference_location: string
          conference_name: string
          conference_url?: string | null
          created_at?: string
          id?: string
          paper_title?: string | null
          purpose: string
          rejection_reason?: string | null
          report_deadline?: string | null
          requested_amount: number
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          travel_end_date: string
          travel_start_date: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          approval_notes?: string | null
          approved_amount?: number | null
          archive_number?: string | null
          budget_id?: string | null
          conference_location?: string
          conference_name?: string
          conference_url?: string | null
          created_at?: string
          id?: string
          paper_title?: string | null
          purpose?: string
          rejection_reason?: string | null
          report_deadline?: string | null
          requested_amount?: number
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          travel_end_date?: string
          travel_start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          application_id: string
          approved_amount: number | null
          approver_id: string
          approver_role: Database["public"]["Enums"]["user_role"]
          created_at: string
          decision: Database["public"]["Enums"]["approval_decision"]
          id: string
          notes: string
          signature_payload: Json | null
          signed_at: string | null
        }
        Insert: {
          application_id: string
          approved_amount?: number | null
          approver_id: string
          approver_role: Database["public"]["Enums"]["user_role"]
          created_at?: string
          decision: Database["public"]["Enums"]["approval_decision"]
          id?: string
          notes?: string
          signature_payload?: Json | null
          signed_at?: string | null
        }
        Update: {
          application_id?: string
          approved_amount?: number | null
          approver_id?: string
          approver_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          notes?: string
          signature_payload?: Json | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number
          created_at: string
          department: string | null
          id: string
          total_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          allocated_amount?: number
          created_at?: string
          department?: string | null
          id?: string
          total_amount?: number
          updated_at?: string
          year: number
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          department?: string | null
          id?: string
          total_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      expense_reports: {
        Row: {
          applicant_id: string
          application_id: string
          created_at: string
          id: string
          notes: string | null
          proof_of_attendance_path: string | null
          status: string
          submitted_at: string
          total_claimed: number
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_id: string
          created_at?: string
          id?: string
          notes?: string | null
          proof_of_attendance_path?: string | null
          status?: string
          submitted_at?: string
          total_claimed?: number
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          proof_of_attendance_path?: string | null
          status?: string
          submitted_at?: string
          total_claimed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_reports_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string | null
          body: string
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          id: string
          is_read: boolean
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          application_id?: string | null
          body: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          application_id?: string | null
          body?: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string
          email: string
          first_name: string
          id: string
          iknow_id: string | null
          is_active: boolean
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string
          email: string
          first_name?: string
          id: string
          iknow_id?: string | null
          is_active?: boolean
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          first_name?: string
          id?: string
          iknow_id?: string | null
          is_active?: boolean
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["expense_category"]
          content_hash: string | null
          currency: string
          expense_date: string | null
          expense_report_id: string
          file_name: string
          id: string
          is_duplicate_suspect: boolean
          is_manually_verified: boolean
          ocr_confidence: number | null
          ocr_raw: Json | null
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          amount?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          content_hash?: string | null
          currency?: string
          expense_date?: string | null
          expense_report_id: string
          file_name: string
          id?: string
          is_duplicate_suspect?: boolean
          is_manually_verified?: boolean
          ocr_confidence?: number | null
          ocr_raw?: Json | null
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          content_hash?: string | null
          currency?: string
          expense_date?: string | null
          expense_report_id?: string
          file_name?: string
          id?: string
          is_duplicate_suspect?: boolean
          is_manually_verified?: boolean
          ocr_confidence?: number | null
          ocr_raw?: Json | null
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          advance_amount: number
          application_id: string
          claimed_amount: number
          created_at: string
          difference: number | null
          direction: Database["public"]["Enums"]["settlement_direction"]
          id: string
          payment_reference: string | null
          processed_at: string | null
          processed_by: string | null
          return_proof_path: string | null
          status: Database["public"]["Enums"]["settlement_status"]
        }
        Insert: {
          advance_amount: number
          application_id: string
          claimed_amount: number
          created_at?: string
          difference?: number | null
          direction: Database["public"]["Enums"]["settlement_direction"]
          id?: string
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          return_proof_path?: string | null
          status?: Database["public"]["Enums"]["settlement_status"]
        }
        Update: {
          advance_amount?: number
          application_id?: string
          claimed_amount?: number
          created_at?: string
          difference?: number | null
          direction?: Database["public"]["Enums"]["settlement_direction"]
          id?: string
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          return_proof_path?: string | null
          status?: Database["public"]["Enums"]["settlement_status"]
        }
        Relationships: [
          {
            foreignKeyName: "settlements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_processed_by_fkey"
            columns: ["processed_by"]
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
      [_ in never]: never
    }
    Enums: {
      advance_status: "pending" | "issued" | "paid"
      application_status:
        | "draft"
        | "submitted"
        | "under_review_council"
        | "under_review_deanery"
        | "approved"
        | "partially_approved"
        | "rejected"
        | "for_payment"
        | "paid"
        | "report_submitted"
        | "in_settlement"
        | "closed"
      approval_decision: "approved" | "partially_approved" | "rejected"
      document_type:
        | "invitation_letter"
        | "paper_abstract"
        | "conference_program"
        | "cv"
        | "travel_plan"
        | "proof_of_attendance"
        | "other"
      expense_category:
        | "accommodation"
        | "transport"
        | "registration_fee"
        | "meals"
        | "other"
      notification_type:
        | "status_change"
        | "deadline_reminder"
        | "approval_required"
        | "payment_confirmed"
        | "settlement_complete"
        | "duplicate_detected"
      settlement_direction:
        | "refund_to_applicant"
        | "return_to_finki"
        | "balanced"
      settlement_status: "pending" | "awaiting_proof" | "completed"
      user_role:
        | "applicant"
        | "scientific_council"
        | "deanery"
        | "accounting"
        | "hr"
        | "archive"
        | "it_admin"
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

// Convenience aliases for the enum types
export type UserRole = Database["public"]["Enums"]["user_role"]
export type ApplicationStatus = Database["public"]["Enums"]["application_status"]
export type ApprovalDecision = Database["public"]["Enums"]["approval_decision"]
export type AdvanceStatus = Database["public"]["Enums"]["advance_status"]
export type SettlementDirection = Database["public"]["Enums"]["settlement_direction"]
export type SettlementStatus = Database["public"]["Enums"]["settlement_status"]
export type NotificationType = Database["public"]["Enums"]["notification_type"]
export type ExpenseCategory = Database["public"]["Enums"]["expense_category"]
export type DocumentType = Database["public"]["Enums"]["document_type"]
