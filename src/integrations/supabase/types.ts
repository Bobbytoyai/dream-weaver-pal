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
      bobby_codes: {
        Row: {
          child_age: number | null
          child_name: string | null
          claimed_at: string | null
          code: string
          created_at: string
          id: string
          session_data: Json | null
        }
        Insert: {
          child_age?: number | null
          child_name?: string | null
          claimed_at?: string | null
          code: string
          created_at?: string
          id?: string
          session_data?: Json | null
        }
        Update: {
          child_age?: number | null
          child_name?: string | null
          claimed_at?: string | null
          code?: string
          created_at?: string
          id?: string
          session_data?: Json | null
        }
        Relationships: []
      }
      child_memories: {
        Row: {
          behavior_patterns: Json
          child_name: string
          created_at: string
          emotional_history: Json
          engagement_triggers: string[]
          favorite_themes: string[]
          id: string
          interaction_count: number
          interaction_style: string
          last_emotions: string[]
          last_story_id: string | null
          learning_speed: string
          preferences: Json
          preferred_topics: Json
          privacy_mode: boolean | null
          progression_level: number
          relationship_score: number
          session_patterns: Json
          total_stories_heard: number
          updated_at: string
          user_id: string
        }
        Insert: {
          behavior_patterns?: Json
          child_name: string
          created_at?: string
          emotional_history?: Json
          engagement_triggers?: string[]
          favorite_themes?: string[]
          id?: string
          interaction_count?: number
          interaction_style?: string
          last_emotions?: string[]
          last_story_id?: string | null
          learning_speed?: string
          preferences?: Json
          preferred_topics?: Json
          privacy_mode?: boolean | null
          progression_level?: number
          relationship_score?: number
          session_patterns?: Json
          total_stories_heard?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          behavior_patterns?: Json
          child_name?: string
          created_at?: string
          emotional_history?: Json
          engagement_triggers?: string[]
          favorite_themes?: string[]
          id?: string
          interaction_count?: number
          interaction_style?: string
          last_emotions?: string[]
          last_story_id?: string | null
          learning_speed?: string
          preferences?: Json
          preferred_topics?: Json
          privacy_mode?: boolean | null
          progression_level?: number
          relationship_score?: number
          session_patterns?: Json
          total_stories_heard?: number
          updated_at?: string
          user_id?: string
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
          is_favorite: boolean
          message_count: number
          parent_note: string | null
          started_at: string
          tags: string[] | null
          topics: string[] | null
          user_id: string
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
          is_favorite?: boolean
          message_count?: number
          parent_note?: string | null
          started_at?: string
          tags?: string[] | null
          topics?: string[] | null
          user_id: string
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
          is_favorite?: boolean
          message_count?: number
          parent_note?: string | null
          started_at?: string
          tags?: string[] | null
          topics?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      cloud_profiles: {
        Row: {
          child_memory_snapshot: Json
          child_name: string
          created_at: string
          device_info: string | null
          id: string
          last_synced_at: string
          parent_settings: Json
          sync_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          child_memory_snapshot?: Json
          child_name: string
          created_at?: string
          device_info?: string | null
          id?: string
          last_synced_at?: string
          parent_settings?: Json
          sync_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          child_memory_snapshot?: Json
          child_name?: string
          created_at?: string
          device_info?: string | null
          id?: string
          last_synced_at?: string
          parent_settings?: Json
          sync_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_data: {
        Row: {
          age_max: number
          age_min: number
          answer: string
          body: string
          content_id: string
          created_at: string
          data_type: string
          emotion: string
          id: string
          keywords: string[]
          metadata: Json
          priority: number
          question: string
          sort_order: number
          title: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          answer?: string
          body?: string
          content_id: string
          created_at?: string
          data_type?: string
          emotion?: string
          id?: string
          keywords?: string[]
          metadata?: Json
          priority?: number
          question?: string
          sort_order?: number
          title?: string
        }
        Update: {
          age_max?: number
          age_min?: number
          answer?: string
          body?: string
          content_id?: string
          created_at?: string
          data_type?: string
          emotion?: string
          id?: string
          keywords?: string[]
          metadata?: Json
          priority?: number
          question?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_data_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "store_content"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string
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
          user_id: string
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
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "child_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      installed_content: {
        Row: {
          child_name: string
          content_id: string
          id: string
          installed_at: string
          is_enabled: boolean
          user_id: string | null
        }
        Insert: {
          child_name: string
          content_id: string
          id?: string
          installed_at?: string
          is_enabled?: boolean
          user_id?: string | null
        }
        Update: {
          child_name?: string
          content_id?: string
          id?: string
          installed_at?: string
          is_enabled?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installed_content_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "store_content"
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
          source_content_id: string | null
          updated_at: string
          usage_count: number
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
          source_content_id?: string | null
          updated_at?: string
          usage_count?: number
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
          source_content_id?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_source_content_id_fkey"
            columns: ["source_content_id"]
            isOneToOne: false
            referencedRelation: "store_content"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_alerts: {
        Row: {
          alert_type: string
          child_name: string
          context: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          session_id: string
          severity: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          child_name: string
          context?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          session_id: string
          severity?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          child_name?: string
          context?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          session_id?: string
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "child_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          detected_emotion: string | null
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          detected_emotion?: string | null
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          detected_emotion?: string | null
          id?: string
          role?: string
          session_id?: string
          user_id?: string
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
      store_content: {
        Row: {
          age_max: number
          age_min: number
          category: string
          changelog: string
          content_count: number
          content_items: Json
          cover_image_url: string | null
          created_at: string
          creator_name: string
          creator_role: string
          description: string
          detailed_description: string
          difficulty_level: string
          duration_estimate: string
          emoji: string
          id: string
          install_count: number
          is_active: boolean
          is_featured: boolean
          is_new: boolean
          is_popular: boolean
          is_premium: boolean
          languages: string[]
          last_updated_at: string
          learning_objectives: string[]
          name: string
          rating: number
          rating_count: number
          screenshots: string[]
          size_label: string
          skills_developed: string[]
          slug: string
          tags: string[]
          updated_at: string
          version: number
          version_label: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          category?: string
          changelog?: string
          content_count?: number
          content_items?: Json
          cover_image_url?: string | null
          created_at?: string
          creator_name?: string
          creator_role?: string
          description?: string
          detailed_description?: string
          difficulty_level?: string
          duration_estimate?: string
          emoji?: string
          id?: string
          install_count?: number
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_popular?: boolean
          is_premium?: boolean
          languages?: string[]
          last_updated_at?: string
          learning_objectives?: string[]
          name: string
          rating?: number
          rating_count?: number
          screenshots?: string[]
          size_label?: string
          skills_developed?: string[]
          slug: string
          tags?: string[]
          updated_at?: string
          version?: number
          version_label?: string
        }
        Update: {
          age_max?: number
          age_min?: number
          category?: string
          changelog?: string
          content_count?: number
          content_items?: Json
          cover_image_url?: string | null
          created_at?: string
          creator_name?: string
          creator_role?: string
          description?: string
          detailed_description?: string
          difficulty_level?: string
          duration_estimate?: string
          emoji?: string
          id?: string
          install_count?: number
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_popular?: boolean
          is_premium?: boolean
          languages?: string[]
          last_updated_at?: string
          learning_objectives?: string[]
          name?: string
          rating?: number
          rating_count?: number
          screenshots?: string[]
          size_label?: string
          skills_developed?: string[]
          slug?: string
          tags?: string[]
          updated_at?: string
          version?: number
          version_label?: string
        }
        Relationships: []
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
      increment_kb_usage: { Args: { entry_id: string }; Returns: undefined }
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
