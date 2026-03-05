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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          name: string | null
          password_hash: string
          phone: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          password_hash: string
          phone: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          password_hash?: string
          phone?: string
          role?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          allowed_models: string[] | null
          created_at: string
          creator_phone: string
          enterprise_id: string
          expires_at: string | null
          group_name: string | null
          id: string
          ip_whitelist: string[] | null
          key_value: string
          name: string
          organization_id: string | null
          status: string
          total_quota: number | null
          updated_at: string
          used_quota: number
        }
        Insert: {
          allowed_models?: string[] | null
          created_at?: string
          creator_phone: string
          enterprise_id: string
          expires_at?: string | null
          group_name?: string | null
          id?: string
          ip_whitelist?: string[] | null
          key_value?: string
          name: string
          organization_id?: string | null
          status?: string
          total_quota?: number | null
          updated_at?: string
          used_quota?: number
        }
        Update: {
          allowed_models?: string[] | null
          created_at?: string
          creator_phone?: string
          enterprise_id?: string
          expires_at?: string | null
          group_name?: string | null
          id?: string
          ip_whitelist?: string[] | null
          key_value?: string
          name?: string
          organization_id?: string | null
          status?: string
          total_quota?: number | null
          updated_at?: string
          used_quota?: number
        }
        Relationships: []
      }
      balance_records: {
        Row: {
          amount: number
          created_at: string
          enterprise_id: string
          id: string
          operator: string | null
          remark: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          enterprise_id: string
          id?: string
          operator?: string | null
          remark?: string | null
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          enterprise_id?: string
          id?: string
          operator?: string | null
          remark?: string | null
          type?: string
        }
        Relationships: []
      }
      enterprise_balances: {
        Row: {
          alert_email: string | null
          alert_method: string
          alert_threshold: number | null
          balance: number
          created_at: string
          enterprise_id: string
          id: string
          request_count: number
          total_consumed: number
          updated_at: string
        }
        Insert: {
          alert_email?: string | null
          alert_method?: string
          alert_threshold?: number | null
          balance?: number
          created_at?: string
          enterprise_id: string
          id?: string
          request_count?: number
          total_consumed?: number
          updated_at?: string
        }
        Update: {
          alert_email?: string | null
          alert_method?: string
          alert_threshold?: number | null
          balance?: number
          created_at?: string
          enterprise_id?: string
          id?: string
          request_count?: number
          total_consumed?: number
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_certifications: {
        Row: {
          business_license_url: string | null
          company_name: string | null
          created_at: string
          credit_code: string | null
          enterprise_id: string
          id: string
          legal_person: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          business_license_url?: string | null
          company_name?: string | null
          created_at?: string
          credit_code?: string | null
          enterprise_id: string
          id?: string
          legal_person?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          business_license_url?: string | null
          company_name?: string | null
          created_at?: string
          credit_code?: string | null
          enterprise_id?: string
          id?: string
          legal_person?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_certifications_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: true
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprises: {
        Row: {
          created_at: string
          enterprise_code: string
          id: string
          name: string
          owner_phone: string
        }
        Insert: {
          created_at?: string
          enterprise_code?: string
          id?: string
          name: string
          owner_phone: string
        }
        Update: {
          created_at?: string
          enterprise_code?: string
          id?: string
          name?: string
          owner_phone?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          enterprise_id: string
          expires_at: string
          id: string
          invite_code: string
          invited_role: string
          invitee_phone: string | null
          inviter_phone: string
          max_uses: number
          organization_id: string | null
          status: string
          use_count: number
        }
        Insert: {
          created_at?: string
          enterprise_id: string
          expires_at?: string
          id?: string
          invite_code?: string
          invited_role?: string
          invitee_phone?: string | null
          inviter_phone: string
          max_uses?: number
          organization_id?: string | null
          status?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          enterprise_id?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invited_role?: string
          invitee_phone?: string | null
          inviter_phone?: string
          max_uses?: number
          organization_id?: string | null
          status?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          daily_limit: number | null
          enterprise_id: string
          id: string
          organization_id: string | null
          role: string
          status: string
          user_phone: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          enterprise_id: string
          id?: string
          organization_id?: string | null
          role?: string
          status?: string
          user_phone: string
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          enterprise_id?: string
          id?: string
          organization_id?: string | null
          role?: string
          status?: string
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_phone: string | null
          created_at: string
          current_month_budget: number | null
          enterprise_id: string
          id: string
          monthly_budget: number | null
          name: string
          status: string
        }
        Insert: {
          admin_phone?: string | null
          created_at?: string
          current_month_budget?: number | null
          enterprise_id: string
          id?: string
          monthly_budget?: number | null
          name: string
          status?: string
        }
        Update: {
          admin_phone?: string | null
          created_at?: string
          current_month_budget?: number | null
          enterprise_id?: string
          id?: string
          monthly_budget?: number | null
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      redeem_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          id: string
          status: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_redeem_code: {
        Args: { p_amount: number; p_code: string }
        Returns: {
          amount: number
          code: string
          created_at: string
          id: string
          status: string
          used_at: string | null
          used_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "redeem_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_recharge_enterprise: {
        Args: {
          p_amount: number
          p_enterprise_id: string
          p_operator: string
          p_remark?: string
        }
        Returns: undefined
      }
      admin_review_certification: {
        Args: { p_enterprise_id: string; p_status: string }
        Returns: undefined
      }
      create_api_key: {
        Args: {
          p_allowed_models?: string[]
          p_enterprise_id: string
          p_expires_at?: string
          p_group_name?: string
          p_ip_whitelist?: string[]
          p_name: string
          p_organization_id?: string
          p_phone: string
          p_total_quota?: number
        }
        Returns: {
          allowed_models: string[] | null
          created_at: string
          creator_phone: string
          enterprise_id: string
          expires_at: string | null
          group_name: string | null
          id: string
          ip_whitelist: string[] | null
          key_value: string
          name: string
          organization_id: string | null
          status: string
          total_quota: number | null
          updated_at: string
          used_quota: number
        }
        SetofOptions: {
          from: "*"
          to: "api_keys"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_api_key: {
        Args: { p_id: string; p_phone: string }
        Returns: undefined
      }
      set_current_phone: { Args: { phone: string }; Returns: undefined }
      toggle_api_key_status: {
        Args: { p_id: string; p_phone: string; p_status: string }
        Returns: undefined
      }
      update_api_key: {
        Args: {
          p_allowed_models?: string[]
          p_expires_at?: string
          p_group_name?: string
          p_id: string
          p_ip_whitelist?: string[]
          p_name: string
          p_phone: string
          p_total_quota?: number
        }
        Returns: {
          allowed_models: string[] | null
          created_at: string
          creator_phone: string
          enterprise_id: string
          expires_at: string | null
          group_name: string | null
          id: string
          ip_whitelist: string[] | null
          key_value: string
          name: string
          organization_id: string | null
          status: string
          total_quota: number | null
          updated_at: string
          used_quota: number
        }
        SetofOptions: {
          from: "*"
          to: "api_keys"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_admin_login: {
        Args: { p_password_hash: string; p_phone: string }
        Returns: {
          id: string
          name: string
          phone: string
          role: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
