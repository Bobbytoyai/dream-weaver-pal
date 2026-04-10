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
      child_memories: {
        Row: {
          child_name: string
          created_at: string
          favorite_themes: string[]
          id: string
          last_story_id: string | null
          preferences: Json
          privacy_mode: boolean | null
          total_stories_heard: number
          updated_at: string
        }
        Insert: {
          child_name: string
          created_at?: string
          favorite_themes?: string[]
          id?: string
          last_story_id?: string | null
          preferences?: Json
          privacy_mode?: boolean | null
          total_stories_heard?: number
          updated_at?: string
        }
        Update: {
          child_name?: string
          created_at?: string
          favorite_themes?: string[]
          id?: string
          last_story_id?: string | null
          preferences?: Json
          privacy_mode?: boolean | null
          total_stories_heard?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_memories_last_story_id_fkey"
            columns: ["last_story_id"]
            isOneToOne: false
            referencedRelation: "story_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      child_sessions: {
        Row: {
          ai_summary: string | null
          child_age: number
          child_name: string
          created_at: string
          detected_emotions: string[] | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          message_count: number
          started_at: string
          tags: string[] | null
          topics: string[] | null
        }
        Insert: {
          ai_summary?: string | null
          child_age: number
          child_name: string
          created_at?: string
          detected_emotions?: string[] | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          message_count?: number
          started_at?: string
          tags?: string[] | null
          topics?: string[] | null
        }
        Update: {
          ai_summary?: string | null
          child_age?: number
          child_name?: string
          created_at?: string
          detected_emotions?: string[] | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          message_count?: number
          started_at?: string
          tags?: string[] | null
          topics?: string[] | null
        }
        Relationships: []
      }
      conversation_analyses: {
        Row: {
          alerts: Json
          attention_span: string | null
          audio_path: string | null
          behavior_insights: string[]
          created_at: string
          curiosity_score: number | null
          emotional_stability_score: number | null
          emotions: Json
          engagement_level: string
          extracted_interests: string[] | null
          full_transcription: string | null
          id: string
          interaction_frequency: string | null
          mood_score: string | null
          session_id: string
          sociability_score: number | null
          summary: string | null
          topics_detected: string[]
        }
        Insert: {
          alerts?: Json
          attention_span?: string | null
          audio_path?: string | null
          behavior_insights?: string[]
          created_at?: string
          curiosity_score?: number | null
          emotional_stability_score?: number | null
          emotions?: Json
          engagement_level?: string
          extracted_interests?: string[] | null
          full_transcription?: string | null
          id?: string
          interaction_frequency?: string | null
          mood_score?: string | null
          session_id: string
          sociability_score?: number | null
          summary?: string | null
          topics_detected?: string[]
        }
        Update: {
          alerts?: Json
          attention_span?: string | null
          audio_path?: string | null
          behavior_insights?: string[]
          created_at?: string
          curiosity_score?: number | null
          emotional_stability_score?: number | null
          emotions?: Json
          engagement_level?: string
          extracted_interests?: string[] | null
          full_transcription?: string | null
          id?: string
          interaction_frequency?: string | null
          mood_score?: string | null
          session_id?: string
          sociability_score?: number | null
          summary?: string | null
          topics_detected?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "child_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          age_max: number
          age_min: number
          answer: string
          category: string
          created_at: string
          emotion: string
          id: string
          is_active: boolean
          keywords: string[]
          priority: number
          question: string
          updated_at: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          answer: string
          category?: string
          created_at?: string
          emotion?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          priority?: number
          question: string
          updated_at?: string
        }
        Update: {
          age_max?: number
          age_min?: number
          answer?: string
          category?: string
          created_at?: string
          emotion?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          priority?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          detected_emotion: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          detected_emotion?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          detected_emotion?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "child_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      story_templates: {
        Row: {
          age_max: number
          age_min: number
          category: string
          created_at: string
          duration: string
          full_text: string | null
          id: string
          interactive: boolean
          is_favorite: boolean
          language: string
          mood: string | null
          summary: string | null
          template_text: string
          theme: string
          title: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          category?: string
          created_at?: string
          duration?: string
          full_text?: string | null
          id?: string
          interactive?: boolean
          is_favorite?: boolean
          language?: string
          mood?: string | null
          summary?: string | null
          template_text: string
          theme: string
          title: string
        }
        Update: {
          age_max?: number
          age_min?: number
          category?: string
          created_at?: string
          duration?: string
          full_text?: string | null
          id?: string
          interactive?: boolean
          is_favorite?: boolean
          language?: string
          mood?: string | null
          summary?: string | null
          template_text?: string
          theme?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
