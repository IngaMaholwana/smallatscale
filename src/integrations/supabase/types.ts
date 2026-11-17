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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      buying_groups: {
        Row: {
          collection_method: Database["public"]["Enums"]["collection_method"]
          collection_point: string
          created_at: string
          creator_id: string
          deadline: string
          final_unit_price: number | null
          id: string
          moq: number
          name: string
          product_id: string
          status: Database["public"]["Enums"]["group_status"]
          supplier_id: string
          supplier_note: string | null
        }
        Insert: {
          collection_method?: Database["public"]["Enums"]["collection_method"]
          collection_point?: string
          created_at?: string
          creator_id: string
          deadline: string
          final_unit_price?: number | null
          id?: string
          moq: number
          name: string
          product_id: string
          status?: Database["public"]["Enums"]["group_status"]
          supplier_id: string
          supplier_note?: string | null
        }
        Update: {
          collection_method?: Database["public"]["Enums"]["collection_method"]
          collection_point?: string
          created_at?: string
          creator_id?: string
          deadline?: string
          final_unit_price?: number | null
          id?: string
          moq?: number
          name?: string
          product_id?: string
          status?: Database["public"]["Enums"]["group_status"]
          supplier_id?: string
          supplier_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buying_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          amount_due: number | null
          collected: boolean
          confirmed: boolean
          created_at: string
          group_id: string
          id: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          quantity: number
          vendor_id: string
        }
        Insert: {
          amount_due?: number | null
          collected?: boolean
          confirmed?: boolean
          created_at?: string
          group_id: string
          id?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quantity: number
          vendor_id: string
        }
        Update: {
          amount_due?: number | null
          collected?: boolean
          confirmed?: boolean
          created_at?: string
          group_id?: string
          id?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quantity?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "buying_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event_type: string
          group_id: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          group_id: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "buying_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tiers: {
        Row: {
          id: string
          min_qty: number
          product_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          min_qty: number
          product_id: string
          unit_price: number
        }
        Update: {
          id?: string
          min_qty?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          base_price: number
          collection_point: string
          created_at: string
          description: string
          id: string
          lead_time_days: number
          moq: number
          name: string
          stock_available: number
          supplier_id: string
          unit: string
        }
        Insert: {
          active?: boolean
          base_price: number
          collection_point?: string
          created_at?: string
          description?: string
          id?: string
          lead_time_days?: number
          moq: number
          name: string
          stock_available?: number
          supplier_id: string
          unit?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          collection_point?: string
          created_at?: string
          description?: string
          id?: string
          lead_time_days?: number
          moq?: number
          name?: string
          stock_available?: number
          supplier_id?: string
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          location: string | null
          phone: string | null
        }
        Insert: {
          business_name?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          location?: string | null
          phone?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      supplier_verifications: {
        Row: {
          note: string | null
          status: Database["public"]["Enums"]["verification_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _check_ready: { Args: { _group: string }; Returns: undefined }
      _log: {
        Args: { _details?: Json; _group: string; _type: string }
        Returns: undefined
      }
      _notify_group: {
        Args: {
          _body: string
          _group: string
          _include_supplier?: boolean
          _title: string
        }
        Returns: undefined
      }
      _recompute_group: { Args: { _group: string }; Returns: undefined }
      admin_exists: { Args: never; Returns: boolean }
      admin_set_verification: {
        Args: {
          _note?: string
          _status: Database["public"]["Enums"]["verification_status"]
          _supplier: string
        }
        Returns: undefined
      }
      claim_first_admin: { Args: never; Returns: boolean }
      confirm_collection: { Args: { _group: string }; Returns: undefined }
      create_group: {
        Args: {
          _collection_method: Database["public"]["Enums"]["collection_method"]
          _collection_point: string
          _deadline: string
          _name: string
          _product_id: string
          _quantity: number
        }
        Returns: string
      }
      group_total: { Args: { _group: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_verified_supplier: { Args: { _uid: string }; Returns: boolean }
      join_group: {
        Args: { _group: string; _quantity: number }
        Returns: undefined
      }
      leave_group: { Args: { _group: string }; Returns: undefined }
      member_confirm: { Args: { _group: string }; Returns: undefined }
      member_pay: { Args: { _group: string }; Returns: undefined }
      supplier_decide: {
        Args: { _accept: boolean; _group: string; _note?: string }
        Returns: undefined
      }
      supplier_fulfil: { Args: { _group: string }; Returns: undefined }
      unit_price_for: {
        Args: { _product_id: string; _qty: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "supplier"
      collection_method: "supplier" | "shared_point"
      group_status:
        | "open"
        | "moq_reached"
        | "supplier_confirmed"
        | "supplier_rejected"
        | "ready"
        | "fulfilled"
        | "completed"
        | "cancelled"
      payment_status: "unpaid" | "paid" | "refunded"
      verification_status: "pending" | "verified" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "vendor", "supplier"],
      collection_method: ["supplier", "shared_point"],
      group_status: [
        "open",
        "moq_reached",
        "supplier_confirmed",
        "supplier_rejected",
        "ready",
        "fulfilled",
        "completed",
        "cancelled",
      ],
      payment_status: ["unpaid", "paid", "refunded"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
