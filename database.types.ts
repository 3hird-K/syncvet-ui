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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      animal_control_cases: {
        Row: {
          animal_description: string
          barangay: string
          breed_estimate: string | null
          capture_time: string | null
          case_id: string
          color: string | null
          created_at: string
          date_captured: string
          estimated_age: string | null
          gender: string | null
          holding_days_elapsed: number
          id: string
          impounding_facility: string | null
          intake_officer: string
          max_holding_days: number
          owner_claimant: Json | null
          reason: string
          species: string
          specific_location: string | null
          status: string
          timeline: Json
          updated_at: string
        }
        Insert: {
          animal_description: string
          barangay: string
          breed_estimate?: string | null
          capture_time?: string | null
          case_id: string
          color?: string | null
          created_at?: string
          date_captured?: string
          estimated_age?: string | null
          gender?: string | null
          holding_days_elapsed?: number
          id?: string
          impounding_facility?: string | null
          intake_officer: string
          max_holding_days?: number
          owner_claimant?: Json | null
          reason: string
          species?: string
          specific_location?: string | null
          status?: string
          timeline?: Json
          updated_at?: string
        }
        Update: {
          animal_description?: string
          barangay?: string
          breed_estimate?: string | null
          capture_time?: string | null
          case_id?: string
          color?: string | null
          created_at?: string
          date_captured?: string
          estimated_age?: string | null
          gender?: string | null
          holding_days_elapsed?: number
          id?: string
          impounding_facility?: string | null
          intake_officer?: string
          max_holding_days?: number
          owner_claimant?: Json | null
          reason?: string
          species?: string
          specific_location?: string | null
          status?: string
          timeline?: Json
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: string
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          is_pinned: boolean
          priority: string
          target_barangay: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          author_role?: string
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          priority?: string
          target_barangay?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          priority?: string
          target_barangay?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string | null
          notes: string | null
          owner_id: string | null
          pet_id: string | null
          pet_name: string | null
          service_id: string
          status: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string | null
          pet_id?: string | null
          pet_name?: string | null
          service_id: string
          status?: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string | null
          pet_id?: string | null
          pet_name?: string | null
          service_id?: string
          status?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity: string
          id: string
          record_id: string
          role: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity: string
          id?: string
          record_id: string
          role: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity?: string
          id?: string
          record_id?: string
          role?: string
          user_name?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          chat_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          sender_id: string | null
          sender_name: string | null
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          sender_id?: string | null
          sender_name?: string | null
          sender_role: string
        }
        Update: {
          attachment_url?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          assigned_vet_name: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          owner_id: string | null
          pet_id: string | null
          pet_name: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_vet_name?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          owner_id?: string | null
          pet_id?: string | null
          pet_name?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_vet_name?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          owner_id?: string | null
          pet_id?: string | null
          pet_name?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          breed: string | null
          chief_complaint: string
          created_at: string
          date: string
          diagnosis: string
          dosage_instructions: string | null
          encounter_no: string
          follow_up_date: string | null
          heart_rate_bpm: number | null
          id: string
          medication: string | null
          mucous_membrane: string | null
          owner_barangay: string | null
          owner_contact: string | null
          owner_id: string | null
          owner_name: string | null
          pet_id: string | null
          pet_name: string | null
          service_type: string
          species: string
          status: string
          symptoms: string[] | null
          temperature_c: number | null
          time: string
          treatment: string
          updated_at: string
          vet_name: string
          veterinarian_notes: string | null
          weight_kg: number | null
        }
        Insert: {
          breed?: string | null
          chief_complaint: string
          created_at?: string
          date?: string
          diagnosis: string
          dosage_instructions?: string | null
          encounter_no: string
          follow_up_date?: string | null
          heart_rate_bpm?: number | null
          id?: string
          medication?: string | null
          mucous_membrane?: string | null
          owner_barangay?: string | null
          owner_contact?: string | null
          owner_id?: string | null
          owner_name?: string | null
          pet_id?: string | null
          pet_name?: string | null
          service_type?: string
          species: string
          status?: string
          symptoms?: string[] | null
          temperature_c?: number | null
          time?: string
          treatment: string
          updated_at?: string
          vet_name: string
          veterinarian_notes?: string | null
          weight_kg?: number | null
        }
        Update: {
          breed?: string | null
          chief_complaint?: string
          created_at?: string
          date?: string
          diagnosis?: string
          dosage_instructions?: string | null
          encounter_no?: string
          follow_up_date?: string | null
          heart_rate_bpm?: number | null
          id?: string
          medication?: string | null
          mucous_membrane?: string | null
          owner_barangay?: string | null
          owner_contact?: string | null
          owner_id?: string | null
          owner_name?: string | null
          pet_id?: string | null
          pet_name?: string | null
          service_type?: string
          species?: string
          status?: string
          symptoms?: string[] | null
          temperature_c?: number | null
          time?: string
          treatment?: string
          updated_at?: string
          vet_name?: string
          veterinarian_notes?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      field_operations: {
        Row: {
          barangay: string
          created_at: string
          id: string
          lead: string
          notes: string | null
          op_id: string
          operation_type: string
          scheduled_date: string
          status: string
          target_pets: number
          updated_at: string
          vaccinated_pets: number
        }
        Insert: {
          barangay: string
          created_at?: string
          id?: string
          lead: string
          notes?: string | null
          op_id: string
          operation_type: string
          scheduled_date?: string
          status?: string
          target_pets?: number
          updated_at?: string
          vaccinated_pets?: number
        }
        Update: {
          barangay?: string
          created_at?: string
          id?: string
          lead?: string
          notes?: string | null
          op_id?: string
          operation_type?: string
          scheduled_date?: string
          status?: string
          target_pets?: number
          updated_at?: string
          vaccinated_pets?: number
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          batch_number: string
          category: string
          created_at: string
          expiration_date: string
          fefo_priority: number
          id: string
          manufacturer: string | null
          minimum_stock: number
          name: string
          status: string
          stock: number
          storage_location: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          category: string
          created_at?: string
          expiration_date: string
          fefo_priority?: number
          id?: string
          manufacturer?: string | null
          minimum_stock?: number
          name: string
          status?: string
          stock?: number
          storage_location?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          category?: string
          created_at?: string
          expiration_date?: string
          fefo_priority?: number
          id?: string
          manufacturer?: string | null
          minimum_stock?: number
          name?: string
          status?: string
          stock?: number
          storage_location?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          avatar_id: string | null
          birth_year: number | null
          breed: string | null
          created_at: string
          gender: string | null
          id: string
          is_spayed_neutered: boolean | null
          is_vaccinated: boolean | null
          last_vaccination_date: string | null
          microchip_number: string | null
          name: string
          next_vaccination_date: string | null
          notes: string | null
          owner_id: string
          photo_url: string | null
          rabies_vaccinated: boolean | null
          species: string
          updated_at: string
          vaccination_doses: number | null
          weight_category: string | null
        }
        Insert: {
          avatar_id?: string | null
          birth_year?: number | null
          breed?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          is_spayed_neutered?: boolean | null
          is_vaccinated?: boolean | null
          last_vaccination_date?: string | null
          microchip_number?: string | null
          name: string
          next_vaccination_date?: string | null
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          rabies_vaccinated?: boolean | null
          species?: string
          updated_at?: string
          vaccination_doses?: number | null
          weight_category?: string | null
        }
        Update: {
          avatar_id?: string | null
          birth_year?: number | null
          breed?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          is_spayed_neutered?: boolean | null
          is_vaccinated?: boolean | null
          last_vaccination_date?: string | null
          microchip_number?: string | null
          name?: string
          next_vaccination_date?: string | null
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          rabies_vaccinated?: boolean | null
          species?: string
          updated_at?: string
          vaccination_doses?: number | null
          weight_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_transactions: {
        Row: {
          created_at: string
          date: string
          detail: string | null
          id: string
          owner_id: string
          pet_id: string | null
          reference_id: string | null
          status: string
          title: string
          transaction_no: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          date?: string
          detail?: string | null
          id?: string
          owner_id: string
          pet_id?: string | null
          reference_id?: string | null
          status?: string
          title: string
          transaction_no: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          date?: string
          detail?: string | null
          id?: string
          owner_id?: string
          pet_id?: string | null
          reference_id?: string | null
          status?: string
          title?: string
          transaction_no?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_transactions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_transactions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          profile_completed: boolean | null
          raw_user_meta_data: Json | null
          role: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          raw_user_meta_data?: Json | null
          role?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          raw_user_meta_data?: Json | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      vaccination_records: {
        Row: {
          administered_date: string
          barangay: string | null
          batch_number: string | null
          breed: string | null
          created_at: string
          id: string
          next_due_date: string | null
          owner_contact: string | null
          owner_id: string | null
          owner_name: string | null
          pet_id: string | null
          pet_name: string | null
          record_no: string
          species: string
          status: string
          updated_at: string
          vaccine_name: string
          veterinarian: string
        }
        Insert: {
          administered_date?: string
          barangay?: string | null
          batch_number?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          next_due_date?: string | null
          owner_contact?: string | null
          owner_id?: string | null
          owner_name?: string | null
          pet_id?: string | null
          pet_name?: string | null
          record_no: string
          species?: string
          status?: string
          updated_at?: string
          vaccine_name: string
          veterinarian: string
        }
        Update: {
          administered_date?: string
          barangay?: string | null
          batch_number?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          next_due_date?: string | null
          owner_contact?: string | null
          owner_id?: string | null
          owner_name?: string | null
          pet_id?: string | null
          pet_name?: string | null
          record_no?: string
          species?: string
          status?: string
          updated_at?: string
          vaccine_name?: string
          veterinarian?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sync_clerk_user_data: {
        Args: {
          p_avatar_url?: string
          p_email: string
          p_first_name?: string
          p_full_name?: string
          p_last_name?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: Json
      }
      sync_user_profile: {
        Args: {
          user_avatar_url?: string
          user_email: string
          user_first_name?: string
          user_full_name?: string
          user_id: string
          user_last_name?: string
        }
        Returns: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          profile_completed: boolean | null
          raw_user_meta_data: Json | null
          role: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
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
    Enums: {},
  },
} as const
